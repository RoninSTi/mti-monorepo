# MTI WiFi Gateway Management System

Full-stack TypeScript monorepo for industrial vibration monitoring. Manages factories, gateways, and sensor data collection via CTC Connect Wireless gateways. Includes REST API backend with encrypted credential storage and React web application for configuration management.

## Prerequisites

- Node.js 18+
- Docker and Docker Compose (for PostgreSQL)
- npm

## Getting Started

This is a monorepo with two workspaces: `backend/` (REST API) and `frontend/` (React web app).

1. Clone the repository
2. Install all workspace dependencies:
   ```bash
   npm install
   ```
3. Start PostgreSQL:
   ```bash
   npm run docker:up
   ```
4. Copy environment configuration:
   ```bash
   cp .env.example backend/.env
   ```
   Review and update environment variables as needed (see Configuration section below).
5. Run database migrations:
   ```bash
   npm run db:migrate
   ```
6. Seed sample data:
   ```bash
   npm run db:seed
   ```
7. Start both backend and frontend:
   ```bash
   npm run dev
   ```

The API server will be available at `http://localhost:3000`.
The web application will be available at `http://localhost:5173`.

## Configuration

Create a `.env` file in the `backend/` directory with the following variables:

### Database Configuration

- `DATABASE_HOST` - PostgreSQL host (default: localhost)
- `DATABASE_PORT` - PostgreSQL port (default: 5432)
- `DATABASE_NAME` - Database name (default: mti_wifi)
- `DATABASE_USER` - Database user (default: postgres)
- `DATABASE_PASSWORD` - Database password (default: postgres)
- `DATABASE_URL` - Full PostgreSQL connection string (required by kysely-codegen)

### Encryption

- `ENCRYPTION_KEY` - AES-256 encryption key for gateway passwords (32-byte base64-encoded string). Generate with: `openssl rand -base64 32`. **IMPORTANT:** Use a unique key in production, do not use the example key.

### API Server

- `API_PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production/test)
- `CORS_ORIGIN` - Allowed CORS origins (use `*` for development, specific origins for production)
- `LOG_LEVEL` - Logging level (info/debug/warn/error)

### Gateway Connection (Legacy - Milestone 0)

- `GATEWAY_URL` - WebSocket URL of CTC Connect gateway
- `GATEWAY_EMAIL` - Gateway authentication email
- `GATEWAY_PASSWORD` - Gateway authentication password
- `SENSOR_SERIAL` - Sensor serial number for acquisition
- `CONNECTION_TIMEOUT` - Connection timeout in milliseconds (default: 10000)
- `COMMAND_TIMEOUT` - Command timeout in milliseconds (default: 30000)
- `ACQUISITION_TIMEOUT` - Acquisition timeout in milliseconds (default: 60000)
- `HEARTBEAT_INTERVAL` - Heartbeat interval in milliseconds (default: 30000)

## Available Scripts

All commands run from the repository root and use npm workspaces to route to the correct application.

### Development

- `npm run dev` - Start both backend API and frontend dev servers concurrently
- `npm run dev:api` - Start only the backend API server (port 3000)
- `npm run dev:frontend` - Start only the frontend dev server (port 5173)

### Production

- `npm run build` - Compile TypeScript to JavaScript
- `npm run start:api` - Start compiled API server
- `npm run start` - Start compiled gateway manager

### Testing

- `npm test` - Run test suite
- `npm run test:watch` - Run tests in watch mode

### Database

- `npm run db:migrate` - Run database migrations and regenerate types
- `npm run db:migrate:create` - Create a new migration file
- `npm run db:codegen` - Generate Kysely types from database schema
- `npm run db:seed` - Seed database with sample data
- `npm run db:reset` - Drop all data and recreate schema

### Docker

- `npm run docker:up` - Start PostgreSQL container
- `npm run docker:down` - Stop PostgreSQL container
- `npm run docker:reset` - Reset PostgreSQL container (destroys all data)

### Workspace Commands

To run commands in a specific workspace:

```bash
# Backend workspace
npm run dev --workspace=backend
npm test --workspace=backend

