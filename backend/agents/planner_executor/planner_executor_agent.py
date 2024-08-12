# the executor converts the user's task to steps and maps those steps to tools.
# also runs those steps
from copy import deepcopy
from uuid import uuid4

from colorama import Fore, Style

from agents.planner_executor.execute_tool import execute_tool
from agents.clarifier.clarifier_agent import turn_into_statements
from db_utils import get_analysis_question_context, store_tool_run, update_analysis_data
from utils import deduplicate_columns, warn_str, YieldList
from .tool_helpers.toolbox_manager import get_tool_library_prompt
from .tool_helpers.tool_param_types import ListWithDefault
import asyncio
import requests

import yaml
import re
import pandas as pd
import os

import logging

logging.basicConfig(level=logging.INFO)

# store the outputs of each step in a global variable
# we keep this around for a while, in case we need to re-run a step v soon after it was run
# but we will clear this cache after a while
# things like api_key, user_question, etc are stored here and are overwritten on every call to generate_single_step
# but the step output cache remains the same
# {
#   "user_question": user_question,
#   "dfg_api_key": dfg_api_key,
#   "toolboxes": toolboxes,
#   "assignment_understanding": assignment_understanding,
#   "dfg": None,
#   "llm_calls_url": llm_calls_url,
#   "analysis_assets_dir": analysis_assets_dir,
#   "dev": dev,
#   "temp": temp,
#   "STEP_ID_1": {...}
#   "STEP_ID_2": {...}
#   "STEP_ID_3": {...}
#   ...
# }
output_cache = {}

llm_calls_url = os.environ.get("LLM_CALLS_URL", "https://api.defog.ai/agent_endpoint")
analysis_assets_dir = os.environ.get("ANALYSIS_ASSETS_DIR", "./analysis_assets")


class MissingVariableException(Exception):
    def __init__(self, variable_name):
        # Call the base class constructor with the parameters it needs
        super().__init__(f"{variable_name}")

        # Now for your custom code...
        self.variable_name = variable_name


def get_input_value(inp, output_cache):
    """
    Tries to figure out a value of an input.

    If the input starts with `global_dict.XXX`, and is not found in output_cache, raises a MissingVariableException.

    That exception is usually a signal to the calling function that it needs to run some parent step.
    """
    val = None

    if isinstance(inp, list):
        # this is an array
        val = []
        for inp in inp:
            val.append(get_input_value(inp, output_cache))

    elif isinstance(inp, str) and inp.startswith("global_dict."):
        variable_name = inp.split(".")[1]
        # if output_cache doesn't have this key, raise an error
        if variable_name not in output_cache:
            # raise error
            raise MissingVariableException(variable_name)
        else:
            # TODO: first look in the analysis_assets directory
            # asset_file_name = step_id + "_output" + "-" + input_name + ".feather"
            # find_asset(asset_file_name)
            # Then store in output_cache
            val = output_cache[variable_name]

    else:
        # simpler types
        if isinstance(inp, str):
            # if only numbers, return float
            if inp.isnumeric():
                val = float(inp)

            # if None as a string after stripping, return None
            if inp.strip() == "None":
                val = None
            val = inp

    return val


def resolve_step_inputs(inputs: dict, output_cache: dict = {}, previous_steps=[]):
    """
    Resolved the inputs to a step.
    This is mostly crucial for parsing output_cache.XXX style of inputs, which occur if this step uses outputs from another step
    This works closely with the get_input_value function which is responsible for parsing a single input.
    An example step's yaml is:
    ```
    - description: Fetching 5 rows from the database to display.
        tool_name: data_fetcher_and_aggregator
        inputs:
        question: "Show me 5 rows from the database."
        outputs_storage_keys: ["five_rows"]
        done: true
    ```
    So the "inputs" is a dict with the key "question". Each input i to a tool is a key in that inputs object.

    That input i itself can be any python type.

    Iff that input i is a string and it starts with "output_cache.", we will have extra logic:
    1. We will first try to find the output inside the analysis_assets folder. If we can't find it, we will call the parent step = the step that generated that `output_cache.XXX` data. This will be one of the steps passed in `previous_responses` to the generate_single_step function.
    2. We will keep recursively calling the `run_tool` function till we resolve all the inputs.
    """

    resolved_inputs = {}

    for input_name, input_val in inputs.items():
        try:
            val = get_input_value(input_val, output_cache)
            resolved_inputs[input_name] = val
        except MissingVariableException as e:
            missing_variable = e.variable_name
            # find the step that generated this variable
            # this will be one of the previous steps
            logging.error(f"Error while resolving input: {input_name}, {input_val}")
            logging.error(f"Missing variable: {missing_variable}")
        except Exception as e:
            logging.error(f"Error resolving input {input_name}: {input_val}")
            logging.error(e)
            raise Exception(f"Error resolving input {input_name}: {input_val}")

    return resolved_inputs


