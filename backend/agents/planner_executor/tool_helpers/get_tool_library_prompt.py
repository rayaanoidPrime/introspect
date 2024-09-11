from db_utils import get_all_tools
from utils import create_simple_tool_types
import yaml


async def get_tool_library_prompt(user_question=None, extra_tools=[]):
    print("User question while getting tool library:", user_question)
    prompt = []

    # get pruned tools based on user question
    err, tools = get_all_tools()

    if err:
        return ""

    print("Pruned tools:", [x["function_name"] for x in tools.values()])

    # now get the prompt for each
    for _, tool in tools.items():
        # if it's disabled, skip
        if tool["disabled"]:
            continue

        tool_inputs_prompt = {}
        # input_metadata is an object
        for input_metadata in tool["input_metadata"].values():
            tool_inputs_prompt[input_metadata["name"]] = (
                f"{create_simple_tool_types(input_metadata['type'])} - {input_metadata['description']}"
            )

        tool_outputs_prompt = {}
        # outputs is an array
        for output in tool["output_metadata"]:
            tool_outputs_prompt[output["name"]] = (
                f"{create_simple_tool_types(output.get('type', 'pandas.core.frame.DataFrame'))}, {output['description']}"
            )

        prompt.append(
            {
                "tool_name": tool["function_name"],
                "description": tool["description"],
                "inputs": tool_inputs_prompt,
                "outputs": tool_outputs_prompt,
            }
        )

    # add the extra tools as well which is an array
    # of objects with { tool_name, description, input_metadata, output_metadata }
    for tool in extra_tools:
        prompt.append(tool)

    prompt = yaml.dump(prompt, sort_keys=False)

    return prompt
