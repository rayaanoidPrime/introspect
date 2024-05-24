import { message } from "antd";
import {
  createAnalysis,
  getAnalysis,
  getToolRunData,
} from "../../../../utils/utils";

// the name of the prop where the data is stored for each stage
const propNames = {
  clarify: "clarification_questions",
  gen_approaches: "approaches",
  gen_steps: "steps",
  gen_report: "report_sections",
};

const agentRequestTypes = ["clarify", "gen_steps"];

function AnalysisManager({
  analysisId,
  mainSocket,
  rerunSocket,
  onNewData = () => {},
  onReRunData = () => {},
  username,
  userEmail,
  createAnalysisRequestBody = {},
}) {
  let analysisData = null;
  let toolRunDataCache = {};
  let reRunningSteps = [];
  let wasNewAnalysisCreated = false;

  async function init() {
    if (analysisData) return;

    // get report data
    let fetchedAnalysisData = null;
    let newAnalysisCreated = false;
    const res = await getAnalysis(analysisId);
    if (!res.success) {
      // create a new analysis
      fetchedAnalysisData = await createAnalysis(
        username,
        analysisId,
        createAnalysisRequestBody
      );

      if (!fetchedAnalysisData.success || !fetchedAnalysisData.report_data) {
        // stop loading, throw error
        throw new Error(fetchedAnalysisData?.error_message);
      } else {
        fetchedAnalysisData = fetchedAnalysisData.report_data;
      }

      newAnalysisCreated = true;
    } else {
      fetchedAnalysisData = res.report_data;
    }

    // update the analysis data
    analysisData = fetchedAnalysisData;
    wasNewAnalysisCreated = newAnalysisCreated;
  }

  function getCurrentStage() {
    const lastExistingStage = Object.keys(analysisData)
      .filter((d) => agentRequestTypes.includes(d))
      .sort(
        (a, b) => agentRequestTypes.indexOf(a) - agentRequestTypes.indexOf(b)
      )
      .pop();

    if (
      lastExistingStage === "gen_steps" &&
      !analysisData?.gen_steps?.steps?.length
    ) {
      return "clarify";
    } else {
      return lastExistingStage;
    }
  }

  function getNextStage() {
    const currentStage = getCurrentStage();
    const nextStageIndex =
      (agentRequestTypes.indexOf(currentStage) + 1) % agentRequestTypes.length;

    return agentRequestTypes[nextStageIndex];
  }

  function submit(event, query, stageInput = {}, submitSourceStage = null) {
    // submits and updates the analysis data
    let newAnalysisData = {
      ...analysisData,
    };

    if (!mainSocket || !mainSocket?.isConnected()) {
      throw new Error("Not connected to servers. Trying to reconnect.");
    }

    // if the submitSourceStage is "clarify", we're getting the user input for the clarification questions, so the next thing the agent
    // has to do is "understand". so send the "understand" request_type to the agent.
    // if this is null, which is the first stage on the front end
    // then just submit the question to the agent. question string + "clarify" request_type
    // if we're just entering the question for the first time,
    // we need to send a "clarify" request. so let submitSOurceStage be null
    // indexOf returns -1 and -1 + 1 is 0 so we get "clarify" from the agentRequestTypes array
    const nextStage =
      agentRequestTypes[agentRequestTypes.indexOf(submitSourceStage) + 1];

    // if submitSourceStage is null, we're submitting the question for the first time
    // so set the user_question property in analysisData.report_data
    if (!submitSourceStage) {
      newAnalysisData["user_question"] = query;
    }

    console.log("nextStage", nextStage);

    const body = {
      ...stageInput,
      request_type: nextStage,
      report_id: analysisId,
      user_question: query,
      skip_intro: true,
      skip_conclusion: true,
      max_approaches: 1,
      skip_extra_approaches: true,
      skip_text_gen: true,
      user_email: userEmail,
      db_creds: null,
    };

    mainSocket.send(body);

    newAnalysisData[nextStage] = {
      [propNames[nextStage]]: [],
      success: true,
    };

    // if any of the stages includeing and after nextStage exists
    // remove all data from those stages (to mimic what happens on the backend)
    let idx = agentRequestTypes.indexOf(nextStage) + 1;
    if (idx < agentRequestTypes.length) {
      while (idx < agentRequestTypes.length) {
        delete newAnalysisData[agentRequestTypes[idx]];
        idx++;
      }
    }
    // empty the next stage data
    // deleting a prop removes a tab
    newAnalysisData[nextStage][propNames[nextStage]] = [];

    // update the analysis data
    analysisData = newAnalysisData;
  }

  function setMainSocket(newSocket) {
    mainSocket = newSocket;
  }

  function setReRunSocket(newSocket) {
    rerunSocket = newSocket;
  }

  function onMainSocketMessage(event) {
    let newAnalysisData = { ...analysisData };

    if (!event.data) {
      throw new Error(
        "Something went wrong. Please try again or contact us if this persists."
      );
    }

    const response = JSON.parse(event.data);

    // if the response's analysis_id isn't this analysisId, ignore
    if (response?.analysis_id !== analysisId) return;

    if (response?.error_message) {
      throw new Error(response.error_message);
    }

    const rType = response.request_type;
    const prop = propNames[rType];
    if (response.output && response.output.success && response.output[prop]) {
      if (!newAnalysisData[rType]) {
        analysisData = { ...newAnalysisData, [rType]: response.output };
        return;
      }

      // check if the response has an "overwrite_key"
      // if there's an overwrite_key provided,
      // then go through old data, and the new_data
      // if the overwrite_key is found in the old data, replace it with the elements that exist new_data with the same overwrite_key
      // if it's not found, just append the item to the end
      const overwrite_key = response.overwrite_key;
      const newToolRunDataCache = { ...toolRunDataCache };
      if (overwrite_key) {
        response.output[prop].forEach(async (res) => {
          const idx = newAnalysisData[rType][prop].findIndex(
            (d) => d[overwrite_key] === res[overwrite_key]
          );

          if (idx > -1) {
            newAnalysisData[rType][prop][idx] = res;
            if (rType === "gen_steps" && res.tool_run_id) {
              // if this is gen_steps, we also need to update the latest tool run data
              // update it in the cache
              const updatedData = await getToolRunData(res.tool_run_id);
              if (updatedData.success) {
                newToolRunDataCache[updatedData.tool_run_id] = updatedData;
              }
            }
          } else {
            newAnalysisData[rType][prop].push(res);
          }
        });
      } else {
        newAnalysisData[rType][prop] = newAnalysisData[rType][prop].concat(
          response.output[prop]
        );
      }

      analysisData = newAnalysisData;
      toolRunDataCache = newToolRunDataCache;
    }

    if (onNewData && typeof onNewData === "function") {
      onNewData(response);
    }
  }

  function initiateReRun(toolRunId, preRunActions) {
    if (!rerunSocket.isConnected()) {
      throw new Error("Not connected to servers. Trying to reconnect.");
    }

    const newAnalysisData = { ...analysisData };

    if (
      preRunActions &&
      preRunActions?.action === "add_step" &&
      preRunActions?.new_step
    ) {
      // add the new step to analysisData
      newAnalysisData.gen_steps.steps.push(preRunActions.new_step);
      // update the analysis data
      analysisData = newAnalysisData;
    }

    if (rerunSocket && rerunSocket.send) {
      rerunSocket.send({
        tool_run_id: toolRunId,
        analysis_id: analysisId,
      });
    }
  }

  async function onReRunSocketMessage(event) {
    const response = JSON.parse(event.data);

    if (response?.analysis_id !== analysisId) return;
    // re run messages can be of two types:
    // 1. which step is GOING TO BE RUN. this won't just be the step that was asked to be re run by the user.
    // this can also be the step's parents and it's children.
    // 2. the result of a re run of a step
    if (response.pre_tool_run_message) {
      // means this is just a notification that this step is going to be re run
      // so add this step to rerunning steps
      // this has better UX: lets us move and click around the dag on
      // any node but the currently rerunning step
      console.log("step re running started: ", response.pre_tool_run_message);
      const newReRunningSteps = reRunningSteps.slice();

      newReRunningSteps.push({
        tool_run_id: response.pre_tool_run_message,
        timeout: setTimeout(() => {
          message.error(`Rerun took longer than expected and was aborted.`);

          reRunningSteps = reRunningSteps.filter(
            (d) => d.tool_run_id !== response.pre_tool_run_message
          );
        }, 40000),
        clearTimeout: function () {
          // function to clear the above timeout.
          clearTimeout(this.timeout);
        },
      });

      reRunningSteps = newReRunningSteps;
    }

    console.log("re run result");
    console.log(response);

    // remove the tool run id from rerunning steps and clear it's timeout
    reRunningSteps = reRunningSteps.filter((d) => {
      if (d.tool_run_id === response.tool_run_id) {
        d.clearTimeout();
        return false;
      }
      return true;
    });

    if (!response.success) {
      throw new Error(response?.error_message);
    }

    let newToolRunDataCache = { ...toolRunDataCache };
    if (response.success) {
      newToolRunDataCache[response.tool_run_id] = Object.assign({}, response);
    }

    // // if this re run has an error_message (or if it doesn't), update the analysisSteps
    const newAnalysisData = { ...analysisData };

    const newSteps = newAnalysisData.gen_steps.steps.slice();

    const idx = newSteps.findIndex((d) => d.tool_run_id === res.tool_run_id);
    if (idx > -1) {
      newSteps[idx] = {
        ...newSteps[idx],
        error_message: res?.tool_run_data?.error_message,
      };
    }

    newAnalysisData.gen_steps.steps = newSteps;

    analysisData = newAnalysisData;

    toolRunDataCache = newToolRunDataCache;

    if (onReRunData && typeof onReRunData === "function") {
      onReRunData(response);
    }
  }

  let mainListenerIdx = null;
  let rerunListenerIdx = null;

  function addEventListeners() {
    mainListenerIdx = mainSocket.addEventListener(
      "message",
      onMainSocketMessage
    );
    rerunListenerIdx = rerunSocket.addEventListener(
      "message",
      onReRunSocketMessage
    );
  }

  function removeEventListeners() {
    mainSocket.removeEventListener(
      "message",
      onMainSocketMessage,
      mainListenerIdx
    );
    rerunSocket.removeEventListener(
      "message",
      onReRunSocketMessage,
      rerunListenerIdx
    );
  }

  return {
    init,
    get wasNewAnalysisCreated() {
      return wasNewAnalysisCreated;
    },
    set wasNewAnalysisCreated(val) {
      wasNewAnalysisCreated = val;
    },
    get analysisData() {
      return Object.assign({}, analysisData);
    },
    set analysisData(val) {
      analysisData = val;
    },
    get currentStage() {
      return getCurrentStage();
    },
    get nextStage() {
      return getNextStage();
    },
    get toolRunDataCache() {
      return Object.assign({}, toolRunDataCache);
    },
    set toolRunDataCache(val) {
      toolRunDataCache = val;
    },
    get reRunningSteps() {
      return Object.assign({}, reRunningSteps);
    },
    set reRunningSteps(val) {
      reRunningSteps = val;
    },
    addEventListeners,
    removeEventListeners,
    submit,
    initiateReRun,
    setMainSocket,
    setReRunSocket,
  };
}

export default AnalysisManager;
