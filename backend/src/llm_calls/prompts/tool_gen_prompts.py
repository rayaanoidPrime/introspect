return_format_prompt = """```python
return {
    "outputs": [
        {
            "data": pandas_df,
            "chart_images": [
                {
                    "data": base64_encoded_image,
                },
                ...
            ],
        },
        ...
    ],
}
```"""


input_types_prompt = """```json
{
  DBColumn: "Column name",
  DBColumnList: "List of column names",
  "pandas.core.frame.DataFrame": "Dataframe",
  str: "String",
  int: "Integer",
  float: "Float",
  bool: "Boolean",
  "list[str]": "List of strings",
  list: "List",
}
```"""

generate_tool_code_system_prompt = """You are a software engineer. Your job is to write Python code for a tool requested by the user, keeping the definition and return statement as per instructions. You will also provide a function to generate random sample inputs to the tool for testing purposes. Don't run the tool. Just give a function that generates sample inputs.
Give your response code in this format
```python
YOUR_CODE
```
```python-testing
def generate_sample_inputs():
    ...

def test_tool():
    ...
    return {
        inputs: [
            { name: input_1, type: input_1_type, value: sample_input_1 },
            { name: input_2, type: input_2_type, value: sample_input_2 },
            ...
        ],
        outputs: tool_outputs
    }
```"""

edit_tool_code_system_prompt = """You are a software engineer. Your job is to rewrite a Python function for a tool based on the request from the user. You will also provide a function to generate random sample inputs to the tool for testing purposes. Don't run the tool. Just give a function that generates sample inputs.
Give your response code in this format
```python
YOUR_EDITED_FUNCTION
```
```python-testing
def generate_sample_inputs():
    ...

def test_tool():
    ...
    return {
        inputs: [
            { name: input_1, type: input_1_type, value: sample_input_1 },
            { name: input_2, type: input_2_type, value: sample_input_2 },
            ...
        ],
        outputs: tool_outputs
    }
```"""


generate_tool_code_user_prompt = """Please generate code for this tool:
Tool name: {tool_name}

Tool description: {tool_description}

Here are the input types you can use for the function:
{input_types_prompt}

Stick to this format for your function's return statement:
{return_format_prompt}

Here is what you need to do: {user_question}
"""

edit_tool_code_user_prompt = """This is the tool:
Tool name: {tool_name}

Tool description: {tool_description}

Here are the input types you can use for the function:
{input_types_prompt}

Stick to this format for your function's return statement:
{return_format_prompt}

Here is the current code:
```python
{current_code}
```

Here are the changes you need to make: {user_question}
"""


fix_error_prompt = """There was an error running the code your provided:
{error}
Please fix the error and provide new code."""
