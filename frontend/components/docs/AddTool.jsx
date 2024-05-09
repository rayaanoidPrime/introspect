import setupBaseUrl from "../../utils/setupBaseUrl";
import { Button, Input, Modal, Select } from "antd";
import {
  easyToolInputTypes,
  preventModifyTargetRanges,
  snakeCase,
  toolboxDisplayNames,
} from "../../utils/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import ReactCodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { MdDeleteOutline } from "react-icons/md";
import { Range, RangeSet, RangeValue } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { classname } from "@uiw/codemirror-extensions-classname";
const { TextArea } = Input;

const getToolsEndpoint = setupBaseUrl("http", "get_tools");
const setToolsEndpoint = setupBaseUrl("http", "set_tools");
const skipImages = false;

export default function AddTool({ toolbox }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [toolFunctionBody, setToolFunctionBody] = useState(
    "\n  #\n  # YOUR FUNCTION BODY HERE\n  #\n  pass\n"
  );

  const [toolInputs, setToolInputs] = useState([]);
  const [toolDefStatement, setToolDefStatement] = useState("");

  const [toolReturnStatement, setToolReturnStatement] = useState("");

  const getReadOnlyRanges = useCallback(
    // we want to make the function definition, the function doctstring
    // and the return statement read only inside of codemirror
    // this function uses the toolDefStatement, toolFunctionBody and toolReturnStatement
    // to create "read only text ranges" (a codemirror internal thing)
    // which is used in conjunction with the preventModifyTargetRanges function
    // which checks if a range is read only and prevents modification
    (editorState) => {
      const defStatementLines = toolDefStatement.split("\n").length;
      // get lines from the end of the
      const toolFunctionBodyLines = toolFunctionBody.split("\n").length;

      return RangeSet.of([
        new Range(0, toolDefStatement.length, new RangeValue(toolDefStatement)),
        new Range(
          toolDefStatement.length + toolFunctionBody.length,
          editorState.doc.length,
          new RangeValue(toolReturnStatement)
        ),
      ]);
    },
    [toolDefStatement, toolReturnStatement, toolFunctionBody]
  );

  const classnameCodeMirrorExtension = useMemo(
    // code mirror extension
    // adds class names to def statements and return statements (read only ranges)
    // in case we want to style them differently later
    () =>
      classname({
        add: (lineNumber) => {
          if (lineNumber <= toolDefStatement.split("\n").length) {
            return "def-line";
          }
          if (
            lineNumber >=
            toolDefStatement.split("\n").length +
              toolFunctionBody.split("\n").length -
              1
          ) {
            return "return-line";
          }
        },
      }),
    [toolDefStatement, toolReturnStatement, toolFunctionBody]
  );

  const [toolOutputs, setToolOutputs] = useState([]);
  const [toolName, setToolName] = useState("New Tool");
  const [toolDocString, setToolDocString] = useState("");
  const editor = useRef();

  const mandatoryInputs = [
    {
      name: "global_dict",
      type: "dict",
    },
  ];

  useEffect(() => {
    // def tool_name_in_kebab_case
    let newDefStr = "def " + snakeCase(toolName) + "(";
    // add toolinputs to newDefStr
    // inputs will have name and type
    // def function(
    //  p1: p1_type,
    //  p2: p2_type,
    // )
    const allInputs = toolInputs.concat(mandatoryInputs);
    allInputs.forEach((input, idx) => {
      if (idx === 0) newDefStr += "\n";
      newDefStr += "\t" + input.name + ": " + input.type;
      if (idx != toolInputs.length - 1) {
        newDefStr += ",\n";
      } else {
        newDefStr += "\n";
      }
    });

    newDefStr += "):";

    // add doc string
    // split to max of 60 characters
    // first split on newlines
    // then split on spaces
    newDefStr +=
      '\n  """\n  ' +
      toolDocString
        .split("\n")
        .map((line) => {
          return line
            .split(" ")
            .reduce((acc, word) => {
              if (acc.length && acc[acc.length - 1].length + word.length < 60) {
                acc[acc.length - 1] += " " + word;
              } else {
                acc.push(word);
              }
              return acc;
            }, [])
            .join("\n  ");
        })
        .join("\n  ") +
      '\n  """';

    let returnStr = '  return {\n    "outputs": [\n';
    toolOutputs.forEach((output, idx) => {
      returnStr += "      {\n";
      returnStr += '        "data": ' + output.name + ",\n";
      if (!skipImages) {
        returnStr += '        "chart_images": [\n';
        output.chartImages.forEach((chartImage, imageIdx) => {
          returnStr += "          {\n";
          returnStr += '            "name": ' + chartImage.name + ",\n";
          returnStr += "          },\n";
        });
        returnStr += "        ],\n";
        returnStr += "      },\n";
      }
    });

    returnStr += "    ],\n  }";

    setToolDefStatement(newDefStr);
    setToolReturnStatement(returnStr);
  }, [toolInputs, toolName, toolOutputs, toolDocString]);

  return (
    <>
      <Modal
        open={modalOpen}
        onCancel={(ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          setModalOpen(null);
        }}
        footer={null}
        className={"w-10/12 h-11/12"}
        rootClassName="feedback-modal"
      >
        <div className="add-tool-modal">
          <h1 className="text-lg font-bold mb-4">
            Add a tool to the {toolboxDisplayNames[toolbox]} toolbox
          </h1>
          <div className="flex flex-row">
            <div className="w-6/12 mr-6">
              <div className="mb-4">
                <h2 className="text-sm uppercase font-light mb-2">Tool name</h2>
                <Input
                  title="sss"
                  type="text"
                  rootClassName="mb-2 text-gray-600 font-mono"
                  placeholder="Tool name"
                  onChange={(ev) => setToolName(ev.target.value)}
                  value={toolName}
                />
                <h2 className="text-sm uppercase font-light mb-2">
                  Tool description
                </h2>
                <TextArea
                  title="sss"
                  type="text"
                  rootClassName="mb-2 text-gray-600 font-mono"
                  placeholder="What does this tool do?"
                  onChange={(ev) => setToolDocString(ev.target.value)}
                  value={toolDocString}
                />
              </div>
              <div className="tool-inputs mb-8">
                <h2 className="text-sm uppercase font-light mb-2">Inputs</h2>
                {!toolInputs.length ? (
                  <></>
                ) : (
                  <div className="tool-inputs-headings flex flex-row text-xs text-gray-400 mb-2 font-light">
                    <div className="w-3/12 mr-3">Type</div>
                    <div className="w-9/12">Name</div>
                  </div>
                )}
                {toolInputs.map((input, idx) => {
                  return (
                    <div
                      className="tool-input mb-4 text-xs flex flex-row relative items-center"
                      key={idx}
                    >
                      <Select
                        defaultValue={input.type}
                        rootClassName="mr-3 w-3/12 font-mono text-gray-600"
                        popupClassName="text-gray-600"
                        onChange={(val, option) => {
                          const newToolInputs = [...toolInputs];
                          newToolInputs[idx].type = option.value;
                          setToolInputs(newToolInputs);
                        }}
                        options={Object.keys(easyToolInputTypes).map((type) => {
                          return {
                            label: easyToolInputTypes[type],
                            value: type,
                          };
                        })}
                      />

                      <Input
                        status={
                          (
                            input.name &&
                            // not duplicated
                            toolInputs.filter((inp) => inp.name === input.name)
                          ).length === 1 || "error"
                        }
                        type="text"
                        className="w-9/12 font-mono text-gray-600"
                        placeholder="Input name can't be empty"
                        value={input.name}
                        onChange={(ev) => {
                          const newToolInputs = [...toolInputs];
                          newToolInputs[idx].name = ev.target.value;
                          setToolInputs(newToolInputs);
                        }}
                      />

                      <p
                        className=" mr-1  flex justify-center items-center rounded-full cursor-pointer w-4 h-4 top-0 -left-5"
                        onClick={() => {
                          const newToolInputs = [...toolInputs];
                          newToolInputs.splice(idx, 1);
                          setToolInputs(newToolInputs);
                        }}
                      >
                        <MdDeleteOutline
                          className="fill-gray-400 hover:fill-rose-400"
                          size={40}
                          // strokeWidth={1}
                          stroke="red"
                        />
                      </p>
                    </div>
                  );
                })}
                <Button
                  type="primary"
                  className="bg-gray-100 text-gray-500 hover:bg-blue-400 hover:text-white font-mono"
                  onClick={() => {
                    setToolInputs([
                      ...toolInputs,
                      {
                        name: "input_" + toolInputs.length,
                        type: "str",
                      },
                    ]);
                  }}
                >
                  Add input
                </Button>
              </div>
              <div className="tool-outputs ">
                <h2 className="text-sm uppercase font-light mb-2">Outputs</h2>
                {!toolOutputs.length ? (
                  <></>
                ) : (
                  <div className="tool-outputs-headings flex flex-row text-xs text-gray-400 mb-2 font-light">
                    <div className="w-6/12 mr-3">Name</div>
                    {!skipImages && <div className="w-6/12">Images</div>}
                  </div>
                )}
                {toolOutputs.map((output, idx) => {
                  return (
                    <div
                      className="tool-output mb-4 text-xs flex flex-row relative items-start"
                      key={idx}
                    >
                      <Input
                        type="text"
                        className="mr-3 w-6/12 font-mono"
                        placeholder="Output name"
                        value={output.name}
                        onChange={(ev) => {
                          const newToolOutputs = [...toolOutputs];
                          newToolOutputs[idx].name = ev.target.value;
                          setToolOutputs(newToolOutputs);
                        }}
                      />
                      {!skipImages && (
                        <div className="tool-images flex flex-row flex-wrap border rounded-md p-1 border-gray-300  w-6/12">
                          {output.chartImages.map((chartImage, imageIdx) => {
                            return (
                              <div
                                className="tool-image font-mono  cursor-pointer m-1 rounded flex items-center "
                                key={imageIdx}
                              >
                                <Input
                                  htmlSize={chartImage.name.length}
                                  className="cursor-text bg-gray-100 text-gray-500 font-mono inline"
                                  onChange={(ev) => {
                                    const newToolOutputs = [...toolOutputs];
                                    newToolOutputs[idx].chartImages[
                                      imageIdx
                                    ].name = ev.target.value;
                                    setToolOutputs(newToolOutputs);
                                  }}
                                  defaultValue={chartImage.name}
                                />
                                <MdDeleteOutline
                                  className="fill-gray-400 hover:fill-rose-400"
                                  size={15}
                                  onClick={() => {
                                    const newToolOutputs = [...toolOutputs];
                                    newToolOutputs[idx].chartImages.splice(
                                      imageIdx,
                                      1
                                    );
                                    setToolOutputs(newToolOutputs);
                                  }}
                                />
                              </div>
                            );
                          })}
                          <div
                            className="add-tool-image bg-gray-100 text-gray-500 hover:bg-blue-400 hover:text-white cursor-pointer p-1 px-3 m-1 rounded flex items-center"
                            onClick={() => {
                              const newToolOutputs = [...toolOutputs];
                              newToolOutputs[idx].chartImages.push({
                                name:
                                  "image_" +
                                  toolOutputs[idx].chartImages.length,
                              });
                              setToolOutputs(newToolOutputs);
                            }}
                          >
                            +
                          </div>
                        </div>
                      )}

                      <p
                        className=" mr-1 flex justify-center items-center rounded-full cursor-pointer w-4 h-4 top-0 -left-5 self-center	"
                        onClick={() => {
                          const newToolOutputs = [...toolOutputs];
                          newToolOutputs.splice(idx, 1);
                          setToolOutputs(newToolOutputs);
                        }}
                      >
                        <MdDeleteOutline
                          className="fill-gray-400 hover:fill-rose-400"
                          size={40}
                          // strokeWidth={1}
                          stroke="red"
                        />
                      </p>
                    </div>
                  );
                })}
                <Button
                  type="primary"
                  className="bg-gray-100 text-gray-500 hover:bg-blue-400 hover:text-white font-mono"
                  onClick={() => {
                    setToolOutputs([
                      ...toolOutputs,
                      {
                        name: "output_" + toolOutputs.length,
                        chartImages: [],
                      },
                    ]);
                  }}
                >
                  Add output
                </Button>
              </div>
            </div>
            <div className="add-code  w-6/12">
              <h2 className="text-sm uppercase font-light mb-2">Code</h2>
              <ReactCodeMirror
                className="*:outline-0 *:focus:outline-0 "
                // refresh if the toolDefStatement or toolReturnStatement changes
                key={toolDefStatement + toolReturnStatement}
                value={
                  toolDefStatement + toolFunctionBody + toolReturnStatement
                }
                extensions={[
                  python(),
                  preventModifyTargetRanges(getReadOnlyRanges),
                  classnameCodeMirrorExtension,
                  EditorView.lineWrapping,
                ]}
                basicSetup={{
                  lineNumbers: false,
                  highlightActiveLine: false,
                }}
                language="python"
                onChange={(val) => {
                  // remove toolDefStatement from the start and
                  // toolReturnStatement from the end
                  // and set the funciton body to the tool code
                  setToolFunctionBody(
                    val
                      .replace(toolDefStatement, "")
                      .replace(toolReturnStatement, "")
                  );
                }}
              />
            </div>
          </div>
        </div>
      </Modal>
      <div
        className="tool rounded mr-3 mb-3  bg-blue-50 border border-blue-400 flex items-center p-3 cursor-pointer hover:shadow-lg"
        onClick={() => setModalOpen(true)}
      >
        <div className="flex items-center  justify-center text-blue-500">
          <span className="">
            <p className="m-0">+</p>
          </span>
        </div>
      </div>
    </>
  );
}
