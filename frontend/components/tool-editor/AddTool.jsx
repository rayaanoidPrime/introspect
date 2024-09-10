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
  Tabs,
} from "@defogdotai/agents-ui-components/core-ui";

import { parseData } from "@defogdotai/agents-ui-components/agent";
import NewToolCodeEditor from "./NewToolCodeEditor";
import setupBaseUrl from "$utils/setupBaseUrl";
import { Steps } from "antd";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/20/solid";
import { twMerge } from "tailwind-merge";

export function AddTool({ apiEndpoint, onAddTool = (...args) => {} }) {
  const generateToolCodeEndpoint = setupBaseUrl("http", "generate_tool_code");

  const [modalOpen, setModalOpen] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [testingResults, setTestingResults] = useState(null);
  const [tool, setTool] = useState({
    code: "",
    description: "",
    function_name: "",
    input_metadata: {},
    output_metadata: [],
    tool_name: "",
  });

  const toolName = tool.tool_name;
  const toolDocString = tool.description;
  const generatedCode = tool.code;

  const messageManager = useContext(MessageManagerContext);

  const [loading, setLoading] = useState(false);

  const [currentStep, setCurrentStep] = useState(0);

  const next = () => {
    if (currentStep === 0 && (!toolName || !toolDocString)) {
      messageManager.info("Please fill in the tool name and description");
      return;
    }
    if (currentStep === 1 && (!tool.code || !toolName || !toolDocString)) {
      messageManager.info("Please create the tool first");
      return;
    }
    setCurrentStep((d) => Math.min(steps.length - 1, d + 1));
  };

  const prev = () => {
    setCurrentStep((d) => Math.max(0, d - 1));
  };

  const generateToolBtn = useMemo(() => {
    return (
      <Button
        disabled={!toolName || !toolDocString || loading}
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
          "Create tool"
        )}
      </Button>
    );
  }, [currentStep, toolName, toolDocString, loading]);

  const footer = useMemo(
    () => (
      <div className="flex flex-row items-center">
        <div className="grow">{currentStep > 0 ? null : generateToolBtn}</div>
        <div className="flex flex-row self-end items-center">
          <ChevronLeftIcon
            onClick={prev}
            className={twMerge(
              "w-5 h-5 text-gray-400 cursor-pointer hover:text-gray-800",
              (currentStep === 0 || !toolDocString || !toolName) &&
                "cursor-not-allowed hover:text-gray-300"
            )}
          />
          <ChevronRightIcon
            onClick={next}
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
        messageManager.error("Failed to submit tool" + res.error_message);
      }
    } catch (e) {
      console.error(e);
      messageManager.error("Failed to submit tool" + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (userQuestion = null) => {
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
          current_code: generatedCode || null,
        }),
      }).then((res) => res.json());

      if (!response.success) {
        throw new Error(
          "Failed to generate tool code. " + response.error_message
        );
      }

      const newTool = { ...tool };

      newTool.code = response.generated_code;
      newTool.function_name = response.function_name;

      const newTestingResults = response.testing_results;

      newTestingResults.generatedCode = response.generated_code;

      newTool.input_metadata = arrayOfObjectsToObject(
        newTestingResults.inputs,
        "name",
        ["name", "description", "type"]
      );

      newTool.output_metadata = newTestingResults.outputs.map((d) => ({
        name: "output_df",
        description: "pandas df",
        type: "pandas.core.frame.DataFrame",
      }));

      // go through testing inputs and outputs, and parse all csvs
      newTestingResults.inputs.forEach((input) => {
        // input type contains DataFrame and is string
        if (input.type.indexOf("DataFrame") !== -1) {
          input.parsed = parseData(input.value);
        }
      });

      // go through outputs, and parse the data property on all outputs
      newTestingResults.outputs.forEach((output) => {
        // output type contains DataFrame and is string
        if (output.data) {
          output.parsed = parseData(output.data);
        }
      });

      setTestingResults(newTestingResults);
      setTool(newTool);
      setCurrentStep(1);
    } catch (error) {
      messageManager.error(error);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

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
            <p className="text-xs my-4 text-gray-500">
              Describe what your tool does. This will help us generate the
              tool's code.
            </p>
            <DefineTool
              disabled={loading}
              toolName={toolName}
              handleChange={handleChange}
              toolDocString={tool.description}
            />
          </div>
        ),
      },
      {
        title: "Test",
        content: tool.code ? (
          <>
            <p className="text-xs my-4 text-gray-500">
              Test your tool. Edit the tool's code.
            </p>
            <Tabs
              rootClassNames="min-h-80"
              tabs={[
                {
                  name: "Code",
                  headerClassNames: "w-4",
                  content: tool.code ? (
                    <>
                      {input}
                      <NewToolCodeEditor
                        className="w-full"
                        editable={!loading}
                        toolCode={tool.code}
                        onChange={(v) => handleChange("code", v)}
                      />
                    </>
                  ) : (
                    <></>
                  ),
                },
                {
                  name: "Sample",
                  headerClassNames: !tool.code
                    ? "text-gray-300 hover:bg-white pointer-events-none "
                    : "",
                  content: tool.code ? (
                    <>
                      {input}
                      <ToolPlayground
                        loading={loading}
                        tool={tool}
                        handleChange={handleChange}
                        testingResults={testingResults}
                      />
                    </>
                  ) : (
                    <></>
                  ),
                },
              ]}
            />
          </>
        ) : (
          <div className="min-h-80 flex items-center justify-center">
            {toolDocString && toolName ? (
              generateToolBtn
            ) : (
              <p className="text-sm text-gray-400">
                Please complete the previous step
              </p>
            )}
          </div>
        ),
      },
      {
        title: "Save",
        content: (
          <div className=" min-h-80 flex items-center justify-center">
            {toolDocString && toolName && tool.code ? (
              <Button onClick={tryAddTool}>Save</Button>
            ) : (
              <p className="text-sm text-gray-400">
                Please complete the previous steps
              </p>
            )}
          </div>
        ),
      },
    ];
  }, [tool, loading, testingResults, input]);

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
        footer={footer}
      >
        <h1 className="text-lg font-bold mb-4">Add a custom tool</h1>

        <div className="grow relative p-2">
          <Steps
            items={steps}
            current={currentStep}
            status={status}
            size="small"
          />
          <div className="mt-4">{steps[currentStep].content}</div>
        </div>
      </Modal>
    </>
  );
}
