from fastapi import APIRouter, Request
from generic_utils import (
    make_request,
    get_api_key_from_key_name,
)
from db_utils import validate_user
import os
import pandas as pd
from db_utils import get_db_type_creds
from fastapi.responses import JSONResponse

router = APIRouter()

DEFOG_BASE_URL = os.environ.get("DEFOG_BASE_URL", "https://api.defog.ai")


@router.post("/generate_golden_queries_from_questions")
async def generate_golden_queries_from_questions(request: Request):
    """Generates golden queries for the current set of golden questions."""
    params = await request.json()
    token = params.get("token")
    if not validate_user(token):
        return JSONResponse(
            status_code=401,
            content={
                "error": "unauthorized",
                "message": "Invalid username or password",
            },
        )
    key_name = params.get("key_name")
    optimized_glossary = params.get("optimized_glossary", None)
    optimized_metadata = params.get("optimized_metadata", None)

    api_key = get_api_key_from_key_name(key_name)
    db_type, _ = get_db_type_creds(api_key)
    url = DEFOG_BASE_URL + "/imgo_gen_golden_queries"
    res = await make_request(
        url,
        json={
            "api_key": api_key,
            "db_type": db_type,
            "optimized_glossary": optimized_glossary,
            "optimized_metadata": optimized_metadata,
        },
    )
    return res


@router.post("/check_generated_golden_queries_validity")
async def check_generated_golden_queries_validity(request: Request):
    """Checks if the generated golden queries are valid."""
    params = await request.json()
    token = params.get("token")
    if not validate_user(token):
        return JSONResponse(
            status_code=401,
            content={
                "error": "unauthorized",
                "message": "Invalid username or password",
            },
        )
    key_name = params.get("key_name")
    optimized_glossary = params.get("optimized_glossary", None)
    optimized_metadata = params.get("optimized_metadata", None)
    api_key = get_api_key_from_key_name(key_name)
    db_type, _ = get_db_type_creds(api_key)

    url = DEFOG_BASE_URL + "/imgo_check_golden_queries_valid"
    res = await make_request(
        url,
        json={
            "api_key": api_key,
            "db_type": db_type,
            "optimized_glossary": optimized_glossary,
            "optimized_metadata": optimized_metadata,
        },
    )
    return res


@router.post("/check_generated_golden_queries_correctness")
async def check_generated_golden_queries_correctness(request: Request):
    """Checks if the generated golden queries are correct."""
    params = await request.json()
    token = params.get("token")
    if not validate_user(token):
        return JSONResponse(
            status_code=401,
            content={
                "error": "unauthorized",
                "message": "Invalid username or password",
            },
        )
    key_name = params.get("key_name")
    optimized_glossary = params.get("optimized_glossary", None)
    optimized_metadata = params.get("optimized_metadata", None)
    api_key = get_api_key_from_key_name(key_name)
    db_type, _ = get_db_type_creds(api_key)

    url = DEFOG_BASE_URL + "/imgo_check_golden_queries_correct"
    res = await make_request(
        url,
        json={
            "api_key": api_key,
            "db_type": db_type,
            "optimized_glossary": optimized_glossary,
            "optimized_metadata": optimized_metadata,
        },
    )
    return res


@router.post("/optimize_glossary")
async def optimize_glossary(request: Request):
    """Responds to a request for optimized glossary."""
    params = await request.json()
    token = params.get("token")
    if not validate_user(token):
        return JSONResponse(
            status_code=401,
            content={
                "error": "unauthorized",
                "message": "Invalid username or password",
            },
        )
    key_name = params.get("key_name")
    api_key = get_api_key_from_key_name(key_name)
    url = DEFOG_BASE_URL + "/imgo_optimize_glossary"
    res = await make_request(url, json={"api_key": api_key})
    return res


@router.post("/optimize_metadata")
async def optimize_metadata(request: Request):
    """Responds to a request for optimized metadata."""
    params = await request.json()
    token = params.get("token")
    if not validate_user(token):
        return JSONResponse(
            status_code=401,
            content={
                "error": "unauthorized",
                "message": "Invalid username or password",
            },
        )
    key_name = params.get("key_name")
    api_key = get_api_key_from_key_name(key_name)
    url = DEFOG_BASE_URL + "/imgo_optimize_metadata"
    res = await make_request(url, json={"api_key": api_key})
    return res


@router.post("/get_recommendation_for_glossary_and_metadata")
async def get_recommendation_for_glossary_and_metadata(request: Request):
    """Responds to a request for recommendation for glossary and metadata."""
    params = await request.json()
    token = params.get("token")
    if not validate_user(token):
        return JSONResponse(
            status_code=401,
            content={
                "error": "unauthorized",
                "message": "Invalid username or password",
            },
        )
    key_name = params.get("key_name")
    api_key = get_api_key_from_key_name(key_name)
    url = DEFOG_BASE_URL + "/imgo_get_recommendation"
    res = await make_request(url, json={"api_key": api_key})
    return res
