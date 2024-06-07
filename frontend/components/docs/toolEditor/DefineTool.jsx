import TrashIcon from "$components/icons/TrashIcon";
import { Button } from "$components/tailwind/Button";
import { Input } from "$components/tailwind/Input";
import SingleSelect from "$components/tailwind/SingleSelect";
import { TextArea } from "$components/tailwind/TextArea";
import { easyToolInputTypes } from "$utils/utils";

export default function DefineTool({
  toolName,
  setToolName,
  toolDocString,
  setToolDocString,
  //   toolInputs,
  //   setToolInputs,
  //   toolOutputs,
  //   setToolOutputs,
  //   skipImages,
}) {
  return (
    <>
      <div>
        <Input
          label="Tool name"
          type="text"
          rootClassName="mb-4 text-gray-600 "
          placeholder="Give your tool a name"
          status={toolName ? "" : "error"}
          onChange={(ev) => setToolName(ev.target.value)}
          value={toolName}
        />
        <TextArea
          label="Description"
          placeholder="What does this tool do?"
          status={toolDocString ? "" : "error"}
          onChange={(ev) => setToolDocString(ev.target.value)}
          value={toolDocString}
        />
      </div>
      {/* <div className="tool-inputs mt-12">
        <h2 className="block text-xs font-light mb-2">Inputs</h2>
        {!toolInputs.length ? (
          <></>
        ) : (
          <div className="tool-inputs-headings grid grid-cols-12 gap-4 text-xs text-gray-400 mb-2 font-light ">
            <div className="col-span-3">Type</div>
            <div className="col-span-4">Name</div>
            <div className="col-span-4">Description</div>
          </div>
        )}
        {toolInputs.map((input, idx) => {
          return (
            <div
              className="tool-input mb-4 text-xs grid grid-cols-12 gap-4 relative border-b pb-2 border-b-gray-100"
              key={idx}
            >
              <SingleSelect
                defaultValue={input.type}
                rootClassName=" text-gray-600 col-span-3"
                popupClassName="text-gray-600"
                onChange={(option) => {
                  const newToolInputs = toolInputs.slice();
                  newToolInputs[idx].type = option.value;
                  setToolInputs(newToolInputs);
                }}
                options={Object.keys(easyToolInputTypes).map((type, i) => {
                  return {
                    label: easyToolInputTypes[type],
                    value: type,
                  };
                })}
              />

              <Input
                status={
                  (input.name &&
                    // make sure not duplicated
                    Object.values(toolInputs).filter(
                      (inp) => inp.name === input.name
                    ).length === 1) ||
                  "error"
                }
                type="text"
                rootClassName=" text-gray-600 col-span-4"
                placeholder="Input name can't be empty"
                value={input.name}
                onChange={(ev) => {
                  const newToolInputs = toolInputs.slice();
                  newToolInputs[idx].name = ev.target.value;
                  setToolInputs(newToolInputs);
                }}
              />

              <TextArea
                rootClassName="col-span-4"
                status={input.description === "" ? "error" : ""}
                placeholder="A good input description ensures good performance"
                value={input.description}
                onChange={(ev) => {
                  const newToolInputs = toolInputs.slice();
                  newToolInputs[idx].description = ev.target.value;
                  setToolInputs(newToolInputs);
                }}
              />

              <p
                className="mr-1 col-span-1 rounded-full cursor-pointer flex items-center"
                onClick={() => {
                  const newToolInputs = toolInputs.slice();
                  newToolInputs.splice(idx, 1);
                  setToolInputs(newToolInputs);
                }}
              >
                <TrashIcon className="stroke-gray-400 hover:stroke-rose-400 w-4 h-4" />
              </p>
            </div>
          );
        })}
        <Button
          className="bg-gray-100 text-gray-500 hover:bg-blue-400 hover:text-white "
          onClick={() => {
            const nm = "input_" + (toolInputs.length + 1);
            setToolInputs([
              ...toolInputs,
              {
                name: nm,
                type: "str",
                description: "",
              },
            ]);
          }}
        >
          Add input
        </Button>
      </div>
      <div className="tool-outputs mt-12">
        <h2 className="block text-xs font-light mb-2">Outputs</h2>
        {!toolOutputs.length ? (
          <></>
        ) : (
          <div className="tool-outputs-headings grid grid-cols-12 gap-4 relative items-start text-xs text-gray-400 mb-2 font-light">
            <div className="col-span-3">Name</div>
            {!skipImages && <div className="col-span-4">Images</div>}
            <div className="col-span-4">Description</div>
          </div>
        )}
        {toolOutputs.map((output, idx) => {
          return (
            <div
              className="tool-output mb-4 text-xs grid grid-cols-12 gap-4 relative items-start"
              key={idx}
            >
              <Input
                type="text"
                rootClassName=" col-span-3"
                placeholder="Output name"
                value={output.name}
                onChange={(ev) => {
                  const newToolOutputs = [...toolOutputs];
                  newToolOutputs[idx].name = ev.target.value;
                  setToolOutputs(newToolOutputs);
                }}
              />

              {!skipImages && (
                <div className="tool-images col-span-4 flex flex-row flex-wrap border rounded-md border-gray-300">
                  {(output?.chart_images || []).map((chartImage, imageIdx) => {
                    return (
                      <div
                        className="tool-image  cursor-pointer m-1 rounded flex items-center "
                        key={imageIdx}
                      >
                        <Input
                          inputHtmlProps={{
                            htmlSize: chartImage.name.length,
                            defaultValue: chartImage.name,
                          }}
                          inputClassName="cursor-text bg-gray-100 text-gray-500  inline"
                          placeholder="Image name"
                          onChange={(ev) => {
                            const newToolOutputs = [...toolOutputs];
                            newToolOutputs[idx].chart_images[imageIdx].name =
                              ev.target.value;
                            setToolOutputs(newToolOutputs);
                          }}
                        />
                        <TrashIcon
                          className="stroke-gray-400 hover:stroke-rose-400 w-4 h-4"
                          onClick={() => {
                            const newToolOutputs = [...toolOutputs];
                            newToolOutputs[idx].chart_images.splice(
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
                      if (!newToolOutputs[idx].chart_images)
                        newToolOutputs[idx].chart_images = [];

                      newToolOutputs[idx].chart_images.push({
                        name: "image_" + toolOutputs[idx].chart_images.length,
                      });
                      setToolOutputs(newToolOutputs);
                    }}
                  >
                    +
                  </div>
                </div>
              )}
              <TextArea
                rootClassName="col-span-4"
                placeholder="A good output description ensures good performance"
                status={output.description === "" ? "error" : ""}
                value={output.description}
                onChange={(ev) => {
                  const newToolOutputs = [...toolOutputs];
                  newToolOutputs[idx].description = ev.target.value;
                  setToolOutputs(newToolOutputs);
                }}
              />

              <p
                className="col-span-1 flex justify-center items-center rounded-full cursor-pointer w-4 h-4 top-0 -left-5 self-center	"
                onClick={() => {
                  const newToolOutputs = [...toolOutputs];
                  newToolOutputs.splice(idx, 1);
                  setToolOutputs(newToolOutputs);
                }}
              >
                <TrashIcon className="stroke-gray-400 hover:stroke-rose-400 w-4 h-4" />
              </p>
            </div>
          );
        })}
        <Button
          className="bg-gray-100 text-gray-500 hover:bg-blue-400 hover:text-white "
          onClick={() => {
            setToolOutputs([
              ...toolOutputs,
              {
                name: "output_" + toolOutputs.length,
                description: "",
                type: "pandas.core.frame.DataFrame",
                chart_images: [],
              },
            ]);
          }}
        >
          Add output
        </Button>
      </div> */}
    </>
  );
}