# Frontend workspace
npm run dev --workspace=frontend
npm run build --workspace=frontend
```

## API Endpoints

### Health Check

- `GET /api/health` - Health check endpoint
  - Returns 200 with status information
  - No authentication required

### Factories

- `POST /api/factories` - Create a new factory
  - Request body: `{ organization_id, name, location?, timezone, metadata? }`
  - Returns 201 with created factory
- `GET /api/factories` - List all factories
  - Query params: `limit` (default: 50), `offset` (default: 0)
  - Returns 200 with paginated list and metadata
- `GET /api/factories/:id` - Get factory by ID
  - Returns 200 with factory details, or 404 if not found
- `PUT /api/factories/:id` - Update factory
  - Request body: `{ name?, location?, timezone?, metadata? }`
  - Returns 200 with updated factory, or 404 if not found
- `DELETE /api/factories/:id` - Soft delete factory
  - Returns 204 on success, or 404 if not found
  - Soft-deleted factories are excluded from all queries

### Gateways

- `POST /api/gateways` - Create a new gateway
  - Request body: `{ factory_id, gateway_id, name, url, email, password, model?, firmware_version?, metadata? }`
  - Password is encrypted automatically before storage
  - Returns 201 with created gateway (password excluded from response)
- `GET /api/gateways` - List all gateways
  - Query params: `limit` (default: 50), `offset` (default: 0), `factory_id?` (UUID filter)
  - Returns 200 with paginated list and metadata
  - Use `factory_id` to filter gateways by factory
- `GET /api/gateways/:id` - Get gateway by ID
  - Returns 200 with gateway details (password excluded), or 404 if not found
- `PUT /api/gateways/:id` - Update gateway
  - Request body: `{ gateway_id?, name?, url?, email?, password?, model?, firmware_version?, metadata? }`
  - If password is provided, it is re-encrypted before storage
  - Returns 200 with updated gateway (password excluded), or 404 if not found
- `DELETE /api/gateways/:id` - Soft delete gateway
  - Returns 204 on success, or 404 if not found
  - Soft-deleted gateways are excluded from all queries

### Error Responses

All endpoints return standardized error responses:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "statusCode": 400,
    "details": {}
  }
}
```

Common error codes:
- `VALIDATION_ERROR` (400) - Invalid request body or parameters
- `FACTORY_NOT_FOUND` (404) - Factory not found
- `GATEWAY_NOT_FOUND` (404) - Gateway not found
- `INTERNAL_SERVER_ERROR` (500) - Server error with safe message

## Security

### Password Encryption

- Gateway passwords are encrypted at rest using AES-256-GCM authenticated encryption
- Each encryption uses a unique random IV (initialization vector) for maximum security
- Passwords are never returned in API responses
- Only the gateway connection manager can decrypt passwords for WebSocket authentication

### Error Handling

- All API error responses use safe messages
- Database errors do not leak credentials or sensitive information
- Request validation errors include field details but no sensitive data

## Project Structure

This monorepo uses npm workspaces to manage two applications:

```
.
├── backend/              # REST API workspace
│   ├── src/
│   │   ├── api/         # Fastify REST API server
│   │   │   ├── routes/  # API route handlers
│   │   │   ├── schemas/ # Zod validation schemas
│   │   │   └── plugins/ # Fastify plugins
│   │   ├── repositories/ # Data access layer (Kysely)
│   │   ├── database/    # Database config and types
│   │   ├── gateway/     # Gateway connection (Milestone 0)
│   │   └── utils/       # Shared utilities (encryption)
│   ├── migrations/      # Database migrations
│   ├── package.json     # Backend dependencies
│   └── .env            # Backend environment config
├── frontend/            # React web app workspace
│   ├── src/
│   │   ├── components/  # React components (UI, forms, layout)
│   │   ├── hooks/       # React Query hooks
│   │   ├── pages/       # Route page components
│   │   ├── lib/         # API client and utilities
│   │   └── types/       # TypeScript type definitions
│   ├── package.json     # Frontend dependencies
│   └── README.md       # Frontend-specific setup guide
├── package.json         # Workspace orchestrator
└── docker-compose.yml   # PostgreSQL container
```

**For detailed frontend setup, see [`frontend/README.md`](./frontend/README.md).**

## License

ISC
