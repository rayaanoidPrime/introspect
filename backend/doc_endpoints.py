import datetime
import os
from uuid import uuid4
from colorama import Fore, Style
import traceback

from fastapi.responses import JSONResponse
import requests
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Request
from agents.planner_executor.tool_helpers.rerun_step import rerun_step_and_dependents
from agents.planner_executor.tool_helpers.core_functions import analyse_data
import pandas as pd
from utils import log_msg, snake_case
import logging
from generic_utils import get_api_key_from_key_name
from db_utils import execute_code, get_db_type_creds

logging.basicConfig(level=logging.INFO)

from connection_manager import ConnectionManager
from db_utils import (
    add_to_recently_viewed_docs,
    add_tool,
    delete_tool,
    get_all_docs,
    get_analysis_versions,
    get_doc_data,
    get_analysis_data,
    get_tool_run,
    get_toolboxes,
    store_feedback,
    store_tool_run,
    toggle_disable_tool,
    update_doc_data,
    update_analysis_data,
    update_table_chart_data,
    get_table_data,
    get_all_analyses,
    update_tool,
    update_tool_run_data,
    delete_doc,
    get_all_tools,
)

router = APIRouter()

manager = ConnectionManager()

llm_calls_url = os.environ.get("LLM_CALLS_URL", "https://api.defog.ai/agent_endpoint")
analysis_assets_dir = os.environ.get(
    "ANALYSIS_ASSETS_DIR", "/agent-assets/analysis-assets"
)


@router.websocket("/docs")
async def doc_websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_json()
            if "ping" in data:
                # don't do anything
                continue
            if data.get("doc_uint8") is None:
                logging.info("No document data provided.")
                logging.info(data)
                # send error back
                await manager.send_personal_message(
                    {"success": False, "error_message": "No document data provided."},
                    websocket,
                )
                continue

            if data.get("doc_id") is None:
                await manager.send_personal_message(
                    {"success": False, "error_message": "No document id provided."},
                    websocket,
                )
                logging.info("Doc id is none ")
                logging.info(data)

                continue

            col_name = "doc_blocks" if data.get("doc_blocks") else "doc_uint8"
            err = await update_doc_data(
                data.get("doc_id"),
                [col_name, "doc_title"],
                {col_name: data.get(col_name), "doc_title": data.get("doc_title")},
            )

            logging.info(data.get("api_key"))
            logging.info(data.get("token"))
            logging.info(data.get("doc_id"))

            await manager.send_personal_message(data, websocket)
    except WebSocketDisconnect as e:
        # logging.info("Disconnected. Error: " +  str(e))
        # traceback.print_exc()
        manager.disconnect(websocket)
        await websocket.close()
    except Exception as e:
        # logging.info("Disconnected. Error: " +  str(e))
        # traceback.print_exc()
        # other reasons for disconnect, like websocket being closed or a timeout
        manager.disconnect(websocket)
        await websocket.close()


@router.post("/add_to_recently_viewed_docs")
async def add_to_recently_viewed_docs_endpoint(request: Request):
    """
    Add a document to the recently viewed docs of a user.
    """
    try:
        data = await request.json()
        token = data.get("token")
        key_name = data.get("key_name")
        api_key = get_api_key_from_key_name(key_name)

        doc_id = data.get("doc_id")

        if token is None or type(token) != str:
            return {"success": False, "error_message": "Invalid token."}

        if doc_id is None or type(doc_id) != str:
            return {"success": False, "error_message": "Invalid document id."}

        err = await add_to_recently_viewed_docs(
            token=token,
            doc_id=doc_id,
            api_key=api_key,
            timestamp=str(datetime.datetime.now()),
        )

        if err:
            raise Exception(err)

        return {"success": True}
    except Exception as e:
        logging.info("Error getting analyses: " + str(e))
        traceback.print_exc()
        return {"success": False, "error_message": e}


@router.post("/toggle_archive_status")
async def toggle_archive_status(request: Request):
    """
    Toggle the archive status of a document.
    """
    data = await request.json()
    doc_id = data.get("doc_id")
    archive_status = data.get("archive_status")

    err = await update_doc_data(doc_id, ["archived"], {"archived": archive_status})

    if err:
        return {"success": False, "error_message": err}

    return {"success": True}


