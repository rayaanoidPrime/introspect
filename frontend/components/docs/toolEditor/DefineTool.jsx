import { Input } from "$components/tailwind/Input";
import { TextArea } from "$components/tailwind/TextArea";
import ToolCodeEditor from "./ToolCodeEditor";

export default function DefineTool({
  toolName,
  handleChange = (...args) => {},
  toolDocString,
  toolCode = null,
  hideName = false,
  hideDescription = false,
  hideCode = false,
}) {
  return (
    <>
      <div className="*:font-mono">
        {!hideName && (
          <Input
            label="Tool name"
            type="text"
            rootClassName="mb-4 text-gray-600"
            placeholder="Give your tool a name"
            status={toolName ? "" : "error"}
            onChange={(ev) => handleChange("tool_name", ev.target.value)}
            defaultValue={toolName}
          />
        )}
        {!hideDescription && (
          <TextArea
            rootClassName="mb-4 w-full "
            label="Description"
            placeholder="What does this tool do?"
            status={toolDocString ? "" : "error"}
            onChange={(ev) => handleChange("description", ev.target.value)}
            defaultValue={toolDocString}
          />
        )}
        {toolCode && !hideCode && (
          <>
            <div className="block text-gray-600 text-xs mb-2 font-light">
              Code
            </div>
            <ToolCodeEditor
              editable={true}
              toolCode={toolCode}
              onChange={(v) => handleChange("code", v)}
            />
          </>
        )}
      </div>
    </>
  );
}