async def run_step(step, previous_steps):
    """
    Runs a step.
    Returns the same object with the results stored in an "outputs" key.
    """
    # we will keep stuff around jic we need to re run this particular step again v soon
    # so use the global output_cache
    global output_cache

    # resolve the inputs
    resolved_inputs = resolve_step_inputs(step["inputs"], output_cache, previous_steps)

    logging.info(f"Resolved step inputs: {resolved_inputs}")

    # once we have the resolved inputs

    results, tool_input_metadata = await execute_tool(
        function_name=step["tool_name"],
        tool_function_inputs=resolved_inputs,
        global_dict=output_cache,
    )

    logging.info(f"Results: {results}")
    logging.info(f"Tool input metadata: {tool_input_metadata}")

    step["error_message"] = results.get("error_message")

    step["input_metadata"] = tool_input_metadata

    step["model_generated_inputs"] = deepcopy(step["inputs"])

    # merge result into the step object
    step.update(results)

    # but not outputs
    # we will construct the outputs object below
    step["outputs"] = {}

    # if there's no error, check if zip is possible
    if not results.get("error_message"):
        # if number of outputs does not match the number of keys to store the outputs in
        # raise exception
        # this should never really happen
        if len(step.get("outputs_storage_keys")) != len(results.get("outputs")):
            raise Exception(
                f"Length of outputs_storage_keys and outputs don't match. Outputs: {results.get('outputs')}"
            )
        else:
            # zip and store the output keys to output_cache
            for output_name, output_value in zip(
                step["outputs_storage_keys"], results.get("outputs")
            ):
                data = output_value.get("data")
                reactive_vars = output_value.get("reactive_vars")
                chart_images = output_value.get("chart_images")

                step["outputs"][output_name] = {}

                logging.info("Parsing output: " + output_name)

                # if the output has data and it is a pandas dataframe,
                # 1. deduplicate the columns
                # 2. store the dataframe in the output_cache
                # 3. store the dataframe in the analysis_assets directory
                # 4. Finally store in the step object
                if data is not None and type(data) == type(pd.DataFrame()):
                    db_path = step["id"] + "_output-" + output_name + ".feather"

                    # deduplicate columns of this df
                    deduplicated = deduplicate_columns(data)

                    # store the dataframe in the output_cache
                    output_cache[output_name] = deduplicated
                    # name the df too
                    output_cache[output_name].df_name = output_name

                    # store the dataframe in the analysis_assets directory
                    deduplicated.reset_index(drop=True).to_feather(
                        analysis_assets_dir + "/datasets/" + db_path
                    )

                    step["outputs"][output_name]["data"] = deduplicated.to_csv(
                        float_format="%.3f", index=False
                    )

                if reactive_vars is not None:
                    step["outputs"][output_name]["reactive_vars"] = reactive_vars

                if chart_images is not None:
                    step["outputs"][output_name]["chart_images"] = chart_images

                logging.info(f"Stored output: {step['outputs'][output_name]}")

    logging.info("Step with results: " + str(step))
    return step


