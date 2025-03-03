# Defog Self-Hosted Backend

The backend component of Defog Self-Hosted is a FastAPI Python server that handles natural language processing, SQL generation, database connections, and API endpoints.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set environment variables:
```bash
# Create a .env file or export directly
ADMIN_USERNAME=admin  # default
ADMIN_PASSWORD=admin  # default
```

## Running the Backend

### Development Mode
```bash
PROD=no python -m hypercorn main:app -b 0.0.0.0:1235 --reload
```

### Production Mode
```bash
PROD=yes python -m hypercorn main:app -b 0.0.0.0:1235
```

Or use the startup script:
```bash
./startup.sh
```

## Testing
```bash
# Run pytest with coverage report
pytest tests/ -v --cov=.
```

## Key Components

- **API Routes**: Endpoints for authentication, database connections, queries, and more
- **Database Utilities**: Connectors and utilities for various database systems
- **Query Processing**: AI-powered natural language to SQL conversion
- **Oracle**: Advanced analytics and data insights engine