from db_utils import get_all_tools
from utils import create_simple_tool_types
import yaml


async def get_tool_library_prompt(user_question=None, extra_tools=[]):
    """
    Get the prompt for the tool library.

    `user_question` is currently not used. But it is intended to be used to prune the tools based on the user's question.

    `extra_tools` is an array of objects with the following structure:
    ```
    {
        "function_name": "my_tool",
        "description": "My tool description",
        "input_metadata": {
            "input_1": {
                "type": "pandas.core.frame.DataFrame",
                "description": "Input 1 description"
            },
            ...
        },
        "output_metadata": [
            {
                "name": "output_1",
                "type": "pandas.core.frame.DataFrame",
                "description": "Output 1 description"
            },
            ...
        ]
    }
    ```
    """
    prompt = []
    err, tools = get_all_tools()

    if err:
        return ""

    # add extra tools
    for tool in extra_tools:
        tools[tool["function_name"]] = tool

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

    prompt = yaml.dump(prompt, sort_keys=False)

    return prompt