async def generate_single_step(
    dfg_api_key,
    analysis_id,
    user_question,
    clarification_questions=[],
    toolboxes=[],
    previous_steps=[],
    dev=False,
    temp=False,
    # NOTE: we will remove this feature of "parent/nested/follow-on" analysis.
    # Keeping this here for now, but will remove it once we reach a stable point.
    # parent_analyses=[],
    # similar_plans=[],
    # direct_parent_analysis=None,
):
    """
    This function:
    1. Generates a single step of a plan using the LLM. Calls defog-backend-python.
    2. Runs that step.
    3. Stores the result of the step.
    4. Returns the generated step + result.
    """
    global output_cache

    output_cache["dfg_api_key"] = dfg_api_key
    output_cache["user_question"] = user_question
    output_cache["toolboxes"] = toolboxes
    output_cache["dev"] = dev
    output_cache["temp"] = temp

    # get the assignment understanding aka answers to clarification questions
    assignment_understanding = None
    logging.info(f"Clarification questiuons: {clarification_questions}")

    if len(clarification_questions) > 0:
        try:
            assignment_understanding = await turn_into_statements(
                clarification_questions, dfg_api_key
            )
        except Exception as e:
            logging.warn(
                "Could not generate understanding. The answers might not be what the user wants. Resorting to blank string"
            )
            logging.error(e)
            assignment_understanding = ""

    logging.info(f"Assignment understanding: {assignment_understanding}")

    output_cache["assignment_understanding"] = assignment_understanding

    # NOTE: see note above
    # err, user_question_context = await get_analysis_question_context(analysis_id)
    # if err:
    #     user_question_context = None

    tool_library_prompt = await get_tool_library_prompt(toolboxes, user_question)

    # make calls to the LLM to get the next step
    llm_server_url = os.environ.get("LLM_SERVER_ENDPOINT", None)

    # this will default to empty string, so make sure to set to None
    if not llm_server_url:
        llm_server_url = None
    logging.info(f"LLM_SERVER_ENDPOINT set to: `{llm_server_url}`")

    # construct previous_responses from previous_steps
    # wrap in ```yaml ``` and yaml format it
    previous_responses = []
    for step in previous_steps:
        previous_responses.append(
            yaml.dump([step], default_flow_style=False, sort_keys=False)
        )

    next_step_data_description = ""

    logging.info(f"Previous responses: {previous_responses}")

    payload = {
        "request_type": "create_plan",
        "question": user_question,
        "tool_library_prompt": tool_library_prompt,
        "assignment_understanding": assignment_understanding,
        "previous_responses": previous_responses,
        "next_step_data_description": next_step_data_description,
        "api_key": dfg_api_key,
        "plan_id": analysis_id,
        "llm_server_url": llm_server_url,
        "model_name": os.environ.get("LLM_MODEL_NAME", None),
        "dev": dev,
        "temp": temp,
        # NOTE: disabled for now. See note above.
        # "parent_questions": [p["user_question"] for p in parent_analyses],
        # "similar_plans": similar_plans[:2],
    }

    res = (await asyncio.to_thread(requests.post, llm_calls_url, json=payload)).json()
    logging.info(res)
    step_yaml = res["generated_step"]
    logging.info(step_yaml)

    step_yaml = re.search("(?:```yaml)([\s\S]*?)(?=```)", step_yaml)

    if step_yaml is None:
        logging.error(
            f"Seems like no step was generated. This was the response from the LLM: \n {step_yaml}"
        )
        raise Exception("Invalid response from the model")

    step = yaml.safe_load(step_yaml[1].strip())[0]
    # give a unique id to this step
    step["id"] = str(uuid4())

    step_with_results = await run_step(step, previous_steps)

    if analysis_id:
        update_analysis_data

    return step_with_results


