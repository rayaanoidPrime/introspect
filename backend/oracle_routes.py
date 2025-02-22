import os
from typing import Any, Dict, List, Optional
from enum import Enum

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from utils_oracle import clarify_question, get_oracle_guidelines, set_oracle_guidelines
from db_models import OracleGuidelines
from db_config import engine
from auth_utils import validate_user, validate_user_request
from db_oracle_utils import (
    get_analysis_status,
)
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from generic_utils import get_api_key_from_key_name
from oracle.constants import TaskStage, TaskType
from pydantic import BaseModel

from utils_logging import LOGGER, save_and_log, save_timing


router = APIRouter()

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


@router.post("/oracle/set_guidelines", dependencies=[Depends(validate_user_request)])
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


@router.post("/oracle/get_guidelines", dependencies=[Depends(validate_user_request)])
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
    task_type: Optional[TaskType] = None
    answered_clarifications: List[Dict[str, Any]] = []
    clarification_guidelines: Optional[str] = None

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "key_name": "my_api_key",
                    "token": "user_token",
                    "user_question": "What are the sales trends?",
                    "task_type": None,
                    "answered_clarifications": [],
                    "clarification_guidelines": "If unspecified, trends should be cover the last 3 years on a monthly basis.",
                }
            ]
        }
    }


@router.post("/oracle/clarify_question", dependencies=[Depends(validate_user_request)])
async def clarify_question_endpoint(req: ClarifyQuestionRequest):
    """
    Given the question provided by the user, an optionally a list of answered
    clarifications, this endpoint will return a list of clarifications that still
    need to be addressed. If this is a new question, the task_type will be inferred.
    Otherwise, the task_type will be read from the request body and used to generate
    the remaining clarifications.

    The response contains the following fields:
        clarifications: list[dict[str, str]] Each clarification dictionary will contain:
            - clarification: str
            - input_type: str (one of single_choice, multiple_choice, number, text)
            - options: list[str]
        task_type: str
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
    clarify_response["task_type"] = "exploration"
    save_and_log(ts, "get_clarifications", timings)
    return JSONResponse(content=clarify_response)

@router.post("/oracle/get_analysis_status")
async def get_analysis_status_endpoint(req: AnalysisRequest):
    user = await validate_user(req.token)

    if not user:
        return JSONResponse(
            status_code=401,
            content={
                "error": "unauthorized",
                "message": "Invalid username or password",
            },
        )

    api_key = await get_api_key_from_key_name(req.key_name)

    err, status = await get_analysis_status(
        api_key=api_key,
        analysis_id=req.analysis_id,
        report_id=req.report_id,
    )

    if err:
        return JSONResponse(status_code=500, content={"error": err})

    return JSONResponse(content={"status": status})
