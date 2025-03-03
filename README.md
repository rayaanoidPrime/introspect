# Defog: Deep Research for Structured and Unstructured Internal Data

Defog does number-focused deep research for structured and unstructured data. It understands your structured data (databases or CSV/Excel files), unstructured data (PDFs), and can query the web to get additional context.

## Project Structure

- **`/backend`**: FastAPI Python server that handles AI processing, database connections, and API endpoints
- **`/frontend`**: Next.js web application providing the user interface
- **`/datasets`**: Sample datasets for testing and demonstration
- **`/nginx`**: Configuration files for the web server

## Quick Start

1. Set up environment variables:

(this might be incorrect right now - will fix soon!)
```bash
# Create a .env file or export directly
ADMIN_USERNAME=admin  # default
ADMIN_PASSWORD=admin  # default

OPENAI_API_KEY="YOUR_OPENAI_API_KEY"
ANTHROPIC_API_KEY="YOUR_ANTHROPIC_API_KEY"
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"

2. Start all services using Docker Compose:
```bash
docker-compose up
```

3. Access the application:
   - Frontend UI: http://localhost:80 (or custom PORT)
   - Backend API: http://localhost:1235

## Development

For development workflows and more detailed instructions, see the README files in the `/backend` and `/frontend` directories.

## Supported Databases

Defog supports various database connectors including PostgreSQL, MySQL, SQLite, BigQuery, Redshift, Snowflake, and Databricks.

## Supported LLM Providers

Defog supports multiple LLM providers including OpenAI, Anthropic, and Google's Gemini.