@router.post("/get_doc")
async def get_document(request: Request):
    """
    Get the document using the id passed.
    If it doesn't exist, create one and return empty data.
    """
    data = await request.json()
    key_name = data.get("key_name")
    doc_id = data.get("doc_id")
    token = data.get("token")
    col_name = data.get("col_name") or "doc_blocks"
    api_key = get_api_key_from_key_name(key_name)

    if api_key is None or type(api_key) != str:
        return {"success": False, "error_message": "Invalid api key."}

    if doc_id is None or type(doc_id) != str:
        return {"success": False, "error_message": "Invalid document id."}

    err, doc_data = await get_doc_data(
        api_key=api_key, doc_id=doc_id, token=token, col_name=col_name
    )

    if err:
        return {"success": False, "error_message": err}

    return {"success": True, "doc_data": doc_data}


@router.post("/get_toolboxes")
async def get_toolboxes_endpoint(request: Request):
    """
    Get all toolboxes using the username.
    """
    try:
        data = await request.json()
        token = data.get("token")

        if token is None or type(token) != str:
            return {"success": False, "error_message": "Invalid token."}

        err, toolboxes = await get_toolboxes(token)
        if err:
            return {"success": False, "error_message": err}

        return {"success": True, "toolboxes": toolboxes}
    except Exception as e:
        logging.info("Error getting analyses: " + str(e))
        traceback.print_exc()
        return {"success": False, "error_message": "Unable to parse your request."}


@router.post("/get_docs")
async def get_docs(request: Request):
    """
    Get all documents of a user using the api key.
    """
    try:
        data = await request.json()
        token = data.get("token")

        if token is None or type(token) != str:
            return {"success": False, "error_message": "Invalid token."}

        err, own_docs, recently_viewed_docs = await get_all_docs(token)
        if err:
            return {"success": False, "error_message": err}

        return {
            "success": True,
            "docs": own_docs,
            "recently_viewed_docs": recently_viewed_docs,
        }
    except Exception as e:
        logging.info("Error getting analyses: " + str(e))
        traceback.print_exc()
        return {"success": False, "error_message": "Unable to parse your request."}


@router.post("/get_analyses")
async def get_analyses(request: Request):
    """
    Get all analysis of a user using the api key.
    """
    params = await request.json()
    key_name = params.get("key_name")
    api_key = get_api_key_from_key_name(key_name)
    print(api_key, flush=True)
    try:
        err, analyses = await get_all_analyses(api_key=api_key)
        if err:
            return {"success": False, "error_message": err}

        return {"success": True, "analyses": analyses}
    except Exception as e:
        logging.info("Error getting analyses: " + str(e))
        traceback.print_exc()
        return {"success": False, "error_message": "Unable to parse your request."}


@router.post("/get_tool_run")
async def get_tool_run_endpoint(request: Request):
    """
    Get the tool run using the id passed.
    """
    try:
        data = await request.json()
        tool_run_id = data.get("tool_run_id")
        logging.info("getting tool run: " + tool_run_id)

        if tool_run_id is None or type(tool_run_id) != str:
            return {"success": False, "error_message": "Invalid tool run id."}

        err, tool_run = await get_tool_run(tool_run_id)

        if err:
            return {"success": False, "error_message": err}

        return {"success": True, "tool_run_data": tool_run}
    except Exception as e:
        logging.info("Error getting analyses: " + str(e))
        traceback.print_exc()
        return {"success": False, "error_message": "Unable to parse your request."}


# setup an analyse_data websocket endpoint
@router.websocket("/analyse_data")
async def analyse_data_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_json()
            if "ping" in data:
                # don't do anything
                continue
            if data.get("question") is None:
                await manager.send_personal_message(
                    {"success": False, "error_message": "No question"}, websocket
                )
                continue

            if data.get("data") is None:
                await manager.send_personal_message(
                    {"success": False, "error_message": "No data"}, websocket
                )
                continue

            df = pd.DataFrame(
                data["data"]["data"],
            )
            for col in ["key", "index"]:
                if col in df.columns:
                    del df[col]

            # read data from the csv
            image_path = data.get("image")

            async for chunk in analyse_data(
                data.get("question"), df, image_path=image_path
            ):
                await manager.send_personal_message(chunk, websocket)

    except WebSocketDisconnect as e:
        # logging.info("Disconnected. Error: " +  str(e))
        # traceback.print_exc()
        manager.disconnect(websocket)
        await websocket.close()
    except Exception as e:
        # logging.info("Disconnected. Error: " +  str(e))
        traceback.print_exc()
        await manager.send_personal_message(
            {"success": False, "error_message": str(e)[:300]}, websocket
        )
        # other reasons for disconnect, like websocket being closed or a timeout
        manager.disconnect(websocket)
        await websocket.close()


