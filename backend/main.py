import logging
import os
import trace
import traceback
from fastapi import FastAPI, WebSocket, Request
from fastapi.responses import FileResponse
from starlette.websockets import WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from connection_manager import ConnectionManager
from analysis_data_manager import AnalysisDataManager
from agents.planner_executor.execute_tool import execute_tool
from agents.planner_executor.planner_executor_agent_rest import RESTExecutor
from oracle.setup import setup_dir
import doc_endpoints
from uuid import uuid4
from utils import make_request

from db_utils import (
    get_all_analyses,
    get_analysis_data,
    initialise_analysis,
    update_analysis_data,
    store_tool_run,
    validate_user,
)
from generic_utils import get_api_key_from_key_name
import integration_routes, query_routes, admin_routes, auth_routes, readiness_routes, csv_routes, feedback_routes, slack_routes, agent_routes, oracle_routes

logging.basicConfig(level=logging.INFO)

manager = ConnectionManager()

app = FastAPI()
app.include_router(integration_routes.router)
app.include_router(query_routes.router)
app.include_router(admin_routes.router)
app.include_router(auth_routes.router)
app.include_router(readiness_routes.router)
app.include_router(doc_endpoints.router)
app.include_router(csv_routes.router)
app.include_router(feedback_routes.router)
app.include_router(slack_routes.router)
app.include_router(agent_routes.router)
app.include_router(oracle_routes.router)

origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

request_types = ["clarify", "understand", "gen_approaches", "gen_steps", "gen_analysis"]
analysis_assets_dir = os.environ.get(
    "ANALYSIS_ASSETS_DIR", "/agent-assets/analysis-assets"
)
llm_calls_url = os.environ.get("LLM_CALLS_URL", "https://api.defog.ai/agent_endpoint")

# check if the oracle directory structure exists and create if not
setup_dir(os.getcwd())


@app.get("/ping")
async def root():
    return {"message": "Hello World"}


edit_request_types_and_prop_names = {
    "edit_analysis_md": {
        "table_column": "gen_analysis",
        "prop_name": "analysis_sections",
    },
    "edit_approaches": {"table_column": "gen_approaches", "prop_name": "approaches"},
}


async def get_classification(question, api_key, debug=False):
    r = await make_request(
        f"{os.environ.get('DEFOG_BASE_URL', 'https://api.defog.ai')}/update_agent_feedback",
        payload={"question": question, "api_key": api_key},
    )
    if r.status_code == 200:
        return r.json()
    else:
        print(f"Error getting question classification: {r.status_code}")
        print(r.text)


@app.post("/get_analyses")
async def all_analyses(request: Request):
    params = await request.json()
    key_name = params.get("key_name")
    api_key = get_api_key_from_key_name(key_name)
    try:
        err, analyses = get_all_analyses(api_key=api_key)
        if err is not None:
            return {"success": False, "error_message": err}

        return {"success": True, "analyses": analyses}
    except Exception as e:
        print(e)
        traceback.print_exc()
        return {"success": False, "error_message": "Incorrect request"}


@app.post("/get_analysis")
async def one_analysis(request: Request):
    try:
        params = await request.json()
        analysis_id = params.get("analysis_id")

        print("get_one_analysis", params)

        err, analysis_data = get_analysis_data(analysis_id)

        if err is not None:
            return {"success": False, "error_message": err}

        return {"success": True, "analysis_data": analysis_data}
    except Exception as e:
        print(e)
        traceback.print_exc()
        return {"success": False, "error_message": "Incorrect request"}


