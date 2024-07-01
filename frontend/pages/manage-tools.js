import { Button } from "$tailwind/Button";
import Meta from "$components/common/Meta";
import Scaffolding from "$components/common/Scaffolding";
import { toolboxDisplayNames } from "$utils/utils";
import { useContext, useEffect, useMemo, useState } from "react";
import AddTool from "$components/docs/toolEditor/AddTool";
import setupBaseUrl from "$utils/setupBaseUrl";
import { MessageManagerContext } from "$components/tailwind/Message";
import Modal from "$components/tailwind/Modal";
import DefineTool from "$components/docs/toolEditor/DefineTool";

const toggleDisableToolEndpoint = setupBaseUrl("http", "toggle_disable_tool");
const deleteToolEndpoint = setupBaseUrl("http", "delete_tool");

export default function ManageTools() {
  // group tools by "toolbox"
  const [tools, setTools] = useState(null);

  const messageManager = useContext(MessageManagerContext);

  const groupedTools = useMemo(() => {
    if (tools) {
      // group tools by toolbox
      const grouped = {};
      Object.values(tools).forEach((tool) => {
        if (!grouped[tool.toolbox]) {
          grouped[tool.toolbox] = {};
        }
        grouped[tool.toolbox][tool.function_name] = tool;
      });
      return grouped;
    }
    return null;
  }, [tools]);

  const [selectedTool, setSelectedTool] = useState(null);

  const onAddTool = (toolDict) => {
    setTools({
      ...tools,
      [toolDict.function_name]: toolDict,
    });
  };

  useEffect(() => {
    async function fetchTools() {
      const response = await fetch(setupBaseUrl("http", "get_user_tools"), {
        method: "POST",
      });
      const data = (await response.json())["tools"];
      setTools(data);
    }

    fetchTools();
  }, []);

  const columns = ["tool_name", "toolbox", "function_name", "disabled"];

  return (
    <>
      <Meta />
      <Scaffolding id={"add-tools"} userType={"admin"}>
        {!tools || !groupedTools ? (
          <div>Fetching your tools...</div>
        ) : (
          <>
            <Modal
              key={selectedTool}
              open={selectedTool ? true : false}
              onCancel={(ev) => {
                setSelectedTool(null);
              }}
              className={"w-10/12 overflow-scroll h-[90%]"}
            >
              {selectedTool ? (
                <>
                  <div className="flex border-b bg-gray-100 p-2 rounded-t-md">
                    <div className="grow">
                      <h1 className="text-lg mb-2">
                        {tools[selectedTool].tool_name}
                      </h1>
                      <div className="tool-tags">
                        {tools[selectedTool].cannot_disable ? (
                          <span className="rounded-md font-mono mr-3 text-gray-400 py-1 text-xs">
                            Cannot disable
                          </span>
                        ) : tools[selectedTool].disabled ? (
                          <span className="rounded-md font-mono mr-3 text-gray-400 py-1 text-xs">
                            Disabled
                          </span>
                        ) : (
                          <span className="rounded-md font-mono mr-3 text-teal-500 py-1 text-xs">
                            Enabled
                          </span>
                        )}
                        {tools[selectedTool].cannot_delete && (
                          <span className="rounded-md font-mono mr-3 text-gray-400 py-1 text-xs">
                            Cannot delete
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="tool-actions flex flex-col gap-2 self-center">
                      {!tools[selectedTool].cannot_disable && (
                        <Button
                          className="font-mono bg-gray-50 border border-gray-200 text-gray-500 hover:bg-blue-500 hover:text-white"
                          onClick={async () => {
                            const goalStatus = tools[selectedTool].disabled
                              ? "enabled"
                              : "disabled";
                            const res = await fetch(toggleDisableToolEndpoint, {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify({
                                function_name:
                                  tools[selectedTool].function_name,
                              }),
                            }).then((d) => d.json());

                            if (res.success) {
                              messageManager.success(
                                `Tool ${selectedTool} is now ${goalStatus}`
                              );
                              setTools((prevTools) => {
                                const newTools = { ...prevTools };
                                newTools[selectedTool].disabled =
                                  !newTools[selectedTool].disabled;

                                return newTools;
                              });
                            } else {
                              messageManager.error(
                                `Failed to ${goalStatus.slice(0, -1)} tool. ${
                                  res.error_message
                                    ? "Error: " + res.error_message
                                    : ""
                                }`
                              );
                            }
                          }}
                        >
                          {tools[selectedTool].disabled ? "Enable" : "Disable"}
                        </Button>
                      )}
                      {!tools[selectedTool].cannot_delete && (
                        <Button
                          className="font-mono bg-gray-50 border border-gray-200 text-gray-500 hover:bg-rose-500 hover:text-white"
                          onClick={async () => {
                            const res = await fetch(deleteToolEndpoint, {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify({
                                function_name:
                                  tools[selectedTool].function_name,
                              }),
                            }).then((d) => d.json());

                            if (res.success) {
                              messageManager.success(
                                `Tool ${selectedTool} is now deleted`
                              );
                              setTools((prevTools) => {
                                const newTools = { ...prevTools };
                                delete newTools[selectedTool];

                                return newTools;
                              });
                              setSelectedTool(null);
                            } else {
                              messageManager.error(
                                `Failed to delete tool. ${
                                  res.error_message
                                    ? "Error: " + res.error_message
                                    : ""
                                }`
                              );
                            }
                          }}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 p-2">
                    <DefineTool
                      toolName={tools[selectedTool].tool_name}
                      toolDocString={tools[selectedTool].description}
                      toolCode={tools[selectedTool].code}
                    />
                  </div>
                </>
              ) : (
                "Please select a tool"
              )}
            </Modal>

            <div>
              <h1 className="text-2xl font-bold mb-4">Tool management</h1>
              <div className="tool-list">
                {Object.keys(groupedTools).map((toolbox) => {
                  const columns = [
                    {
                      title: "tool_name",
                      dataIndex: 0,
                    },
                    { dataIndex: 1, title: "function_name" },
                  ];

                  const rows = Object.keys(groupedTools[toolbox]).map(
                    (tool) => [tools[tool].tool_name, tools[tool].function_name]
                  );

                  return (
                    <div key={toolbox}>
                      <h1 className="text-md font-bold mb-4">
                        {toolboxDisplayNames[toolbox]}
                      </h1>
                      <div className="toolbox flex flex-wrap flex-row mb-10">
                        {Object.keys(groupedTools[toolbox]).map((tool) => {
                          return (
                            <div
                              className="tool rounded-md mr-3 mb-3 bg-gray-50 border border-gray-400 p-3 w-60 cursor-pointer hover:shadow-md"
                              key={tool}
                              onClick={() => setSelectedTool(tool)}
                            >
                              <div className="tool-name text-md">
                                {tools[tool].tool_name}
                              </div>
                            </div>
                          );
                        })}

                        <AddTool toolbox={toolbox} onAddTool={onAddTool} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </Scaffolding>
    </>
  );
}
