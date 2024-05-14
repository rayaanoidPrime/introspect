import asyncio
from db_utils import get_all_tools
from utils import create_simple_tool_types
import yaml

prompt_format = """
- tool_name: tool.function_name
  description: tool.description
  inputs:
    - input.name: input.type, input.description
    ...
  outputs:
    - output.name: output.type, output.description
    ..."""


def get_tool_library_prompt(toolboxes=[]):
    toolboxes += ["data_fetching", "stats", "plots", "cancer_survival"]
    toolboxes = list(set(toolboxes))
    prompt = []
    err, tools = get_all_tools()

    if err:
        return ""

    # now get the prompt for each
    for _, tool in tools.items():
        # if it's disabled, skip
        if tool["disabled"]:
            continue

        # if it's in toolboxes
        toolbox = tool["toolbox"]
        if toolbox in toolboxes:
            tool_inputs_prompt = {}
            for input in tool["input_metadata"]:
                tool_inputs_prompt[input["name"]] = (
                    f"{create_simple_tool_types(input['type'])} - {input['description']}"
                )

            tool_outputs_prompt = {}
            for output in tool["output_metadata"]:
                tool_outputs_prompt[output["name"]] = (
                    f"{create_simple_tool_types(output['type'])}, {output['description']}"
                )

            prompt.append(
                {
                    "tool_name": tool["function_name"],
                    "description": tool["description"],
                    "inputs": tool_inputs_prompt,
                    "outputs": tool_outputs_prompt,
                }
            )

    prompt = yaml.dump(prompt, sort_keys=False)

    return prompt


# print(get_tool_library_prompt())
