import traceback
from fastapi import APIRouter, Request
from agents.clarifier.clarifier_agent import get_clarification

from agents.planner_executor.planner_executor_agent import generate_single_step
from report_data_manager import ReportDataManager
import logging

logging.basicConfig(level=logging.INFO)

from generic_utils import get_api_key_from_key_name

router = APIRouter()


@router.post("/generate_step")
async def generate_step(request: Request):
    """
    Function that returns a single step of a plan.
    Takes in previous steps generated, which defaults to an empty array.
    """
    try:
        logging.info("Generating step")
        params = await request.json()
        max_retries = params.get("max_retries", 3)
        key_name = params.get("key_name")
        question = params.get("user_question")
        analysis_id = params.get("analysis_id")
        previous_steps = params.get("previous_steps", [])
        dev = params.get("dev", False)
        temp = params.get("temp", False)
        clarification_questions = params.get("clarification_questions", [])

        # if key name or question is none or blank, return error
        if not key_name or key_name == "":
            raise Exception("Invalid request. Must have API key name.")

        if not question or question == "":
            raise Exception("Invalid request. Must have a question.")

        api_key = get_api_key_from_key_name(key_name)

        if not api_key:
            raise Exception("Invalid API key name.")

        step = await generate_single_step(
            dfg_api_key=api_key,
            analysis_id=analysis_id,
            user_question=question,
            clarification_questions=clarification_questions,
        )

        return {"success": True, "steps": [step], "done": step.get("done", True)}

    except Exception as e:
        logging.error(e)
        traceback.print_exc()
        return {"success": False, "error_message": str(e) or "Incorrect request"}


@router.post("/clarify")
async def clarify(request: Request):
    """
    Function that returns clarifying questions, if any, for a given question.
    If analysis id is passed, it also stores the clarifying questions in the analysis data.
    """
    try:
        logging.info("Generating clarification questions")
        params = await request.json()
        key_name = params.get("key_name")
        question = params.get("user_question")
        analysis_id = params.get("analysis_id")

        # if key name or question is none or blank, return error
        if not key_name or key_name == "":
            raise Exception("Invalid request. Must have API key name.")

        if not question or question == "":
            raise Exception("Invalid request. Must have a question.")

        api_key = get_api_key_from_key_name(key_name)

        if not api_key:
            raise Exception("Invalid API key name.")

        dev = params.get("dev", False)
        temp = params.get("temp", False)

        clarification_questions = await get_clarification(
            question=question,
            api_key=api_key,
            dev=dev,
            temp=temp,
        )

        report_manager = ReportDataManager(
            dfg_api_key=api_key,
            user_question=question,
            report_id=analysis_id,
            dev=dev,
            temp=temp,
        )

        if report_manager.invalid:
            # it's okay if it's invalid. helps us test this endpoint/function in isolation
            # so just warn instead of throwing
            logging.warn(
                "Returned questions but report id was invalid. Check unless you're in a testing environment."
            )
        else:
            await report_manager.setup_similar_plans()
            # TODO: save the clarifying questions to the report data

        return {
            "success": True,
            "done": True,
            "clarification_questions": [
                {
                    "question": "which db",
                    "ui_tool": "text input",
                    "response": "",
                    "response_formatted": "",
                }
            ],
        }

    except Exception as e:
        logging.error(e)
        return {"success": False, "error_message": str(e) or "Incorrect request"}
