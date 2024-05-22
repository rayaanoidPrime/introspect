export const tempSuggestion = {
  success: true,
  did_overwrite: true,
  suggested_improvements:
    "The identified issue with the original plan is that the `data_fetcher_and_aggregator` tool is used to fetch 5 random rows from the dataset. This tool is designed to convert a natural language question into a SQL query and run it on an external database, but it does not inherently support random row selection as SQL itself does not have a built-in function for fetching random rows without specifying a method for randomness (like ORDER BY RANDOM() in some SQL dialects).\n\nTo address this issue, the plan should ideally include a step that explicitly mentions how to fetch random rows if the SQL dialect supports it, or it should use a different approach or tool that can handle random selection post data fetching if SQL random selection is not feasible.\n\nHere's an updated plan that assumes the SQL dialect supports fetching random rows using an ORDER BY clause:\n\n```yaml\n- done: true\n  error_message: null\n  model_generated_inputs:\n    question: Fetch 5 rows from the dataset ordered randomly\n  outputs_storage_keys:\n  - random_rows\n  tool_name: data_fetcher_and_aggregator\n```\n\nThis plan specifies that the rows should be ordered randomly, which is a common method to fetch random rows in SQL by using functions like `ORDER BY NEWID()` (in MS SQL Server) or `ORDER BY RANDOM()` (in SQLite, PostgreSQL). Adjust the SQL function according to the specific SQL dialect used by the external database.",
  recommended_plan: [
    {
      done: true,
      error_message: null,
      model_generated_inputs: {
        question: "Fetch 5 rows from the dataset ordered randomly",
      },
      outputs_storage_keys: ["random_rows"],
      tool_name: "data_fetcher_and_aggregator",
      tool_run_id: "1c73cb2b-2929-4af1-9a23-9182fa560f5b",
      inputs: {
        question: "Fetch 5 rows from the dataset ordered randomly",
      },
    },
  ],
  new_analysis_id: "bc9bf84c-9413-450d-8892-84b2c18e5787",
  new_analysis_data: {
    user_question: "show me 5 random rows",
    timestamp: "2024-05-22 11:28:56.485614",
    report_id: "bc9bf84c-9413-450d-8892-84b2c18e5787",
    api_key: "genmab-survival-test",
    username: "admin",
    gen_steps: {
      success: true,
      steps: [
        {
          done: true,
          error_message: null,
          model_generated_inputs: {
            question: "Fetch 5 rows from the dataset ordered randomly",
          },
          outputs_storage_keys: ["random_rows"],
          tool_name: "data_fetcher_and_aggregator",
          tool_run_id: "1c73cb2b-2929-4af1-9a23-9182fa560f5b",
          inputs: {
            question: "Fetch 5 rows from the dataset ordered randomly",
          },
        },
      ],
    },
    clarify: {
      success: true,
      clarification_questions: [],
    },
  },
};
