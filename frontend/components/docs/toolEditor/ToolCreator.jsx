import { useCallback, useContext, useState } from "react";
import DefineTool from "./DefineTool";
import { Button } from "$components/tailwind/Button";
import { twMerge } from "tailwind-merge";
import { Modal, message } from "antd";
import setupBaseUrl from "$utils/setupBaseUrl";
import SpinningLoader from "$components/icons/SpinningLoader";
import { addTool, arrayOfObjectsToObject, parseData } from "$utils/utils";
import { ToolFlow } from "./ToolFlow";
import { Input } from "$components/tailwind/Input";
import { MessageManagerContext } from "$components/tailwind/Message";

const generateToolCodeEndpoint = setupBaseUrl("http", "generate_tool_code");

export function ToolCreator({
  tool = {
    code: "",
    description: "",
    function_name: "",
    input_metadata: {},
    output_metadata: [],
    tool_name: "",
    toolbox: "",
  },
  onAddTool = (...args) => {},
}) {
  const [toolName, setToolName] = useState(tool.tool_name);
  const [toolDocString, setToolDocString] = useState(tool.description);
  const [loading, setLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState();
  const [functionName, setFunctionName] = useState(tool.function_name);
  const [testingResults, setTestingResults] = useState();
  const [confirmModal, setConfirmModal] = useState(false);
  const messageManager = useContext(MessageManagerContext);

  const handleSubmit = async (userQuestion = null) => {
    setLoading(true);
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

      console.log(response);

      setGeneratedCode(response.generated_code);
      setFunctionName(response.function_name);
      // go through testing inputs and outputs, and parse all csvs
      response.testing_results.inputs.forEach((input) => {
        // input type contains DataFrame and is string
        if (input.type.indexOf("DataFrame") !== -1) {
          input.parsed = parseData(input.value);
        }
      });

      // go through outputs, and parse the data property on all outputs
      response.testing_results.outputs.forEach((output) => {
        // output type contains DataFrame and is string
        if (output.data) {
          output.parsed = parseData(output.data);
        }
      });

      console.log(response.testing_results);
      setTestingResults(response.testing_results);
    } catch (error) {
      messageManager.error(error);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFinalSubmit = useCallback(async () => {
    setLoading(true);
    try {
      const payload = {
        tool_name: toolName,
        function_name: functionName,
        description: toolDocString,
        code: generatedCode,
        // only get the required props
        input_metadata: arrayOfObjectsToObject(testingResults.inputs, "name", [
          "name",
          "description",
          "type",
        ]),
        // outputs are always dataframes
        output_metadata: testingResults.outputs.map((d) => ({
          name: "output_df",
          description: "pandas df",
          type: "pandas.core.frame.DataFrame",
        })),
        toolbox: tool.toolbox,
      };

      const res = await addTool(payload);

      if (res.success) {
        messageManager.success("Tool added successfully");
        onAddTool(payload);
        setConfirmModal(false);
      } else {
        messageManager.error("Failed to submit tool" + res.error_message);
      }
    } catch (e) {
      console.error(e);
      messageManager.error("Failed to submit tool" + e.message);
    } finally {
      setLoading(false);
    }
  }, [
    testingResults,
    toolDocString,
    toolName,
    functionName,
    generatedCode,
    tool.toolbox,
    onAddTool,
    messageManager,
  ]);

  return (
    <>
      {!generatedCode && !testingResults && !loading && (
        <>
          <div className="w-8/12 h-5/6 *:font-mono">
            <DefineTool
              toolName={toolName}
              setToolName={setToolName}
              toolDocString={toolDocString}
              setToolDocString={setToolDocString}
            />
          </div>
          <Button
            className={twMerge("p-2 mt-6 text-sm border")}
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
              <>
                <SpinningLoader fill="text-gray-300" />
                Generating
              </>
            ) : (
              "Generate"
            )}
          </Button>
        </>
      )}

      {testingResults && !loading && (
        <ToolFlow
          toolName={toolName}
          testingResults={testingResults}
          code={generatedCode}
        />
      )}

      {loading && (
        <div className="flex flex-row items-center h-80vh justify-center">
          <SpinningLoader fill="text-gray-400" />
          Generating
        </div>
      )}

      {testingResults && (
        <>
          <Input
            placeholder="What should we change?"
            inputClassName={twMerge(
              "bg-white absolute mx-auto left-0 right-0 border-2 border-gray-400 bottom-0 p-2 rounded-lg w-full lg:w-6/12 mx-auto h-16 shadow-sm hover:border-blue-500 focus:border-blue-500",
              loading ? "hover:border-gray-400 focus:border-gray-400" : ""
            )}
            disabled={loading}
            onPressEnter={(ev) => {
              if (!ev.target.value) {
                messageManager.error("Can't be blank!");
                return;
              }
              handleSubmit(ev.target.value);
            }}
          />
          <div className="flex flex-row justify-end absolute bottom-8 right-10">
            <Button
              disabled={loading}
              className="px-2 py-2 text-md"
              onClick={() => setConfirmModal(true)}
            >
              Add
            </Button>
          </div>
        </>
      )}

      {confirmModal && (
        <Modal
          open={confirmModal}
          onCancel={() => setConfirmModal(false)}
          confirmLoading={loading}
          onOk={async () => {
            // submit tool
            handleFinalSubmit();
          }}
          title="Submit your Tool"
        >
          <h1>
            Confirm that the description and name reflect what the tool does
          </h1>
          <DefineTool
            toolName={toolName}
            setToolName={setToolName}
            toolDocString={toolDocString}
            setToolDocString={setToolDocString}
          />
        </Modal>
      )}
    </>
  );
}