class Executor:
    """
    Convert task into steps
    where each step is mapped to a tool.
    """

    def __init__(
        self,
        dfg_api_key,
        analysis_id,
        user_question,
        assignment_understanding,
        toolboxes=[],
        parent_analyses=[],
        similar_plans=[],
        dev=False,
        temp=False,
        predefined_steps=None,
        direct_parent_analysis=None,
    ):
        self.user_question = user_question
        self.dfg_api_key = dfg_api_key
        self.toolboxes = toolboxes
        self.assignment_understanding = assignment_understanding
        self.analysis_id = analysis_id
        self.parent_analyses = parent_analyses
        self.previous_responses = []
        self.similar_plans = similar_plans
        self.predefined_steps = predefined_steps
        self.direct_parent_analysis = direct_parent_analysis
        self.dev = dev
        self.temp = temp

        self.global_dict = {
            "user_question": user_question,
            "dfg_api_key": dfg_api_key,
            "toolboxes": toolboxes,
            "assignment_understanding": assignment_understanding,
            "dfg": None,
            "llm_calls_url": llm_calls_url,
            "analysis_assets_dir": analysis_assets_dir,
            "dev": dev,
            "temp": temp,
        }

        # keep storing store column names of each step's generated data
        self.tool_outputs_column_descriptions = ""

    @staticmethod
    def planner_executor_post_process(self={}):
        def post_process(x):
            return {}

        return post_process

    async def execute(self):
        err, self.user_question_context = await get_analysis_question_context(
            self.analysis_id
        )
        if err:
            self.user_question_context = None

        self.tool_library_prompt = await get_tool_library_prompt(
            self.toolboxes, self.user_question_context or self.user_question
        )

        async def generator():
            max_retries = 2
            retries = 0
            steps = []
            """SAMPLE:

            description: "Fetch the required data from the database"
            done: false
            inputs: ['Get patient_id, celltype, treatment, survival_in_days, and status from the patients table']
            outputs_storage_keys: ['patient_data']
            tool_name: "data_fetcher_and_aggregator"
            tool_run_id: "3496f202-92d3-4c06-a6b2-a093f9867a00"

            description: "Generate a Kaplan Meier survival curve stratified by cell type and treatment type"
            done: true
            inputs: (4) ['global_dict.patient_data', 'survival_in_days', 'status', Array(2)]
            outputs_storage_keys: ['km_curve_data']
            tool_name: "kaplan_meier_curve"
            tool_run_id: "a46c91e7-6ea7-4b0e-b3de-c684803a7b47"

            """
            next_step_data_description = ""

            while True:
                url = llm_calls_url

                if self.predefined_steps is None:
                    if next_step_data_description.startswith("There was an error"):
                        payload = {
                            "request_type": "fix_error",
                            "question": self.user_question,
                            "tool_library_prompt": self.tool_library_prompt,
                            "assignment_understanding": self.assignment_understanding,
                            "parent_questions": [
                                p["user_question"] for p in self.parent_analyses
                            ],
                            "previous_responses": self.previous_responses,
                            "next_step_data_description": "",
                            "error": next_step_data_description,
                            "erroreous_response": ans,
                            "similar_plans": self.similar_plans[:2],
                            "direct_parent_analysis": self.direct_parent_analysis,
                            "api_key": self.dfg_api_key,
                            "plan_id": self.analysis_id,
                            "model_name": "defog/agents-llama-8b-instruct",
                            "llm_server_url": os.environ.get(
                                "LLM_SERVER_ENDPOINT", None
                            ),
                            "dev": self.dev,
                            "temp": self.temp,
                        }
                        ans = await asyncio.to_thread(requests.post, url, json=payload)
                    else:
                        # make calls to the LLM to get the next step
                        llm_server_url = os.environ.get("LLM_SERVER_ENDPOINT", None)
                        if not llm_server_url:
                            llm_server_url = None
                            print("LLM_SERVER_ENDPOINT not set, using None", flush=True)
                        else:
                            print(
                                f"LLM_SERVER_ENDPOINT set to {llm_server_url}",
                                flush=True,
                            )
                        payload = {
                            "request_type": "create_plan",
                            "question": self.user_question,
                            "tool_library_prompt": self.tool_library_prompt,
                            "assignment_understanding": self.assignment_understanding,
                            "parent_questions": [
                                p["user_question"] for p in self.parent_analyses
                            ],
                            "previous_responses": self.previous_responses,
                            "next_step_data_description": next_step_data_description,
                            "similar_plans": self.similar_plans[:2],
                            "direct_parent_analysis": self.direct_parent_analysis,
                            "api_key": self.dfg_api_key,
                            "plan_id": self.analysis_id,
                            "llm_server_url": llm_server_url,
                            "model_name": os.environ.get("LLM_MODEL_NAME", None),
                            "dev": self.dev,
                            "temp": self.temp,
                        }
                        ans = await asyncio.to_thread(requests.post, url, json=payload)

                    try:
                        ans = ans.json()["generated_step"]
                        self.previous_responses.append(ans)
                    except Exception as e:
                        raise Exception(f"{ans.text}")

                    match = re.search("(?:```yaml)([\s\S]*?)(?=```)", ans)

                    if match is None:
                        break

                    step = yaml.safe_load(match[1].strip())[0]
                    # add a unique id to this tool as the tool_run prop
                    step["tool_run_id"] = str(uuid4())
                else:
                    step = self.predefined_steps.pop(0)

                print("step: ", step, flush=True)

                # prepare to execute this step, by resolving the inputs
                # if there's a global_dict.variable_name reference in step["inputs"], replace it with the value from global_dict
                resolved_inputs = {}
                for input_name, val in step["inputs"].items():
                    resolved_inputs[input_name] = resolve_input(val, self.global_dict)

                # execute this step
                result, tool_input_metadata = await execute_tool(
                    step["tool_name"], resolved_inputs, self.global_dict
                )

                print("result: ", result, flush=True)

                step["error_message"] = result.get("error_message")

                step["input_metadata"] = tool_input_metadata
                # when we're re running, we will need to reconstruct the model messages
                # store these for later
                # later we'll have to replace these with the user's edited inputs perhaps.
                step["model_generated_inputs"] = deepcopy(step["inputs"])

                # if there's no error, check if zip is possible
                # this should never really happen
                if not result.get("error_message") and (
                    len(step.get("outputs_storage_keys")) != len(result.get("outputs"))
                ):
                    # TODO: REDO THIS STEP
                    print(
                        Fore.RED
                        + "Length of outputs_storage_keys and outputs don't match. Force matching the length."
                        + Style.RESET_ALL
                    )
                    # if outputs_storage_keys < outputs, append the difference with output_idx
                    if len(step.get("outputs_storage_keys")) < len(
                        result.get("outputs")
                    ):
                        for i in range(
                            len(step.get("outputs_storage_keys")),
                            len(result.get("outputs")),
                        ):
                            step["outputs_storage_keys"].append(
                                f"{step['tool_name']}_output_{i}"
                            )

                    # if outputs_storage_keys > outputs, remove the difference
                    if len(step.get("outputs_storage_keys")) > len(
                        result.get("outputs")
                    ):
                        step["outputs_storage_keys"] = step["outputs_storage_keys"][
                            : len(result.get("outputs"))
                        ]

                # if we're here, means this step ran successfully.
                # if the outputs of this step match any of the previous steps, either exactly or:
                # , means that we should overwrite the previous step with this step. this was probably a "correction" of some of the previous step.
                is_correction = False

                yield_val = YieldList([step])

                for i, previous_step in enumerate(steps):
                    if set(previous_step["outputs_storage_keys"]) == set(
                        step["outputs_storage_keys"]
                    ):
                        print("\n")
                        print("This step is a correction of a previous step")
                        print("\n\n")
                        is_correction = True
                        # we've already written that step, and sent it to the front end.
                        # steal the tool_run_id of the older step
                        step["tool_run_id"] = previous_step["tool_run_id"]
                        step["tool_run_data"] = {}
                        yield_val.overwrite_key = "tool_run_id"

                if not is_correction:
                    steps.append(step)

                # store tool run
                store_result = await store_tool_run(self.analysis_id, step, result)

                if store_result["success"] is False:
                    print("Tool run storage failed")
                    print(store_result.get("error_message"))
                    break

                # retry logic if there's an error message
                if result.get("error_message"):
                    retries += 1
                    if retries >= max_retries:
                        print(
                            f"Error running tool {step['tool_name']} after {max_retries} retries"
                        )
                        print("Error message: ", result["error_message"])
                        yield yield_val
                        break

                    print(
                        "There was an error running the tool: ",
                        result["error_message"],
                    )
                    print("Retrying...")
                    next_step_data_description = f"There was an error running the tool {step['tool_name']}. This was the error:\n{result['error_message']}\n Instead of suffixing older output names with _updated, _v2, etc, re use the older output names of previously generated steps."
                    continue

                print(yield_val)
                yield yield_val

                for key, output in zip(step["outputs_storage_keys"], result["outputs"]):
                    data = output.get("data")
                    # if output data exists and data type is a pandas dataframe
                    # store the column names in the tool_outputs_column_descriptions
                    if data is not None and type(data) == type(pd.DataFrame()):
                        # if there's an overwrite key, check if there's a line that already exists
                        replace_line = re.search(
                            f"({key}: pd.DataFrame with )([\s\S]*?)(?=\\n)",
                            self.tool_outputs_column_descriptions,
                        )
                        if yield_val.overwrite_key and replace_line:
                            self.tool_outputs_column_descriptions = self.tool_outputs_column_descriptions.replace(
                                replace_line.group(2),
                                f"{len(data)} rows and columns: {list(data.columns)[:20]}",
                            )
                        else:
                            # store max 20 columns
                            self.tool_outputs_column_descriptions += f"\n{key}: pd.DataFrame with {len(data)} rows and columns: {list(data.columns)[:20]}\n"

                        self.global_dict[key] = data
                        # name the df too
                        self.global_dict[key].df_name = key
                        # warn if more than 20 columns
                        warn_str(
                            f"More than 20 columns in dataset generated for {key}. Only storing the first 20."
                        )

                if self.tool_outputs_column_descriptions:
                    # if there's an overwrite key, replace the
                    next_step_data_description = f"The global_dict contains the following keys with data and columns:\n```{self.tool_outputs_column_descriptions}```\n"

                print(next_step_data_description)

                # if we still have an error in result, we somehow beat the max_retries check in the if condition above
                # so we should break out of the loop
                # this should never happen in normal circumstances
                if "error_message" in result:
                    print(result["error_message"])
                    break

                if "done" in step and step["done"] is True:
                    break

        return generator, self.planner_executor_post_process()
