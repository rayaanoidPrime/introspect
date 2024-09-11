import {
  Input,
  TextArea,
  SingleSelect,
} from "@defogdotai/agents-ui-components/core-ui";
import NewToolCodeEditor from "./NewToolCodeEditor";

export function DefineTool({
  toolName,
  handleChange = (...args) => {},
  toolDocString,
  toolCode = null,
  apiKeyNames = [],
  hideName = false,
  hideDescription = false,
  hideCode = false,
  hideApiKeyNames = true,
  disabled = false,
}) {
  return (
    <>
      {!hideName && (
        <Input
          label="Tool name"
          type="text"
          disabled={disabled}
          rootClassNames="mb-4 text-gray-600"
          placeholder="Give your tool a name"
          status={toolName ? "" : "error"}
          onChange={(ev) => handleChange("tool_name", ev.target.value)}
          defaultValue={toolName}
        />
      )}
      {!hideDescription && (
        <TextArea
          rootClassNames="mb-4 w-full "
          label="Description"
          disabled={disabled}
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
          <NewToolCodeEditor
            editable={!disabled && true}
            toolCode={toolCode}
            onChange={(v) => handleChange("code", v)}
          />
        </>
      )}
      {(apiKeyNames && apiKeyNames.length && !hideApiKeyNames && (
        <SingleSelect
          label="Which database is this tool intended for?"
          disabled={disabled}
          options={apiKeyNames.map((name) => ({ label: name, value: name }))}
          allowCreateNewOption={false}
          allowClear={false}
          rootClassNames="mb-4 text-gray-600"
          placeholder="Select Database"
          onChange={(val) => handleChange("key_name", val)}
          defaultValue={apiKeyNames[0]}
        />
      )) ||
        null}
    </>
  );
}
