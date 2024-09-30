import asyncio
import os
from typing import Any, Dict, List, Tuple

from utils_sql import compare_query_results
from generic_utils import make_request, format_sql
import pandas as pd
from asyncio import Semaphore
from defog import AsyncDefog

generate_sql_semaphore = Semaphore(5)
execute_sql_semaphore = Semaphore(5)

DEFOG_BASE_URL = os.environ.get("DEFOG_BASE_URL", "https://api.defog.ai")


async def test_query(
    api_key: str,
    db_type: str,
    db_creds: Dict[str, str],
    question: str,
    original_sql: str,
    source: str,
) -> Dict[str, Any]:
    """
    Test the generated SQL for the given question.
    Returns the result of the comparison between the golden query and the generated query.
    """
    # we want to use the Defog client, so that we get the SQL *after* all error correction
    # and so that it works regardless of the db type
    # we also want to be loudly notified on Slack if the SQL generation fails for this api key

    async with Semaphore(5):
        defog = AsyncDefog(api_key=api_key, db_type=db_type, db_creds=db_creds)
        defog.base_url = DEFOG_BASE_URL
        defog.generate_query_url = f"{DEFOG_BASE_URL}/generate_query_chat"

        res = await defog.run_query(question=question)
        print(res, flush=True)
        sql_gen = res["query_generated"]
        df_gen = pd.DataFrame(res["data"], columns=res["columns"])

        result = await compare_query_results(
            query_gold=original_sql,
            query_gen=sql_gen,
            df_gen=df_gen,
            question=question,
            db_type=db_type,
            db_creds=db_creds,
        )
        result["question"] = question
        result["sql_golden"] = format_sql(original_sql)
        result["sql_gen"] = format_sql(sql_gen)
        result["source"] = source
        return result


async def validate_queries(
    api_key: str, db_type: str, db_creds: Dict[str, str]
) -> Tuple[float, float, List[Dict[str, Any]]]:
    """
    Validate the golden queries for the given api_key.
    Returns the correct and subset-correct rates of the golden queries along
    with a list of golden queries that were incorrect.
    """
    data = {"api_key": api_key}
    golden_queries_task = make_request(
        f"{DEFOG_BASE_URL}/get_golden_queries",
        data,
    )
    feedback_task = make_request(
        f"{DEFOG_BASE_URL}/get_feedback",
        data,
    )

    golden_queries_response, feedback_response = await asyncio.gather(
        golden_queries_task, feedback_task
    )
    # create tasks from both the golden queries and the positive feedback
    golden_queries = golden_queries_response.get("golden_queries", [])
    num_correct = 0
    num_subset = 0
    tasks = []
    # de-duplicate feedback, since we only want to test the most recent feedback (customers can sometimes give multiple pieces of feedback for the same question)
    feedback_df = pd.DataFrame(
        feedback_response.get("data", []), columns=feedback_response.get("columns")
    )
    # keep the most recent feedback for each question, query pair
    feedback_df = feedback_df.sort_values(
        by="created_at", ascending=False
    ).drop_duplicates(subset=["question", "query_generated"])

    for feedback in feedback_df.to_dict(orient="records"):
        if str(feedback["feedback_type"]).lower() == "good":
            test_query_task = test_query(
                api_key=api_key,
                db_type=db_type,
                db_creds=db_creds,
                question=feedback["question"],
                original_sql=feedback["query_generated"],
                source="feedback",
            )
            tasks.append(test_query_task)

    for golden_query in golden_queries:
        if not golden_query.get("user_validated", False):
            continue
        test_query_task = test_query(
            api_key=api_key,
            db_type=db_type,
            db_creds=db_creds,
            question=golden_query["question"],
            original_sql=golden_query["sql"],
            source="golden",
        )
        tasks.append(test_query_task)

    # and run them together all at once
    results = await asyncio.gather(*tasks)
    for result in results:
        if result["correct"]:
            num_correct += 1
        if result["subset"]:
            num_subset += 1
    return {
        "total": len(results),
        "correct": num_correct,
        "subset": num_subset,
        "results": results,
    }
