import { Input } from "$components/tailwind/Input";
import { TextArea } from "$components/tailwind/TextArea";
import ToolCodeEditor from "./ToolCodeEditor";

export default function DefineTool({
  toolName,
  setToolName = () => {},
  toolDocString,
  setToolDocString = () => {},
  toolCode = null,
  setToolCode = () => {},
}) {
  return (
    <>
      <div className="*:font-mono">
        <Input
          label="Tool name"
          type="text"
          rootClassName="mb-4 text-gray-600"
          placeholder="Give your tool a name"
          status={toolName ? "" : "error"}
          onChange={(ev) => setToolName(ev.target.value)}
          defaultValue={toolName}
        />
        <TextArea
          rootClassName="mb-4 w-full "
          label="Description"
          placeholder="What does this tool do?"
          status={toolDocString ? "" : "error"}
          onChange={(ev) => setToolDocString(ev.target.value)}
          defaultValue={toolDocString}
        />
        {toolCode && (
          <>
            <div className="block text-gray-600 text-xs mb-2 font-light">
              Code
            </div>
            <ToolCodeEditor editable={true} toolCode={toolCode} />
          </>
        )}
      </div>
    </>
  );
}
