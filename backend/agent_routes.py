import traceback
from fastapi import APIRouter, Request
from agents.clarifier.clarifier_agent import get_clarification

from agents.planner_executor.planner_executor_agent import (
    generate_assignment_understanding,
    generate_single_step,
    rerun_step,
)
from analysis_data_manager import AnalysisDataManager
import logging

logging.basicConfig(level=logging.INFO)

from db_utils import get_analysis_data, get_assignment_understanding
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
        key_name = params.get("key_name")
        question = params.get("user_question")
        analysis_id = params.get("analysis_id")
        dev = params.get("dev", False)
        temp = params.get("temp", False)
        clarification_questions = params.get("clarification_questions", [])
        toolboxes = params.get("toolboxes", [])

        # if key name or question is none or blank, return error
        if not key_name or key_name == "":
            raise Exception("Invalid request. Must have API key name.")

        if not question or question == "":
            raise Exception("Invalid request. Must have a question.")

        api_key = get_api_key_from_key_name(key_name)

        if not api_key:
            raise Exception("Invalid API key name.")

        # check if the assignment_understanding exists in teh db for this analysis_id
        err, assignment_understanding = get_assignment_understanding(
            analysis_id=analysis_id
        )

        if err:
            raise Exception("Error fetching assignment understanding from database")

        if not assignment_understanding:
            err = await generate_assignment_understanding(
                analysis_id=analysis_id,
                clarification_questions=clarification_questions,
                dfg_api_key=api_key,
            )

        if err:
            raise Exception("Error generating assignment understanding")

        step = await generate_single_step(
            dfg_api_key=api_key,
            analysis_id=analysis_id,
            user_question=question,
            dev=dev,
            temp=temp,
            toolboxes=toolboxes,
        )

        return {
            "success": True,
            "steps": [step],
            "done": step.get("done", True),
        }

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

        analysis_manager = AnalysisDataManager(
            dfg_api_key=api_key,
            user_question=question,
            analysis_id=analysis_id,
            dev=dev,
            temp=temp,
        )

        if analysis_manager.invalid:
            # it's okay if it's invalid. helps us test this endpoint/function in isolation
            # so just warn instead of throwing
            logging.warn(
                "Returned questions but analysis id was invalid. Check unless you're in a testing environment."
            )
        else:
            await analysis_manager.get_similar_plans()
            # TODO: save the clarifying questions to the analysis data

        return {
            "success": True,
            "done": True,
            "clarification_questions": clarification_questions,
        }

    except Exception as e:
        logging.error(e)
        return {"success": False, "error_message": str(e) or "Incorrect request"}


@router.post("/rerun_step")
async def rerun_step_endpoint(request: Request):
    """
    Function that re runs a step given:
    1. Analysis ID
    2. Step id to re run
    3. All steps' objects
    4. Clarification questions

    It re runs both the parents and the dependent steps of the step to re run.
    """
    try:
        params = await request.json()
        key_name = params.get("key_name")
        analysis_id = params.get("analysis_id")
        step_id = params.get("step_id")
        all_steps = params.get("all_steps")
        toolboxes = params.get("toolboxes", [])

        # if key name is none or blank, return error
        if not key_name or key_name == "":
            raise Exception("Invalid request. Must have API key name.")

        if not analysis_id or analysis_id == "":
            raise Exception("Invalid request. Must have analysis id.")

        if not step_id or step_id == "":
            raise Exception("Invalid request. Must have step id.")

        if not all_steps or type(all_steps) != list:
            raise Exception("Invalid request. Must have all steps.")

        api_key = get_api_key_from_key_name(key_name)

        if not api_key:
            raise Exception("Invalid API key name.")

        # first make sure the step exists in all_steps
        step = None
        for s in all_steps:
            if s.get("id") == step_id:
                step = s
                break

        if not step:
            raise Exception("Step not found in all steps.")

        # rerun this step and all its parents and dependents
        # the re run function will handle the storage of all the steps in the db
        new_steps = await rerun_step(
            step=step,
            all_steps=all_steps,
            analysis_id=analysis_id,
            dfg_api_key=api_key,
            user_question=None,
            clarification_questions=None,
            toolboxes=toolboxes,
            dev=False,
            temp=False,
        )

        return {"success": True, "steps": new_steps}
    except Exception as e:
        logging.error(e)
        return {"success": False, "error_message": str(e) or "Incorrect request"}

    pass