@router.post("/delete_doc")
async def delete_doc_endpoint(request: Request):
    """
    Delete a document using the id passed.
    """
    try:
        data = await request.json()
        doc_id = data.get("doc_id")

        if doc_id is None or type(doc_id) != str:
            return {"success": False, "error_message": "Invalid document id."}

        err = await delete_doc(doc_id)

        if err:
            return {"success": False, "error_message": err}

        return {"success": True}
    except Exception as e:
        logging.info("Error deleting doc: " + str(e))
        traceback.print_exc()
        return {"success": False, "error_message": str(e)[:300]}


# download csv using tool_run_id and output_storage_key
@router.post("/download_csv")
async def download_csv(request: Request):
    """
    Download a csv using the tool run id and output storage key.
    """
    try:
        data = await request.json()
        tool_run_id = data.get("tool_run_id")
        output_storage_key = data.get("output_storage_key")
        analysis_id = data.get("analysis_id")
        key_name = data.get("key_name")
        api_key = get_api_key_from_key_name(key_name)

        if tool_run_id is None or type(tool_run_id) != str:
            return {"success": False, "error_message": "Invalid tool run id."}

        if output_storage_key is None or type(output_storage_key) != str:
            return {"success": False, "error_message": "Invalid output storage key."}

        if analysis_id is None or type(analysis_id) != str:
            return {"success": False, "error_message": "Invalid analysis id."}

        # first try to find this file in the file system
        f_name = tool_run_id + "_output-" + output_storage_key + ".feather"
        f_path = os.path.join(analysis_assets_dir, "datasets", f_name)

        if not os.path.isfile(f_path):
            log_msg(
                f"Input {output_storage_key} not found in the file system. Rerunning step: {tool_run_id}"
            )
            # re run this step
            # get steps from db
            err, analysis_data = get_analysis_data(analysis_id)
            if err:
                return {"success": False, "error_message": err}

            global_dict = {
                "user_question": analysis_data["user_question"],
                "llm_calls_url": llm_calls_url,
                "analysis_assets_dir": analysis_assets_dir,
                "dfg_api_key": api_key,
            }

            if err:
                return {"success": False, "error_message": err}

            steps = analysis_data.get("gen_steps")
            if steps and steps.get("success") and steps.get("steps"):
                steps = steps["steps"]
            else:
                return {"success": False, "error_message": steps["error_message"]}

            async for err, reran_id, new_data in rerun_step_and_dependents(
                dfg_api_key=api_key,
                analysis_id=analysis_id,
                tool_run_id=tool_run_id,
                steps=steps,
                global_dict=global_dict,
            ):
                # don't need to yield unless there's an error
                # if error, then bail
                if err:
                    return {"success": False, "error_message": err}
        else:
            log_msg(
                f"Input {output_storage_key} found in the file system. No need to rerun step."
            )

        # now the file *should* be available
        df = pd.read_feather(f_path)

        return {
            "success": True,
            "tool_run_id": tool_run_id,
            "output_storage_key": output_storage_key,
            # get it as a csv string
            "csv": df.to_csv(index=False),
        }

    except Exception as e:
        logging.info("Error downloading csv: " + str(e))
        traceback.print_exc()
        return {"success": False, "error_message": str(e)[:300]}


@router.post("/get_user_tools")
async def get_user_tools(request: Request):
    """
    Get all tools available to the user.
    """
    err, tools = get_all_tools()
    if err:
        return {"success": False, "error_message": err}
    return {"success": True, "tools": tools}


@router.post("/delete_tool")
async def delete_tool_endpoint(request: Request):
    """
    Delete a tool using the tool name.
    """
    try:
        data = await request.json()
        function_name = data.get("function_name")

        if function_name is None or type(function_name) != str:
            return {"success": False, "error_message": "Invalid tool name."}

        err = await delete_tool(function_name)

        if err:
            return {"success": False, "error_message": err}

        logging.info("Deleted tool: " + function_name)

        return {"success": True}
    except Exception as e:
        logging.info("Error disabling tool: " + str(e))
        traceback.print_exc()
        return {"success": False, "error_message": str(e)[:300]}


