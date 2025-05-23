from typing import List, Optional, Union, Dict, Any
from enum import Enum

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

import json
import time
from utils_oracle import (
    clarify_question,
    get_oracle_guidelines,
    set_oracle_guidelines,
    set_oracle_report,
    post_tool_call_func,
    get_project_pdf_files,
)
from db_models import OracleGuidelines, OracleReports
from db_config import engine
from auth_utils import validate_user_request
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from functools import partial


from utils_logging import LOGGER, save_and_log, save_timing
from tools.analysis_tools import generate_report_from_question, multi_agent_report_generation

router = APIRouter(
    dependencies=[Depends(validate_user_request)],
    tags=["Oracle"],
)


class GuidelineType(Enum):
    clarification = "clarification"
    generate_questions = "generate_questions"
    generate_questions_deeper = "generate_questions_deeper"
    generate_report = "generate_report"


class SetGuidelinesRequest(BaseModel):
    guideline_type: GuidelineType
    guidelines: str
    token: str
    db_name: Optional[str] = None


@router.post("/oracle/set_guidelines")
async def set_guidelines(req: SetGuidelinesRequest):
    db_name = req.db_name
    if not db_name:
        return JSONResponse(
            status_code=400,
            content={"error": "db_name not provided"},
        )

    await set_oracle_guidelines(
        db_name=db_name,
        guideline_type=req.guideline_type.value,
        guidelines=req.guidelines,
    )

    return JSONResponse(status_code=200, content={"message": "Success"})


class GetGuidelinesRequest(BaseModel):
    guideline_type: GuidelineType
    token: Optional[str] = None
    db_name: Optional[str] = None


@router.post("/oracle/get_guidelines")
async def get_guidelines(req: GetGuidelinesRequest):
    db_name = req.db_name

    stmt = select(OracleGuidelines).where(OracleGuidelines.db_name == db_name)
    async with AsyncSession(engine) as session:
        result = await session.execute(stmt)
        result = result.scalar_one_or_none()
        if not result:
            return {"guidelines": ""}

        column_name = req.guideline_type.value + "_guidelines"
        return JSONResponse(content={"guidelines": getattr(result, column_name)})


class ClarifyQuestionRequest(BaseModel):
    db_name: str
    token: str
    user_question: str
    clarification_guidelines: Optional[str] = None

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "key_name": "my_api_key",
                    "token": "user_token",
                    "user_question": "What are the sales trends?",
                    "clarification_guidelines": "If unspecified, trends should be cover the last 3 years on a monthly basis.",
                }
            ]
        }
    }


@router.post("/oracle/clarify_question")
async def clarify_question_endpoint(req: ClarifyQuestionRequest):
    """
    Given the question provided by the user, this endpoint will return a
    list of clarifications.

    The response contains the following fields:
    - report_id: int (A new report id will be created and returned here)
    - clarifications: list[dict[str, str]] Each clarification dictionary will contain:
        - clarification: str
        - input_type: str (one of single_choice, multiple_choice, number, text)
        - options: list[str]
    """

    ts, timings = time.time(), []
    db_name = req.db_name
    ts = save_timing(ts, "validate_user", timings)
    guidelines = ""

    try:
        if req.clarification_guidelines:
            guidelines = req.clarification_guidelines
            await set_oracle_guidelines(
                db_name=db_name,
                guideline_type="clarification",
                guidelines=guidelines,
            )
        else:
            guidelines = await get_oracle_guidelines(db_name)

        clarify_response = await clarify_question(
            user_question=req.user_question,
            db_name=db_name,
            oracle_guidelines=guidelines,
        )

        LOGGER.info(f"Clarify response: {clarify_response}")

        for clarification in clarify_response["clarifications"]:
            if (
                "clarification" not in clarification
                or "input_type" not in clarification
                or "options" not in clarification
            ):
                raise ValueError(f"Invalid clarification response: {clarification}")

        # create a new report in the db
        report_id = await set_oracle_report(
            db_name=db_name,
            report_name=req.user_question,
            status="INITIALIZED",
        )
        clarify_response["report_id"] = report_id
    except Exception as e:
        LOGGER.error(f"Error getting clarifications: {e}")
        return JSONResponse(status_code=500, content=str(e).strip())
    save_and_log(ts, "get_clarifications", timings)
    return JSONResponse(content=clarify_response)