@app.post("/create_analysis")
@app.post("/create_analysis")
async def create_analysis(request: Request):
    try:
        params = await request.json()
        token = params.get("token")

        key_name = params.get("key_name")
        api_key = get_api_key_from_key_name(key_name)

        print("create_analysis", params)

        err, analysis_data = await initialise_analysis(
            user_question="",
            token=token,
            api_key=api_key,
            custom_id=params.get("custom_id"),
            other_data=params.get("other_data"),
        )

        if err is not None:
            return {"success": False, "error_message": err}

        return {"success": True, "analysis_data": analysis_data}
    except Exception as e:
        print(e)
        return {"success": False, "error_message": "Incorrect request"}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_json()
            try:
                if data.get("ping") is not None:
                    await websocket.send_json({"pong": True})
                    continue

                if "request_type" not in data:
                    await websocket.send_json(
                        {"error_message": "No request type provided"}
                    )
                    continue

                key_name = data.get("key_name")
                api_key = get_api_key_from_key_name(key_name)

                # find request type
                request_type = data.get("request_type")
                if (
                    request_type not in request_types
                    and request_type != "update_analysis_md"
                ):
                    await websocket.send_json(
                        {"error_message": "Incorrect request type"}
                    )
                    continue

                if "user_question" not in data or data["user_question"] == "":
                    await websocket.send_json(
                        {"error_message": "Please provide a question."}
                    )
                    continue

                analysis_id = data.get("analysis_id")
                token = data.get("token")
                sql_only = data.get("sql_only")

                if validate_user(token) is False:
                    await websocket.send_json(
                        {"success": False, "error_message": "Invalid token"}
                    )
                    continue
                dev = data.get("dev")
                temp = data.get("temp")

                # start a analysis data manager
                # this fetches currently existing analysis data for this analysis
                analysis_data_manager = AnalysisDataManager(
                    dfg_api_key=api_key,
                    user_question=data["user_question"],
                    analysis_id=analysis_id,
                    dev=dev,
                    temp=temp,
                )

                await analysis_data_manager.get_similar_plans()

                # if this analysis is invalid
                if analysis_data_manager.invalid:
                    await websocket.send_json(
                        {
                            "success": False,
                            "error_message": "Error. Invalid analysis id?",
                        }
                    )
                    continue

                resp = {}
                resp["request_type"] = request_type
                resp["analysis_id"] = analysis_data_manager.analysis_data["analysis_id"]

                # if the question has "sqlcoder" in it, we can skip the agent
                # and change the classification to sqlcoder
                if "sqlcoder" in data["user_question"]:
                    print("sqlcoder word found in question")
                    classification = {"prediction": "sqlcoder"}
                elif sql_only:
                    print("sql_only flag passed")
                    classification = {"prediction": "sqlcoder"}
                else:
                    print("agent word found in question")
                    classification = {"prediction": "agent"}
                # else:
                #     # check if the user question needs agents, or just sqlcoder is fine
                #     classification = await get_classification(
                #         question=data["user_question"], api_key=api_key
                #     )

                print(classification, flush=True)
                if classification["prediction"] == "sqlcoder":
                    # first, send the clarifier result as done
                    if request_type == "clarify":
                        resp["output"] = {
                            "success": True,
                            "clarification_questions": [],
                        }
                        # save blank clarifying step to the analysis data
                        await analysis_data_manager.update("clarify", [], replace=True)

                        await websocket.send_json(resp)
                        del resp["output"]
                        resp["done"] = True

                    if request_type == "gen_steps":
                        # get the sqlcoder response
                        inputs = {
                            "question": data["user_question"],
                        }
                        result, tool_input_metadata = await execute_tool(
                            function_name="data_fetcher_and_aggregator",
                            tool_function_inputs=inputs,
                            global_dict={
                                "dfg_api_key": api_key,
                                "dev": dev,
                                "temp": temp,
                            },
                        )
                        tool_run_id = str(uuid4())
                        step = {
                            "description": data["user_question"],
                            "tool_name": "data_fetcher_and_aggregator",
                            "inputs": inputs,
                            "outputs_storage_keys": ["answer"],
                            "done": True,
                            "tool_run_id": tool_run_id,
                            "error_message": None,
                            "input_metadata": {
                                "question": {
                                    "name": "question",
                                    "type": "str",
                                    "default": None,
                                    "description": "natural language description of the data required to answer this question (or get the required information for subsequent steps) as a string",
                                }
                            },
                            "model_generated_inputs": inputs,
                        }

                        # save the above step to the analysis data
                        await analysis_data_manager.update(
                            "gen_steps", [step], replace=True
                        )

                        # store the tool run of the step
                        store_result = await store_tool_run(
                            resp["analysis_id"], step, result
                        )
                        print(store_result, flush=True)
                        resp["output"] = {
                            "success": True,
                            "steps": [step],
                        }
                        await websocket.send_json(resp)

                        del resp["output"]
                        resp["done"] = True
                        await websocket.send_json(resp)
                else:
                    # if the user question is for the agent
                    toolboxes = (
                        data.get("toolboxes")
                        if data.get("toolboxes") and type(data.get("toolboxes")) == list
                        else []
                    )
                    # run the agent as per the request_type
                    err, agent_output = await analysis_data_manager.run_agent(
                        analysis_id=analysis_id,
                        request_type=request_type,
                        user_question=data["user_question"],
                        post_process_data=data,
                        # token is used to figure out which tools to give to the user
                        token=token,
                        extra_approaches=[],
                        db_creds=data.get("db_creds"),
                        toolboxes=toolboxes,
                        dev=dev,
                        temp=temp,
                    )

                    # if the agent output is a generator, run it
                    if err is None:
                        try:
                            if "generator" in agent_output:
                                g = agent_output["generator"]
                                async for out in g():
                                    # allow our generators to yield None
                                    if out is not None:
                                        resp["output"] = {
                                            "success": True,
                                            agent_output["prop_name"]: out,
                                        }

                                        overwrite_key = getattr(
                                            out, "overwrite_key", None
                                        )
                                        # if the out has an overwrite_key
                                        # update analysis data in db
                                        await analysis_data_manager.update(
                                            request_type,
                                            out,
                                            False,
                                            overwrite_key,
                                        )

                                        if overwrite_key:
                                            resp["overwrite_key"] = overwrite_key

                                        await websocket.send_json(resp)

                                # send done true
                                await websocket.send_json(
                                    {
                                        "done": True,
                                        "request_type": request_type,
                                        "analysis_id": analysis_id,
                                    }
                                )
                            else:
                                # if not a generator agent
                                resp["output"] = agent_output
                                resp["done"] = True
                                await websocket.send_json(resp)
                                await analysis_data_manager.update(
                                    request_type,
                                    agent_output,
                                    replace=request_type == "gen_analysis",
                                )
                        except Exception as e:
                            traceback.print_exc()
                            print(e)
                            await websocket.send_json(
                                {
                                    "done": True,
                                    "success": False,
                                    "error_message": str(e)[:300],
                                    "analysis_id": analysis_id,
                                }
                            )

                    else:
                        resp["error_message"] = err
                        await websocket.send_json(resp)

            except Exception as e:
                traceback.print_exc()
                print(e)
                await websocket.send(
                    {
                        "success": False,
                        "error_message": "Something went wrong. Please try again or contact us if this persists.",
                        "analysis_id": analysis_id,
                    }
                )
    except WebSocketDisconnect as e:
        # print("Disconnected. Error: ", e)
        # traceback.print_exc()
        manager.disconnect(websocket)
        await websocket.close()
    except Exception as e:
        # print("Disconnected. Error: ", e)
        # traceback.print_exc()
        # other reasons for disconnect, like websocket being closed or a timeout
        manager.disconnect(websocket)
        await websocket.close()


@app.get("/get_assets")
async def get_assets(path: str):
    try:
        return FileResponse(os.path.join(analysis_assets_dir, path))
    except Exception as e:
        print(e)
        traceback.print_exc()
        return {"success": False, "error_message": "Error getting assets"}


@app.get("/")
def read_root():
    return {"status": "ok"}


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/plan_and_execute")
async def plan_and_execute(request: Request):
    data = await request.json()
    question = data.get("question")
    dev = data.get("dev")
    api_key = data.get("api_key")
    assignment_understanding = data.get("assignment_understanding", "")
    executor = RESTExecutor(
        dfg_api_key=api_key,
        user_question=question,
        assignment_understanding=assignment_understanding,
        dev=dev,
    )
    steps, success = await executor.execute()
    return {"steps": steps, "success": success}
