from agents.planner_executor.tool_helpers.all_tools import tools
from db_utils import add_tool

import asyncio


async def main():
    # initialise basic tools in db
    for key in tools:
        tool = tools[key]
        function_name = tool["function_name"]
        description = tool["description"]
        code = tool["code"]
        fn = tool["fn"]
        tool_name = tool["tool_name"]
        toolbox = tool["toolbox"]
        no_code = tool.get("no_code", False)

        inputs = tool["inputs"]
        outputs = tool["outputs"]

        err = await add_tool(
            tool_name,
            function_name,
            description,
            code,
            inputs,
            outputs,
            toolbox,
            no_code,
            cannot_delete=True,
            cannot_disable=True,
        )

        if err:
            print(f"Error adding tool {tool_name}: {err}")
        else:
            print(f"Tool {function_name} added to the database.")


# Run the main function
asyncio.run(main())
