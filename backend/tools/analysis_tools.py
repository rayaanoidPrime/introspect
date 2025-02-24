import asyncio
from tools.analysis_models import (
    AnswerQuestionFromDatabaseInput,
    AnswerQuestionFromDatabaseOutput,
    GenerateReportFromQuestionInput,
    GenerateReportFromQuestionOutput,
    SynthesizeReportFromQuestionsOutput,
)
from utils_logging import LOG_LEVEL, LOGGER
from utils_md import get_metadata, mk_create_ddl
from utils_sql import generate_sql_query
from db_utils import get_db_type_creds
from defog.llm.utils import chat_async
from defog.query import async_execute_query_once


async def answer_1_question_from_database(
    input: AnswerQuestionFromDatabaseInput,
) -> AnswerQuestionFromDatabaseOutput:
    """
    Given a *single* question for a *single* database, this function will generate a SQL query to answer the question.
    Then, it will execute the SQL query on the database and return the results.

    IMPORTANT: this function will only take in a single question. Do not try to handle multiple questions in the same call.
    """
    question = input.question
    db_name = input.db_name

    LOGGER.debug(f"Question to answer from database ({db_name}):\n{question}\n")

    sql_response = await generate_sql_query(
        question=question,
        db_name=db_name,
    )
    sql = sql_response["sql"]

    # execute SQL
    db_type, db_creds = await get_db_type_creds(db_name)
    colnames, rows = await async_execute_query_once(
        db_type=db_type, db_creds=db_creds, query=sql
    )

    if LOG_LEVEL == "DEBUG":
        LOGGER.debug(f"Column names:\n{colnames}\n")
        first_20_rows_str = "\n".join([str(row) for row in rows[:20]])
        LOGGER.debug(f"First 20 rows:\n{first_20_rows_str}\n")

    # known issue: if the query returns way too much data, it may run out of context window limits

    return AnswerQuestionFromDatabaseOutput(sql=sql, colnames=colnames, rows=rows)


async def generate_report_from_question(
    input: GenerateReportFromQuestionInput,
) -> GenerateReportFromQuestionOutput:
    """
    Given an initial question for a single database, this function will call
    answer_1_question_from_database() to answer the question.
    Then, it will use the output to generate a new question, and call
    answer_1_question_from_database() again.
    It will continue to do this until the LLM model decides to stop.
    """
    try:
        tools = [answer_1_question_from_database]
        metadata = await get_metadata(input.db_name)
        metadata_str = mk_create_ddl(metadata)
        response = await chat_async(
            model=input.model,
            tools=tools,
            messages=[
                {"role": "developer", "content": "Formatting re-enabled"},
                {
                    "role": "user",
                    "content": f"""I would like you to create a comprehensive analysis for answering this question: {input.question}

Look in the database {input.db_name} for your answers, and feel free to continue asking multiple questions from the database if you need to. I would rather that you ask a lot of questions than too few.

The database schema is below:
```sql
{metadata_str}
```

Try to aggregate data in clear and understandable buckets. Please give your final answer as a descriptive report.

For each point that you make in the report, please include the full SQL query that was used to generate the data for it. You can include as many SQL queries as you want, including multiple SQL queries for one point.

It is *very* important that you return a complete and runnable SQL query, not an example or abbreviation.
""",
                },
            ],
        )
        sql_answers = []
        for tool_output in response.tool_outputs:
            if tool_output.get("name") == "answer_1_question_from_database":
                result = tool_output.get("result")
                if not result or not isinstance(result, AnswerQuestionFromDatabaseOutput):
                    LOGGER.error(f"Invalid tool output: {tool_output}")
                    continue
                sql_answers.append(result)
        return GenerateReportFromQuestionOutput(
            report=response.content,
            sql_answers=sql_answers,
            tool_outputs=response.tool_outputs,
        )
    except Exception as e:
        LOGGER.error(f"Error in generate_report_from_question:\n{e}")
        return GenerateReportFromQuestionOutput(
            report="Error in generating report from question",
            sql_answers=[],
        )


async def synthesize_report_from_questions(
    input: GenerateReportFromQuestionInput,
) -> SynthesizeReportFromQuestionsOutput:
    """
    Given an initial question for a single database, this function will call
    generate_report_from_question() multiple times in parallel to generate a report.
    It will continue to do this until the LLM model decides to stop.
    """
    try:
        tasks = [generate_report_from_question(input) for _ in range(input.num_reports)]
        responses = await asyncio.gather(*tasks)
        metadata = await get_metadata(input.db_name)
        metadata_str = mk_create_ddl(metadata)
        user_prompt = f"""Your task is to synthesize a series of reports into a final report.

# Context
These reports were generated by querying a database with a series of questions.
The schema for the database is as follows:
{metadata_str}

# Task
Synthesize these intermediate reports done by a group of independent analysts into a final report by combining the insights from each of the reports provided.

You should attempt to get the most useful insights from each report, without repeating the insights across reports. Please ensure that you get the actual data insights from these reports, and not just methodologies.

For the final report, please include the full SQL queries that were used to generate the data for each point.

Here are the reports to synthesize:
"""
        for response in responses:
            user_prompt += f"\n\n{response.report}"
        messages = [
            {"role": "developer", "content": "Formatting re-enabled"},
            {"role": "user", "content": user_prompt},
        ]
        synthesis_response = await chat_async(
            model=input.model,
            messages=messages,
        )
        return SynthesizeReportFromQuestionsOutput(
            report=synthesis_response.content,
            report_answers=responses,
        )
    except Exception as e:
        LOGGER.error(f"Error in synthesize_report_from_questions:\n{e}")
        return SynthesizeReportFromQuestionsOutput(
            report="Error in synthesizing report from questions",
            report_answers=[],
        )
