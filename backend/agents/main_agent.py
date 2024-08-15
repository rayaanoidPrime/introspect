from agents.clarifier.clarifier_agent import Clarifier
import traceback


# each of the agents can return a "postprocess" function
# that will be run before the next stage and will process the incoming user input if any for the next stage
async def get_clarification(
    dfg_api_key="",
    user_question="",
    client_description="",
    parent_analyses=[],
    direct_parent_analysis=None,
    dev=False,
    temp=False,
    **kwargs,
):
    """
    This function is called when the user asks for clarification questions.
    It creates a clarifier object and calls the gen_clarification_questions function
    on it. This function returns a generator that yields clarification questions.
    """
    try:
        clarifier = Clarifier(
            dfg_api_key=dfg_api_key,
            user_question=user_question,
            client_description=client_description,
            parent_analyses=parent_analyses,
            direct_parent_analysis=direct_parent_analysis,
            dev=dev,
            temp=temp,
        )

        (
            clarification_questions,
            post_process,
        ) = await clarifier.gen_clarification_questions()

        return {
            "success": True,
            "generator": clarification_questions,
            "prop_name": "clarification_questions",
        }, post_process
    except Exception as e:
        err = e
        traceback.print_exc()
        return {
            "success": False,
            "error_message": "Error generating clarification questions.",
        }, None


async def execute(
    dfg_api_key="",
    analysis_id="",
    user_question="",
    client_description="",
    assignment_understanding="",
    glossary="",
    toolboxes=[],
    parent_analyses=[],
    direct_parent_analysis=None,
    similar_plans=[],
    predefined_steps=None,
    dev=False,
    temp=False,
    **kwargs,
):
    """
    Generates and executes a single step of the plan
    """
    print("Evaling approaches")
    print("API Key: ", dfg_api_key)

    executor = Executor(
        dfg_api_key=dfg_api_key,
        analysis_id=analysis_id,
        user_question=user_question,
        assignment_understanding=assignment_understanding,
        toolboxes=toolboxes,
        parent_analyses=parent_analyses,
        similar_plans=similar_plans,
        predefined_steps=predefined_steps,
        direct_parent_analysis=direct_parent_analysis,
        dev=dev,
        temp=temp,
    )
    try:
        execute, post_process = await executor.execute()
        return {
            "success": True,
            "generator": execute,
            "prop_name": "steps",
        }, post_process

    except Exception as e:
        err = e
        traceback.print_exc()
        return {"success": False, "error_message": "Error generating report."}, None
