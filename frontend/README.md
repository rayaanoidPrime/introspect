
# Defog Self-Hosted Frontend

The frontend component of Defog Self-Hosted is a Next.js web application that provides the user interface for interacting with the Defog platform.

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Configure environment:
```bash
# Create a .env.local file with these variables
NEXT_PUBLIC_API_URL=http://localhost:1235
```

## Running the Frontend

### Development Mode
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm run start
```

### Export Static Build
```bash
npm run export
```

## Testing
```bash
# Run Playwright tests
npx playwright test
```

## Key Components

- **Authentication**: User login and account management
- **Query Interface**: Natural language query input and SQL/chart visualization
- **Database Management**: Database credential setup and metadata extraction
- **Alignment Tools**: Instruction and golden query management for model tuning