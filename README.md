# ForgeFlow OMS

ForgeFlow OMS is a full-stack order-management portfolio project built to demonstrate production-style backend architecture, clean TypeScript practices, authentication, inventory reservation, idempotent order creation, asynchronous event handling, AI-assisted order analysis, and a Next.js operations dashboard.

The project is designed as a realistic learning and portfolio system rather than a minimal CRUD demo. It shows how a NestJS backend can handle order workflows safely while keeping deterministic business rules separate from AI-assisted recommendations.

## Project Overview

ForgeFlow OMS allows users to:

- Register and log in with JWT-based authentication.
- Browse products publicly.
- Create orders as authenticated customers.
- Reserve inventory atomically when an order is created.
- Confirm or cancel orders with role-based permissions.
- Prevent duplicate order creation through idempotency keys.
- Emit order-confirmed events through an outbox pattern.
- Generate AI-assisted order intelligence for operations users.
- Send manual-review email alerts for high-priority AI analyses.
- Review orders and analyses through a Next.js dashboard.

## Architecture

```text
forgeflow-oms-api/
├── .github/
│   └── workflows/
│       └── ci.yml
├── forgeflow-oms-api/          # NestJS backend API
└── forgeflow-oms-dashboard/    # Next.js operations dashboard
```

High-level flow:

```text
Next.js Operations Dashboard
        ↓
NestJS ForgeFlow OMS API
        ↓
Prisma + PostgreSQL
        ↓
Redis / BullMQ / Outbox
        ↓
OpenAI + Resend
```

## Tech Stack

### Backend

- NestJS
- TypeScript
- Prisma 7
- PostgreSQL
- Redis
- BullMQ
- JWT authentication
- bcrypt password hashing
- Zod runtime validation
- OpenAI integration
- Resend email integration
- Jest and Supertest

### Frontend

- Next.js
- React
- TypeScript
- Client/server component split
- Custom async hooks
- API wrapper with JWT support

### Infrastructure and Quality

- GitHub Actions CI
- pnpm
- Prisma migrations
- ESLint
- TypeScript type checking
- Unit and e2e tests
- Strict linting with unsafe `any` checks

## Core Backend Features

### Authentication

The API includes JWT-based authentication with access and refresh tokens.

Supported flows:

- Register user
- Login user
- Refresh token rotation
- Logout / clear refresh token
- Role-based authorization

Roles:

```ts
CUSTOMER
ADMIN
```

### Role-Based Access Control

The backend uses guards and decorators to protect routes.

Examples:

- Product creation requires `ADMIN`.
- Inventory management requires `ADMIN`.
- Order creation is available to authenticated customers and admins.
- Order confirmation requires `ADMIN`.
- Customers cannot confirm orders.

### Product Catalogue

Products can be read publicly and created by admins.

Product reads use cache-aside Redis caching. Transactional flows can bypass cache and read directly from the database when required.

### Inventory Reservation

Inventory is reserved during order creation using an atomic database update.

The reservation flow prevents overselling by checking and decrementing available stock in the same operation.

Order lifecycle inventory behaviour:

```text
Create order   → decrement available quantity, increment reserved quantity
Confirm order  → decrement reserved quantity
Cancel order   → release reserved quantity back to available quantity
```

### Order Management

Orders support a controlled lifecycle:

```text
PENDING → CONFIRMED
PENDING → CANCELLED
```

The order stores item snapshots, including quantity and unit price, so historical order totals are preserved even if the product price changes later.

### Idempotent Order Creation

`POST /orders` requires an `Idempotency-Key` header.

This prevents duplicate orders if the same request is retried by the client.

Behaviour:

```text
Same user + same operation + same key + same body
→ returns the original order

Same user + same operation + same key + different body
→ returns 409 Conflict

Missing Idempotency-Key
→ returns 400 Bad Request
```

This is especially useful for checkout/order flows where a user might double-click, refresh, retry after a timeout, or experience a temporary network failure.

### Outbox Pattern

When an order is confirmed, the API creates an outbox event in the same database transaction as the order status update.

This avoids the classic failure case where the database commit succeeds but queue publishing fails.

Example event:

```text
ORDER_CONFIRMED
```

The outbox publisher can later process pending events and enqueue background jobs safely.

### AI Order Intelligence

The Order Intelligence module generates an AI-assisted analysis for an order.

The AI provider receives a controlled order context, not raw database records.

The response is validated with Zod before being stored.

Stored analysis includes:

- Summary
- Priority: `LOW`, `MEDIUM`, `HIGH`
- Risk flags
- Missing information
- Recommended actions
- Customer-facing explanation
- Provider metadata
- Model metadata

Important design rule:

```text
AI assists operations decisions, but deterministic business rules stay in the backend.
```

Invalid AI output is rejected before persistence.

### Email Notifications

