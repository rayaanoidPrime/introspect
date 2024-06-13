CREATE TABLE IF NOT EXISTS defog_docs (
    doc_id text PRIMARY KEY,
    doc_md text,
    doc_blocks jsonb,
    editor_defog_blocks jsonb,
    api_key text NOT NULL,
    "timestamp" text,
    username text,
    doc_xml text,
    doc_uint8 jsonb,
    doc_title text,
    archived boolean default false
);

CREATE TABLE IF NOT EXISTS defog_recently_viewed_docs (
    username text PRIMARY KEY,
    api_key text NOT NULL,
    recent_docs jsonb
);

CREATE TABLE IF NOT EXISTS defog_reports (
    report_id text PRIMARY KEY,
    api_key text NOT NULL,
    email text,
    "timestamp" text,
    report_uuid text,
    approaches json,
    report_markdown text,
    clarify jsonb,
    understand jsonb,
    gen_approaches jsonb,
    user_question text,
    gen_report jsonb,
    gen_steps jsonb,
    follow_up_analyses jsonb,
    parent_analyses jsonb,
    -- if this is a root analysis
    -- "versions" of a root analysis will have this as false
    is_root_analysis boolean default true,
    -- if this is a root analysis, this will be null
    -- if this is a version of a root analysis, this will be the report_id of the root analysis
    root_analysis_id text,
    -- direct_parent_id: when a new analysis is created using the new agent, this will be the report_id of the immediate
    -- parent after which the new one is being created
    -- think of it as "create analysis B by ~tweaking~ analysis A". A is the direct parent of B
    direct_parent_id text,
    username text
);

CREATE TABLE IF NOT EXISTS defog_table_charts (
    table_id text PRIMARY KEY,
    data_csv jsonb,
    query text,
    chart_images jsonb,
    sql text,
    code text,
    tool jsonb,
    edited boolean,
    error text,
    reactive_vars jsonb
);

CREATE TABLE IF NOT EXISTS defog_tool_runs (
    tool_run_id text PRIMARY KEY,
    step jsonb,
    outputs jsonb,
    tool_name text,
    tool_run_details jsonb,
    error_message text,
    edited boolean,
    analysis_id text
);


CREATE TABLE IF NOT EXISTS defog_toolboxes (
    api_key text PRIMARY KEY,
    username text NOT NULL,
    toolboxes jsonb
);

CREATE TABLE IF NOT EXISTS defog_tools (
    tool_name TEXT PRIMARY KEY,
    function_name TEXT NOT NULL,
    description TEXT NOT NULL,
    code TEXT NOT NULL,
    input_metadata jsonb,
    output_metadata jsonb,
    toolbox TEXT,
    disabled BOOLEAN NOT NULL DEFAULT FALSE,
    cannot_delete BOOLEAN NOT NULL DEFAULT FALSE,
    cannot_disable BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS defog_users (
    username text PRIMARY KEY,
    hashed_password text,
    token text NOT NULL,
    user_type text NOT NULL,
    csv_tables text,
    is_premium boolean,
    created_at timestamp without time zone,
    is_verified boolean
);


CREATE TABLE IF NOT EXISTS defog_plans_feedback (
    analysis_id text PRIMARY KEY,
    api_key text NOT NULL,
    user_question text NOT NULL,
    username text NOT NULL,
    comments jsonb,
    is_correct boolean NOT NULL,
    -- join on this with the defog_reports.report_id table to get the actual plan data
    -- store for later reference. in case metadata changes later
    metadata text NOT NULL,
    client_description text,
    glossary text,
    db_type text NOT NULL
);