@router.post("/toggle_disable_tool")
async def toggle_disable_tool_endpoint(request: Request):
    """
    Toggle the disabled property of a tool using the tool name.
    """
    try:
        data = await request.json()
        function_name = data.get("function_name")

        if function_name is None or type(function_name) != str:
            return {"success": False, "error_message": "Invalid tool name."}

        err = await toggle_disable_tool(function_name)

        if err:
            raise Exception(err)

        return {"success": True}
    except Exception as e:
        logging.info("Error disabling tool: " + str(e))
        traceback.print_exc()
        return {"success": False, "error_message": str(e)[:300]}


@router.post("/add_tool")
async def add_tool_endpoint(request: Request):
    """
    Add a tool to the defog_tools table.
    """
    try:
        data = await request.json()
        tool_name = data.get("tool_name")
        function_name = data.get("function_name")
        description = data.get("description")
        code = data.get("code")
        input_metadata = data.get("input_metadata")
        output_metadata = data.get("output_metadata")
        toolbox = data.get("toolbox")
        no_code = data.get("no_code", False)
        key_name = data.get("key_name")
        api_key = get_api_key_from_key_name(key_name)

        if (
            function_name is None
            or type(function_name) != str
            or len(function_name) == 0
        ):
            return {"success": False, "error_message": "Invalid tool name."}

        if description is None or type(description) != str or len(description) == 0:
            return {"success": False, "error_message": "Invalid description."}

        if code is None or type(code) != str or len(code) == 0:
            return {"success": False, "error_message": "Invalid code."}

        if input_metadata is None or type(input_metadata) != dict:
            return {"success": False, "error_message": "Invalid input_metadata."}

        if (
            output_metadata is None
            or type(output_metadata) != list
            or len(output_metadata) == 0
        ):
            return {
                "success": False,
                "error_message": "Invalid or empty output_metadata.",
            }

        if tool_name is None or type(tool_name) != str or len(tool_name) == 0:
            return {"success": False, "error_message": "Invalid display name."}

        if toolbox is None or type(toolbox) != str or len(toolbox) == 0:
            return {"success": False, "error_message": "Invalid toolbox."}

        if no_code is None or type(no_code) != bool:
            return {"success": False, "error_message": "Invalid no code."}

        err = await add_tool(
            api_key=api_key,
            tool_name=tool_name,
            function_name=function_name,
            description=description,
            code=code,
            input_metadata=input_metadata,
            output_metadata=output_metadata,
            toolbox=toolbox,
        )

        if err:
            raise Exception(err)

        logging.info("Added tool: " + function_name)

        return {"success": True}
    except Exception as e:
        logging.info("Error adding tool: " + str(e))
        traceback.print_exc()
        return {"success": False, "error_message": str(e)[:300]}


@router.post("/submit_feedback")
async def submit_feedback(request: Request):
    """
    Submit feedback to the backend.
    """
    error = None
    try:
        data = await request.json()
        analysis_id = data.get("analysis_id")
        comments = data.get("comments", {})
        is_correct = data.get("is_correct", False)
        user_question = data.get("user_question")
        analysis_id = data.get("analysis_id")
        token = data.get("token")
        key_name = data.get("key_name")
        api_key = get_api_key_from_key_name(key_name)
        res = get_db_type_creds(api_key)
        db_type = res[0]

        if analysis_id is None or type(analysis_id) != str:
            raise Exception("Invalid analysis id.")

        if api_key is None or type(api_key) != str:
            raise Exception("Invalid api key.")

        if user_question is None or type(user_question) != str:
            raise Exception("Invalid user question.")

        err, analysis_data = get_analysis_data(analysis_id)

        # store in the defog_plans_feedback table
        err, did_overwrite = await store_feedback(
            api_key=api_key,
            user_question=user_question,
            analysis_id=analysis_id,
            is_correct=is_correct,
            comments=comments,
            db_type=db_type,
        )

        if err:
            raise Exception(err)

        return {"success": True, "did_overwrite": did_overwrite}
    except Exception as e:
        logging.info(str(e))
        error = str(e)[:300]
        logging.info(error)
        traceback.print_exc()
        return {"success": False, "error_message": error}


@router.post("/get_analysis_versions")
async def get_analysis_versions_endpoint(request: Request):
    # get all analysis ids that have teh suffix -v1, -v2, -v3 etc
    try:
        params = await request.json()
        root_analysis_id = params.get("root_analysis_id", None)

        if not root_analysis_id:
            raise Exception("No root analysis provided.")

        await get_analysis_versions(root_analysis_id)
        pass
    except Exception as e:
        logging.info("Error getting analysis versions: " + str(e))
        traceback.print_exc()
        return {
            "success": False,
            "error_message": "Unable to get versions: " + str(e[:300]),
        }