When an AI analysis is marked as high priority, the system can send an internal manual-review alert.

Email providers:

- Fake provider for local development and CI
- Resend provider for real email delivery

The system is designed so that analysis persistence is not lost if email delivery fails.

## Dashboard Features

The Next.js dashboard provides an operations-facing UI for:

- Logging in
- Viewing orders
- Viewing order details
- Generating AI order analysis
- Displaying analysis priority, risk flags, missing information, and recommended actions

The dashboard communicates with the NestJS API using a configured API base URL.

## Local Development

### Prerequisites

- Node.js 22+
- pnpm
- Docker
- PostgreSQL
- Redis

### Start PostgreSQL

```bash
docker run --name forgeflow-oms-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=forgeflow_oms \
  -p 5432:5432 \
  -d postgres:16
```

### Start Redis

```bash
docker run --name forgeflow-oms-redis \
  -p 6379:6379 \
  -d redis:7-alpine
```

## Backend Setup

From the backend folder:

```bash
cd forgeflow-oms-api
pnpm install
```

Create an environment file:

```bash
cp .env.example .env
```

Example backend environment values:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/forgeflow_oms?schema=public"

JWT_SECRET="local-development-secret"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

REDIS_URL="redis://localhost:6379"
REDIS_HOST="localhost"
REDIS_PORT="6379"

AI_PROVIDER="fake"
OPENAI_API_KEY=""
OPENAI_MODEL="gpt-5-mini"
OPENAI_TIMEOUT_MS="15000"

EMAIL_PROVIDER="fake"
RESEND_API_KEY=""
RESEND_FROM_EMAIL="ForgeFlow <onboarding@resend.dev>"
OPS_REVIEW_EMAIL="ops@example.com"
```

Generate Prisma client:

```bash
pnpm prisma generate --schema src/infrastructure/database/prisma/schema.prisma
```

Run migrations:

```bash
pnpm prisma migrate dev --schema src/infrastructure/database/prisma/schema.prisma
```

Start the backend API:

```bash
pnpm start:dev
```

Default backend URL:

```text
http://localhost:3001
```

## Dashboard Setup

From the dashboard folder:

```bash
cd forgeflow-oms-dashboard
pnpm install
```

Create `.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

Start the dashboard:

```bash
pnpm dev
```

Default dashboard URL:

```text
http://localhost:3000
```

## Common Commands

### Backend

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm build
```

### Dashboard

```bash
pnpm lint
pnpm build
```

## Testing

The backend includes unit and e2e coverage for important workflows, including:

- Auth login and token behaviour
- Role-protected product creation
- Public product reads
- Admin-only inventory endpoints
- Customer order creation
- Admin order confirmation
- Inventory reservation and release behaviour
- Required idempotency key validation
- Duplicate order prevention
- Idempotency-key conflict detection
- Outbox event creation for confirmed orders

## CI Pipeline

The GitHub Actions pipeline validates the project in a clean environment.

Backend CI checks:

```text
install dependencies
Prisma generate
Prisma migrate deploy
typecheck
lint
tests
build
```

Dashboard CI checks:

```text
install dependencies
lint
build
```

CI uses fake AI and email providers, so no OpenAI or Resend secrets are required for test execution.

## Design Principles

This project intentionally focuses on production-style patterns:

- Clear module boundaries
- Controllers for HTTP concerns
- Services for orchestration and business rules
- Repositories for persistence
- Explicit DTO validation
- Prisma payload types instead of unsafe `any`
- Runtime validation for external AI output
- Transaction-safe order creation
- Idempotent write operations
- Outbox-based asynchronous event handling
- Role-based access control
- CI-backed quality gates

## Project Status

Completed:

- NestJS backend architecture
- PostgreSQL and Prisma integration
- Authentication and authorization
- Product, inventory, and order workflows
- Idempotent order creation
- Outbox event creation
- AI order analysis module
- OpenAI provider integration
- Resend notification workflow
- Next.js dashboard core flow
- GitHub Actions CI
- Strict lint/typecheck cleanup

Potential future improvements:

- Replace direct high-priority email sending with outbox-backed notification events
- Add pagination and filtering to order list endpoints
- Add structured API documentation with Swagger/OpenAPI
- Add seed scripts for demo data
- Add dashboard deployment documentation
- Add more detailed observability with request correlation IDs
- Add retry and dead-letter handling for background jobs

## Portfolio Summary

ForgeFlow OMS demonstrates how to build a full-stack TypeScript system with realistic backend concerns such as authentication, authorization, transactions, inventory consistency, idempotency, outbox events, AI validation, email notifications, automated testing, and CI.

The project is intended to show senior-level engineering judgement: keeping business rules deterministic, treating AI output as untrusted, protecting write operations from duplicate requests, and validating the system through automated quality checks.
