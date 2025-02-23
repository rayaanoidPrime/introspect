import os
from typing import Any, Dict, List, Optional, Union
from enum import Enum

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

import pandas as pd
import re
import time
from utils_oracle import clarify_question, get_oracle_guidelines, set_oracle_guidelines, set_analysis, set_oracle_report, replace_sql_blocks
from db_models import OracleGuidelines
from db_config import engine
from auth_utils import validate_user_request
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from utils_logging import LOGGER, save_and_log, save_timing
from tools.analysis_tools import answer_question_from_database
from defog.llm.utils import chat_async
from llm_api import O3_MINI

router = APIRouter(
    dependencies=[Depends(validate_user_request)],
    tags=["Oracle"],
)

DEFOG_BASE_URL = os.environ.get("DEFOG_BASE_URL", "https://api.defog.ai")


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
    answered_clarifications: List[Dict[str, Any]] = []
    clarification_guidelines: Optional[str] = None

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "key_name": "my_api_key",
                    "token": "user_token",
                    "user_question": "What are the sales trends?",
                    "answered_clarifications": [],
                    "clarification_guidelines": "If unspecified, trends should be cover the last 3 years on a monthly basis.",
                }
            ]
        }
    }


@router.post("/oracle/clarify_question")
async def clarify_question_endpoint(req: ClarifyQuestionRequest):
    """
    Given the question provided by the user, an optionally a list of answered
    clarifications, this endpoint will return a list of clarifications that still
    need to be addressed.

    The response contains the following fields:
        clarifications: list[dict[str, str]] Each clarification dictionary will contain:
            - clarification: str
            - input_type: str (one of single_choice, multiple_choice, number, text)
            - options: list[str]
    """
    ts, timings = time.time(), []
    db_name = req.db_name
    ts = save_timing(ts, "validate_user", timings)
    guidelines = ""

    if req.clarification_guidelines:
        guidelines = req.clarification_guidelines
        await set_oracle_guidelines(
            db_name=db_name,
            guideline_type="clarification",
            guidelines=guidelines,
        )
    else:
        LOGGER.debug("No clarification guidelines provided, retrieving from DB")
        guidelines = await get_oracle_guidelines(db_name)
        if not guidelines:
            LOGGER.warning("No clarification guidelines found in DB")
        else:
            LOGGER.debug(f"Retrieved clarification guidelines from DB: {guidelines}")

    try:
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
    except Exception as e:
        LOGGER.error(f"Error getting clarifications: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal Server Error",
                "message": "Unable to generate clarifications",
            },
        )
    save_and_log(ts, "get_clarifications", timings)
    return JSONResponse(content=clarify_response)

class Clarification(BaseModel):
    clarification: str
    answer: Optional[Union[str, List[str]]] = None
class GenerateReportRequest(BaseModel):
    db_name: str
    token: str
    user_question: str
    answered_clarifications: List[Clarification] = []

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "db_name": "db_name",
                    "token": "user_token",
                    "user_question": "User question",
                    "answered_clarifications": [],
                }
            ]
        }
    }

@router.post("/oracle/generate_report")
async def generate_report(req: GenerateReportRequest):
    db_name = req.db_name
    user_question = req.user_question
    answered_clarifications = req.answered_clarifications

    tools = [answer_question_from_database]
    analysis_response = await chat_async(
        model=O3_MINI,
        tools=tools,
        messages=[
            {
                "role": "developer",
                "content": "Formatting re-enabled\n\nWhen using tools, please use a single tool call for each question, and keep your questions short."
            },
            {
                "role": "user",
                "content": f"""{user_question}\n\n Look in the database {db_name} for your answers, and feel free to continue asking multiple questions from the database if you need to. I would rather that you ask a lot of questions than too few.

Try to aggregate data in clear and understandable buckets.

Please give your final answer as a descriptive report.

For each point that you make in the report, please include the relevant SQL query that was used to generate the data for it. You can include as many SQL queries as you want, including multiple SQL queries for one point.
"""
}],
    )

    tool_outputs = analysis_response.tool_outputs
    sql_to_analysis_id = {}
    for tool_output in tool_outputs:
        # save this analysis in the Postgres DB
        tool_id = tool_output["tool_call_id"]
        data_csv = pd.DataFrame(tool_output["result"].rows, columns=tool_output["result"].colnames).to_csv(index=False)
        analysis_question = tool_output["args"]["question"]
        mdx = f"We tried to answer the following question: `{analysis_question}`. Data to answer this question is below."

        sql = tool_output["result"].sql
        # convert the sql to lowercase, and remove all newline + multiple whitespace
        stripped_sql = re.sub(r'\s+', ' ', sql.lower())
        sql_to_analysis_id[stripped_sql] = tool_id

        await set_analysis(
            analysis_id=tool_id,
            db_name=db_name,
            sql=sql,
            csv=data_csv,
            mdx=mdx,
        )
    
    main_content = analysis_response.content

    # FIND ALL ```sql ... ``` inside the tool and replace with the corresponding analysis_id
    main_content = replace_sql_blocks(main_content, sql_to_analysis_id)
    analysis_ids = [i["tool_call_id"] for i in tool_outputs]

    # save to oracle_reports table
    await set_oracle_report(
        db_name=db_name,
        report_name=user_question,
        inputs=req.model_dump(),
        mdx=main_content,
        analysis_ids=analysis_ids,
    )

    return {
        "mdx": main_content,
        "analysis_ids": analysis_ids,
    }