class Clarification(BaseModel):
    clarification: str
    answer: Optional[Union[str, List[str]]] = None


class GenerateReportRequest(BaseModel):
    report_id: int
    db_name: str
    token: str
    user_question: str
    clarifications: List[Clarification] = []
    use_websearch: bool = True
    use_multi_agent: bool = True  # Toggle to enable multi-agent approach

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "db_name": "db_name",
                    "token": "user_token",
                    "user_question": "User question",
                    "clarifications": [],
                    "use_websearch": True,
                    "use_multi_agent": False, 
                }
            ]
        }
    }


@router.post("/oracle/generate_report")
async def generate_report(req: GenerateReportRequest):
    """
    Given a report id, this endpoint will generate a report.

    The response contains the following fields:
    - mdx: str
    - sql_answers: list[dict[str, Any]]
    """
    db_name = req.db_name
    user_question = req.user_question
    clarifications = req.clarifications
    report_id = req.report_id

    # Check if the report exists
    async with AsyncSession(engine) as session:
        async with session.begin():
            stmt = select(OracleReports).where(
                OracleReports.db_name == db_name,
                OracleReports.report_id == report_id,
            )
            result = await session.execute(stmt)
            report = result.scalar_one_or_none()
            
            if not report:
                return JSONResponse(status_code=404, content={"error": f"Report with ID {report_id} not found"})
    
    # convert clarification responses into a single string
    clarification_responses = ""
    if clarifications:
        clarification_responses = "\nFor additional context: after the user asked this question, they provided the following clarifications:"
        for clarification in clarifications:
            clarification_responses += (
                f" {clarification.clarification} (Answer: {clarification.answer})\n"
            )

    # use partial to pass the report_id to post_tool_func, so that it can update the correct report
    post_tool_func = partial(post_tool_call_func, report_id=report_id)

    # set the clarified answers in the database
    await set_oracle_report(
        report_id=report_id,
        inputs=req.model_dump(),
        status="THINKING",
    )

    # get pdf files
    pdf_file_ids = await get_project_pdf_files(db_name)

    # generate the report
    if req.use_multi_agent:
        # Use the multi-agent approach with three specialized phases
        LOGGER.info("Using multi-agent approach for report generation")
        analysis_response = await multi_agent_report_generation(
            db_name=db_name,
            question=user_question,
            clarification_responses=clarification_responses,
            post_tool_func=post_tool_func,
            pdf_file_ids=pdf_file_ids,
            use_websearch=req.use_websearch,
        )
    else:
        # Use the original approach
        analysis_response = await generate_report_from_question(
            db_name=db_name,
            model="claude-4-sonnet-20250514",
            question=user_question,
            clarification_responses=clarification_responses,
            post_tool_func=post_tool_func,
            pdf_file_ids=pdf_file_ids,
            use_websearch=req.use_websearch,
        )
    
    main_content = analysis_response.report
    
    # clean up sql answers before saving to the database
    sql_answers = analysis_response.model_dump()["sql_answers"]
    sql_answers = [i for i in sql_answers if not i.get("error")]
    for idx, answer in enumerate(sql_answers):
        try:
            sql_answers[idx]["rows"] = json.loads(answer["rows"])
            sql_answers[idx]["columns"] = [
                {"dataIndex": col, "title": col} for col in answer["columns"]
            ]
        except Exception as e:
            LOGGER.info(str(e), flush=True)

    mdx = main_content

    had_error = main_content == "Error in generating report from question"
    status = "DONE" if not had_error else "ERRORED"

    # save to oracle_reports table
    await set_oracle_report(
        report_id=report_id,
        mdx=mdx,
        report_content_with_citations=analysis_response.report_with_citations or [],
        analyses=sql_answers,
        status=status,
    )

    return {
        "status": status,
    }
