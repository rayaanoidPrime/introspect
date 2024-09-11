import { addTool, arrayOfObjectsToObject } from "$utils/utils";
import { useCallback, useContext, useMemo, useRef, useState } from "react";
import ToolPlayground from "./ToolPlayground";
import { DefineTool } from "./DefineTool";

import {
  MessageManagerContext,
  Modal,
  Input,
  Button,
  SpinningLoader,
} from "@defogdotai/agents-ui-components/core-ui";

import NewToolCodeEditor from "./NewToolCodeEditor";
import setupBaseUrl from "$utils/setupBaseUrl";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/20/solid";
import { twMerge } from "tailwind-merge";
import { TestDrive } from "$components/TestDrive";
import { AnalysisAgent, Setup } from "@defogdotai/agents-ui-components/agent";
import { v4 } from "uuid";

const createToolText = "Create tool";

export function AddTool({
  apiEndpoint,
  onAddTool = (...args) => {},
  apiKeyNames = [],
}) {
  const generateToolCodeEndpoint = setupBaseUrl(
    "http",
    "generate_and_test_new_tool"
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [tool, setTool] = useState({
    code: "",
    description: "",
    function_name: "",
    input_metadata: {},
    output_metadata: [],
    tool_name: "",
    key_name: apiKeyNames.length ? apiKeyNames[0] : "",
    test_question: "",
  });

  const analysisId = useRef(v4());

  const toolName = tool.tool_name;
  const toolDocString = tool.description;
  const generatedCode = tool.code;
  const selectedKeyName = tool.key_name;

  const messageManager = useContext(MessageManagerContext);

  const [loading, setLoading] = useState(false);
  const token = useRef(localStorage.getItem("defogToken"));

  const [currentStep, setCurrentStep] = useState(0);

  const changeStep = (targetStepIdx) => {
    if (targetStepIdx > 0 && (!toolName || !toolDocString || !tool.code)) {
      messageManager.info("Please create the tool first");
      return;
    }

    setCurrentStep(targetStepIdx);
  };

  const createToolBtn = useMemo(() => {
    return (
      <Button
        disabled={!toolName || !toolDocString || loading}
        className="bg-blue-500 hover:bg-blue-600 text-white hover:text-white"
        onClick={() => {
          if (!toolName || !toolDocString) {
            messageManager.error(
              "Please fill in the tool name and description"
            );
            return;
          }

          handleSubmit();
        }}
      >
        {loading ? (
          <div>
            <SpinningLoader classNames="text-gray-300" />
            Creating your tool
          </div>
        ) : (
          createToolText
        )}
      </Button>
    );
  }, [currentStep, toolName, toolDocString, loading]);

  const footer = useMemo(
    () => (
      <div className="flex flex-row items-center">
        <div className="grow">{currentStep > 0 ? null : createToolBtn}</div>
        <div className="flex flex-row self-end items-center">
          <ChevronLeftIcon
            // onClick={prev}
            className={twMerge(
              "w-5 h-5 text-gray-400 cursor-pointer hover:text-gray-800",
              (currentStep === 0 || !toolDocString || !toolName) &&
                "cursor-not-allowed hover:text-gray-300"
            )}
          />
          <ChevronRightIcon
            // onClick={next}
            className={twMerge(
              "w-5 h-5 text-gray-400 cursor-pointer hover:text-gray-800",
              (!toolDocString ||
                !toolName ||
                (currentStep === 1 && !tool.code)) &&
                "cursor-not-allowed hover:text-gray-300"
            )}
          />
        </div>
      </div>
    ),
    [currentStep, toolName, toolDocString, loading]
  );

  const handleChange = useCallback(
    (prop, val) => {
      try {
        // if prop doesn't exists on the tool, show error
        if (!tool.hasOwnProperty(prop)) {
          throw new Error(`Tool does not have property ${prop}`);
        }
        setTool((t) => ({ ...t, [prop]: val }));
      } catch (e) {
        messageManager.error(e.message);
      }
    },
    [tool, setTool, messageManager]
  );

  const tryAddTool = async () => {
    setLoading(true);
    try {
      const res = await addTool(tool);

      if (res.success) {
        messageManager.success("Tool added successfully");
        onAddTool(tool);
      } else {
        messageManager.error(
          "Failed to submit tool" + (res.error_message || "")
        );
      }
    } catch (e) {
      console.error(e);
      messageManager.error("Failed to submit tool" + e.message);
    } finally {
      setLoading(false);
    }
  };

  // fixToolRequest is true when the user is trying to fix the tool
  // if they re click the create tool button in the first tab, we need to re generate it from scratch
  const handleSubmit = async (userQuestion = null, fixToolRequest = false) => {
    setLoading(true);
    // if this is first submit
    try {
      const response = await fetch(generateToolCodeEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tool_name: toolName,
          tool_description: toolDocString,
          user_question: userQuestion,
          current_code: fixToolRequest ? generatedCode || null : null,
          key_name: selectedKeyName || apiKeyNames[0],
        }),
      }).then((res) => res.json());

      if (!response.success) {
        throw new Error(
          "Failed to generate tool code. " + (response.error_message || "")
        );
      }

      const newTool = { ...tool };

      newTool.code = response.generated_code;
      newTool.function_name = response.function_name;
      newTool.test_question = response.test_question;
      newTool.input_metadata = response.input_metadata;
      newTool.output_metadata = response.output_metadata;

      setTool(newTool);
      setCurrentStep(1);
    } catch (error) {
      messageManager.error(error);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  console.log(tool);

  const input = useMemo(() => {
    return (
      tool.code && (
        <Input
          placeholder="What should we change?"
          disabled={loading}
          rootClassNames="mb-4"
          onPressEnter={(ev) => {
            if (!ev.target.value) {
              messageManager.error("Can't be blank!");
              return;
            }
            handleSubmit(ev.target.value);
          }}
        />
      )
    );
  }, [tool]);

  const steps = useMemo(() => {
    return [
      {
        title: "Describe your tool",
        content: (
          <div className="sm:block min-h-80">
            <p className="text-sm my-4 text-gray-500">
              The model needs this information to generate your tool.
            </p>
            <DefineTool
              disabled={loading}
              toolName={toolName}
              handleChange={handleChange}
              toolDocString={tool.description}
              apiKeyNames={apiKeyNames}
              hideApiKeyNames={false}
            />
            {toolDocString && toolName && createToolBtn}
          </div>
        ),
      },
      {
        title: "Test",
        content: tool.code ? (
          <>
            <div className="text-sm my-4 text-gray-500 space-y-1">
              <p>
                We have generated a tool as per the name and description, and
                have started an analysis showing your tool's usage.
              </p>
              <p>
                Please check if the workflow, inputs and outputs are as desired.
                You can also run more analysis with a different question.
              </p>
              <p>
                You can also edit the tool's code on the left, and run a new
                analysis to see your changes reflected. Note that older analyses
                will not be affected until you re run them.
              </p>
              <p>
                If you changed your mind, go back to the describe step and
                change the tool's name or description and click "
                {createToolText}" again.
              </p>
              <p>
                When you're happy, click Save to add the tool to your tool
                library.
              </p>
            </div>
            <div className="divide-x mb-8 md:max-h-96 flex flex-row flex-wrap md:flex-nowrap">
              <div className="w-full md:w-5/12 overflow-scroll relative">
                <p className="text-sm font-bold text-gray-500 bg-gray-100 px-2 py-1 sticky top-0 z-10">
                  Edit tool code
                </p>
                <NewToolCodeEditor
                  className="w-full"
                  editable={!loading}
                  toolCode={tool.code}
                  onChange={(v) => handleChange("code", v)}
                />
                <div className="absolute left-0 right-0 mx-4 bottom-10">
                  <Input placeholder="What should we change?"></Input>
                </div>
              </div>
              <div className="w-full mt-8 md:mt-0 md:w-7/12 overflow-scroll px-2 bg-gray-100">
                <p className="text-sm font-bold text-gray-500 py-1 bg-gray-100 sticky top-0 z-10">
                  Test it out
                </p>
                <Setup
                  token={token.current}
                  apiEndpoint={apiEndpoint}
                  // these are the ones that will be shown for new csvs uploaded
                  showAnalysisUnderstanding={true}
                  disableMessages={false}
                >
                  <AnalysisAgent
                    analysisId={analysisId.current}
                    keyName={selectedKeyName}
                    plannerPromptSuffix={` Make sure to use the \`${toolName}\` tool in the analysis.`}
                    extraTools={[
                      {
                        code: tool.code,
                        tool_description: tool.description,
                        function_name: tool.function_name,
                        input_metadata: tool.input_metadata,
                        output_metadata: tool.output_metadata,
                      },
                    ]}
                    createAnalysisRequestBody={{
                      initialisation_details: {
                        user_question: tool.test_question,
                      },
                    }}
                    initiateAutoSubmit={true}
                  />
                </Setup>
              </div>
            </div>
            <Button
              className="mt-8 px-3 text-white bg-blue-500 border-0 hover:bg-blue-600 hover:text-white"
              onClick={tryAddTool}
            >
              Save your tool
            </Button>
          </>
        ) : (
          <div className="min-h-80 flex items-center justify-center">
            {toolDocString && toolName ? (
              createToolBtn
            ) : (
              <p className="text-sm text-gray-400">
                Please complete the previous step
              </p>
            )}
          </div>
        ),
      },
    ];
  }, [tool, loading, input]);

  console.log(tool);

  const status = useMemo(() => {
    if (currentStep === 0 || currentStep == 1) {
      return "process";
    } else {
      return tool.code && toolName && toolDocString ? "process" : "error";
    }
  }, [currentStep, tool, loading, toolDocString, toolName]);

  return (
    <>
      <div
        className="rounded mr-3 mb-3  bg-blue-50 border border-blue-400 flex items-center p-3 cursor-pointer hover:shadow-lg"
        onClick={() => setModalOpen(true)}
      >
        <div className="flex items-center  justify-center text-blue-500">
          <span className="">
            <p className="m-0">+ New tool</p>
          </span>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onCancel={(ev) => {
          setModalOpen(false);
        }}
        footer={false}
      >
        <h1 className="text-lg font-bold mb-4">Add a custom tool</h1>

        <div className="grow relative p-2">
          <div className="relative">
            {/* dividing line */}
            <div className="h-[1px] w-full bg-gray-300 absolute top-1/2 z-[2]"></div>
            <div className="z-[3] flex flex-row relative">
              {steps.map((step, idx) => {
                const isActive = idx === currentStep;

                return (
                  <div
                    key={idx}
                    className={twMerge(
                      "grow group cursor-pointer",
                      idx === steps.length - 1 ? "bg-white" : ""
                    )}
                    onClick={() => changeStep(idx)}
                  >
                    <div
                      className={twMerge(
                        "px-4 inline-block bg-white relative justify-self-center",
                        idx === 0 ? "pl-0" : ""
                      )}
                    >
                      <span
                        className={twMerge(
                          "text-sm p-3 rounded-[50%] border text-gray-400 border-gray-200 bg-gray-100 inline-flex items-center justify-center h-4 w-4 mr-2",
                          isActive
                            ? "bg-blue-100 text-blue-500"
                            : "group-hover:bg-gray-200"
                        )}
                      >
                        {idx + 1}
                      </span>
                      <span
                        className={isActive ? "text-blue-500" : "text-gray-400"}
                      >
                        {step.title}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4">{steps[currentStep].content}</div>
        </div>
      </Modal>
    </>
  );
}
