import { Modal } from "antd";
import Meta from "../components/common/Meta";
import Scaffolding from "../components/common/Scaffolding";
import { toolsMetadata } from "../utils/tools_metadata";
import {
  easyToolInputTypes,
  toolDisplayNames,
  toolboxDisplayNames,
} from "../utils/utils";
import { useState } from "react";
import AddTool from "../components/docs/AddTool";

export default function ManageTools() {
  // group tools by "toolbox"
  const groupedTools = {};
  const [selectedTool, setSelectedTool] = useState(null);

  for (const tool in toolsMetadata) {
    const toolbox = toolsMetadata[tool].toolbox;
    if (!toolbox) {
      toolsMetadata[tool].toolbox = "Other";
    }
    if (!groupedTools[toolbox]) {
      groupedTools[toolbox] = {};
    }

    groupedTools[toolbox][tool] = toolsMetadata[tool];
  }
  return (
    <>
      <Meta />
      <Scaffolding id={"add-tools"} userType={"admin"}>
        <Modal
          open={selectedTool ? true : false}
          onCancel={(ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            setSelectedTool(null);
          }}
          footer={null}
        >
          {selectedTool ? (
            <>
              <h1 className="text-lg font-bold mb-4">
                Tool: {toolDisplayNames[selectedTool]}
              </h1>
              <div className="tool-inputs">
                <h2 className="text-xs uppercase font-light mb-4">Inputs</h2>
                {toolsMetadata[selectedTool].function_signature.map((input) => (
                  <div className="tool-input mb-4 text-xs">
                    <span className="rounded-md border-gray-200 font-mono mr-3 text-gray-400 bg-gray-200 px-1 py-1">
                      {easyToolInputTypes[input["type"]] || input["type"]}
                    </span>
                    <span className="">{input["name"]}</span>
                  </div>
                ))}
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
              {
                return (
                  <div key={toolbox}>
                    <h1 className="text-md font-bold mb-4">
                      {toolboxDisplayNames[toolbox]}
                    </h1>
                    <div className="toolbox flex flex-wrap flex-row mb-10">
                      {Object.keys(groupedTools[toolbox]).map((tool) => {
                        return (
                          <div
                            className="tool rounded mr-3 mb-3 bg-gray-50 border border-gray-400 p-3 w-60 cursor-pointer hover:shadow-lg"
                            key={tool}
                            onClick={() => setSelectedTool(tool)}
                          >
                            <div className="tool-name text-md">
                              {toolDisplayNames[tool]}
                            </div>
                          </div>
                        );
                      })}

                      <AddTool toolbox={toolbox}></AddTool>
                    </div>
                  </div>
                );
              }
            })}
          </div>
        </div>
      </Scaffolding>
    </>
  );
}
