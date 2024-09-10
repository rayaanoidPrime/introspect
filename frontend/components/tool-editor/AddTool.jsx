import { addTool, arrayOfObjectsToObject } from "$utils/utils";
import { useCallback, useContext, useMemo, useState } from "react";
import ToolPlayground from "./ToolPlayground";
import { SparklesIcon } from "@heroicons/react/20/solid";
import { DefineTool } from "./DefineTool";

import { twMerge } from "tailwind-merge";
import {
  MessageManagerContext,
  Modal,
  Toggle,
  Sidebar,
  Input,
  Button,
  SpinningLoader,
  Tabs,
} from "@defogdotai/agents-ui-components/core-ui";

import { parseData } from "@defogdotai/agents-ui-components/agent";
import NewToolCodeEditor from "./NewToolCodeEditor";
import setupBaseUrl from "$utils/setupBaseUrl";

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

  const tabs = useMemo(() => {
    return [
      {
        name: "Details",
        content: (
          <div className="p-4 bg-gray-50 sm:block">
            {input}
            <DefineTool
              disabled={loading}
              toolName={toolName}
              handleChange={handleChange}
              toolDocString={tool.description}
            />
            {!tool.code ? (
              <Button
                className={"text-sm border w-60"}
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
                    Generating
                  </div>
                ) : (
                  "Generate"
                )}
              </Button>
            ) : (
              <Button className={"px-2 text-sm"} onClick={tryAddTool}>
                Save
              </Button>
            )}
          </div>
        ),
      },
      {
        name: "Code",
        headerClassNames: !tool.code
          ? "text-gray-300 hover:bg-white pointer-events-none "
          : "",
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
        name: "Playground",
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
    ];
  }, [tool, loading, testingResults, input]);

  return (
    <>
      <div
        className="tool rounded mr-3 mb-3  bg-blue-50 border border-blue-400 flex items-center p-3 cursor-pointer hover:shadow-lg"
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
        footer={null}
        className={"w-8/12 h-96"}
        rootClassNames="h-96"
      >
        <h1 className="text-lg font-bold mb-4">Add a custom tool</h1>

        <div className="grow relative p-2">
          <Tabs tabs={tabs} />
        </div>
      </Modal>
    </>
  );
}