@router.post("/update_dashboard_data")
async def update_dashboard_data_endpoint(request: Request):
    try:
        data = await request.json()
        if data.get("doc_uint8") is None:
            return {"success": False, "error_message": "No document data provided."}

        if data.get("doc_id") is None:
            return {"success": False, "error_message": "No document id provided."}

        col_name = "doc_blocks" if data.get("doc_blocks") else "doc_uint8"
        err = await update_doc_data(
            data.get("doc_id"),
            [col_name, "doc_title"],
            {col_name: data.get(col_name), "doc_title": data.get("doc_title")},
        )
        if err:
            return {"success": False, "error_message": err}

        return {"success": True}
    except Exception as e:
        logging.info("Error adding analysis to dashboard: " + str(e))
        traceback.print_exc()
        return {
            "success": False,
            "error_message": "Unable to add analysis to dashboard: " + str(e)[:300],
        }


@router.post("/generate_tool_code")
async def generate_tool_code_endpoint(request: Request):
    try:
        data = await request.json()
        tool_name = data.get("tool_name")
        tool_description = data.get("tool_description")
        user_question = data.get("user_question")
        current_code = data.get("current_code")
        key_name = data.get("key_name")
        api_key = get_api_key_from_key_name(key_name)

        if not tool_name:
            raise Exception("Invalid parameters.")

        if not user_question or user_question == "":
            user_question = "Please write the tool code."

        payload = {
            "request_type": "generate_tool_code",
            "tool_name": tool_name,
            "tool_description": tool_description,
            "user_question": user_question,
            "current_code": current_code,
            "api_key": api_key,
        }

        retries = 0
        error = None
        messages = None
        while retries < 3:
            try:
                logging.info(payload)
                resp = requests.post(
                    llm_calls_url,
                    json=payload,
                ).json()

                # testing code has two functions: generate_sample_inputs and test_tool
                if resp.get("error_message"):
                    raise Exception(resp.get("error_message"))

                tool_code = resp["tool_code"]
                testing_code = resp["testing_code"]
                messages = resp["messages"]

                print(tool_code)
                print(testing_code, flush=True)

                # find the function name in tool_code
                try:
                    function_name = tool_code.split("def ")[1].split("(")[0]
                except Exception as e:
                    logging.error("Error finding function name: " + str(e))
                    # default to snake case tool name
                    function_name = snake_case(tool_name)
                    logging.error(
                        "Defaulting to snake case tool name: " + function_name
                    )

                # try running this code
                err, testing_details, _ = await execute_code(
                    [tool_code, testing_code], "test_tool"
                )

                if err:
                    raise Exception(err)

                # unfortunately testing_details has outputs, and inside of it is another outputs which is returned by the tool :tear:
                testing_details["outputs"] = testing_details["outputs"]["outputs"]

                # convert inputs to a format we can send back to the user
                # convert pandas dfs to csvs in both inoputs and outputs
                for i, input in enumerate(testing_details["inputs"]):
                    value = input["value"]
                    if type(value) == pd.DataFrame:
                        testing_details["inputs"][i]["value"] = value.to_csv(
                            index=False
                        )

                for output in testing_details["outputs"]:
                    output["data"] = output["data"].to_csv(index=False)

                return JSONResponse(
                    {
                        "success": True,
                        "tool_name": tool_name,
                        "tool_description": tool_description,
                        "generated_code": tool_code,
                        "testing_code": testing_code,
                        "function_name": function_name,
                        "testing_results": {
                            "inputs": testing_details["inputs"],
                            "outputs": testing_details["outputs"],
                        },
                    }
                )
            except Exception as e:
                error = str(e)[:300]
                logging.info("Error generating tool code: " + str(e))
                traceback.print_exc()
            finally:
                if error:
                    payload = {
                        "request_type": "fix_tool_code",
                        "error": error,
                        "messages": messages,
                        "api_key": api_key,
                    }
                retries += 1

        logging.info("Max retries reached but couldn't generate code.")
        raise Exception("Max retries exceeded but couldn't generate code.")

    except Exception as e:
        logging.info("Error generating tool code: " + str(e))
        traceback.print_exc()
        return {
            "success": False,
            "error_message": "Unable to generate tool code: " + str(e)[:300],
        }
