#  🔬 Defog Introspect: Deep Research for your internal data

Introspect is a service that does data-focused deep research for structured data. It understands your structured data (databases or CSV/Excel files), unstructured data (PDFs), and can query the web to get additional context.

## Project Structure

- **`/backend`**: FastAPI Python server that handles AI processing, database connections, and API endpoints
- **`/frontend`**: Next.js web application providing the user interface
- **`/nginx`**: Configuration files for the web server

## Quick Start

1. Set up environment variables:

```bash
# Create a .env file in your root folder
OPENAI_API_KEY="YOUR_OPENAI_API_KEY"
ANTHROPIC_API_KEY="YOUR_ANTHROPIC_API_KEY"
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
```

2. Start all services using Docker Compose:
```bash
docker compose up --build
```

3. Access the application:
   - Main application: http://localhost:80
   - Standalone Backend API: http://localhost:1235

## Development

For development workflows and more detailed instructions, see the README files in the `/backend` and `/frontend` directories.

## Supported Databases

Defog supports most database connectors including PostgreSQL, MySQL, SQLite, BigQuery, Redshift, Snowflake, and Databricks – and also includes support for CSV and Excel files.

## Docs
Coming soon

## To do

- [ ] Create Docs
- [ ] Have an option to replace Google/Gemini based web search tool with Perplexity
- [ ] Let users choose what model they want for which task from the `.env. file
