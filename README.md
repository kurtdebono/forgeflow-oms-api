# ForgeFlow OMS

ForgeFlow OMS is a full-stack order-management portfolio project built with NestJS, Next.js, Prisma, PostgreSQL and TypeScript.

The project demonstrates production-style backend engineering rather than a simple CRUD flow. It includes authentication, role-based access control, inventory reservation, idempotent order creation, outbox-style event handling, AI-assisted order analysis, email-notification abstraction, automated tests and GitHub Actions CI.

## What This Project Demonstrates

ForgeFlow OMS is designed to show practical engineering judgement across a realistic order workflow:

- Safe write operations using idempotency keys.
- Atomic inventory reservation to avoid overselling.
- Clear separation between HTTP, service, persistence and infrastructure layers.
- Runtime validation of external AI output before persistence.
- Deterministic business rules kept separate from AI-assisted recommendations.
- Provider abstractions for OpenAI and email delivery.
- Unit/e2e testing and CI-backed quality gates.
- A Next.js dashboard for operations-style workflows.

## Architecture

ForgeFlow is structured as a full-stack order-management system with a NestJS backend, a Next.js operations dashboard, PostgreSQL persistence, Redis-backed infrastructure, and pluggable external providers for AI and email.

```mermaid
flowchart LR
        User[Operations User / Admin] --> Dashboard[Next.js Dashboard]

        Dashboard -->|HTTP / JSON| Api[NestJS API]

        Api --> Auth[Auth & RBAC]
        Api --> Orders[Orders Module]
        Api --> Products[Products Module]
        Api --> Inventory[Inventory Module]
        Api --> Intelligence[Order Intelligence Module]

        Orders --> Idempotency[Idempotency Module]
        Orders --> Outbox[Outbox Module]
        Orders --> Database[(PostgreSQL / Prisma)]

        Products --> Cache[(Redis Cache)]
        Products --> Database

        Inventory --> Database
        Idempotency --> Database
        Intelligence --> Database

        Intelligence -->|Structured prompt| AIProvider[AI Provider]
        AIProvider --> FakeAI[Fake Provider]
        AIProvider --> OpenAI[OpenAI Provider]

        Intelligence --> Notifications[Notifications Module]
        Notifications --> EmailProvider[Email Provider]
        EmailProvider --> FakeEmail[Fake Provider]
        EmailProvider --> Resend[Resend Provider]

        Outbox --> Queue[Redis / BullMQ]
        Queue --> Worker[Background Worker]
```

## AI Order Intelligence Flow

```mermaid
sequenceDiagram
        participant User as Operations User
        participant Dashboard as Next.js Dashboard
        participant API as NestJS API
        participant Orders as Orders Service
        participant AI as AI Provider
        participant Zod as Zod Validation
        participant DB as PostgreSQL
        participant Email as Notification Provider

        User->>Dashboard: Generate order analysis
        Dashboard->>API: POST /order-intelligence/:orderId/analyze
        API->>Orders: Load order details
        Orders-->>API: Order with items and customer context

        API->>AI: Send controlled order context
        AI-->>API: Structured analysis response
        
        API->>Zod: Validate AI response schema

        alt Valid response
                Zod-->>API: Parsed analysis
                API->>DB: Store order analysis

                alt High priority
                        API->>Email: Send manual review alert
                end

                API-->>Dashboard: Analysis resultperfe
        else Invalid response
                Zod-->>API: Validation failure
                API-->>Dashboard: Bad Gateway response
        end
```

The backend keeps core business behaviour deterministic. AI is used to assist operations users by generating order analysis, but order state transitions, inventory changes and authorization rules remain controlled by application logic.

## Dashboard Preview

The Next.js dashboard providers an operations-facing interface for reviewing operations-facing interface for reviewing orders and generating AI-assisted order analysis.

### Orders List

![Orders list](docs/images/orders-list.png)

### Order Details

![Orders details](docs/images/order-detail.png)

### AI Order Analysis

![AI order analysis](docs/images/order-analysis.png)

## Repository Structure

```text
.
├── .github/
│   └── workflows/
│       └── ci.yml
├── forgeflow-oms-api/          # NestJS backend API
├── forgeflow-oms-dashboard/    # Next.js operations dashboard
└── README.md
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
- OpenAI provider integration
- Resend email provider integration
- Jest and Supertest

### Frontend

- Next.js
- React
- TypeScript
- Custom async hooks
- JWT-aware API client
- Operations dashboard UI

### Quality and Tooling

- pnpm
- ESLint
- TypeScript type checking
- Prisma migrations
- Unit tests
- E2E tests
- GitHub Actions CI
- Strict linting around unsafe `any` usage

## Core Features

### Authentication and Authorization

The API supports JWT-based authentication with access and refresh tokens. Protected routes use role-based access control.

Supported roles:

```text
CUSTOMER
ADMIN
```

Examples:

- Public users can read products.
- Admins can create products and manage inventory.
- Customers can create orders.
- Admins can confirm orders.
- Customers cannot confirm orders.

### Product Catalogue

Products can be read publicly and created by admins. Product reads use a cache-aside approach with Redis, while transactional order flows can bypass cache and read directly from the database.

### Inventory Reservation

Inventory is reserved when an order is created. The reservation uses an atomic database update so that stock availability is checked and updated safely.

```text
Create order   → decrease available quantity, increase reserved quantity
Confirm order  → consume reserved quantity
Cancel order   → release reserved quantity back to available quantity
```

This protects the order workflow from overselling in concurrent scenarios.

### Order Lifecycle

Orders follow a controlled lifecycle:

```text
PENDING → CONFIRMED
PENDING → CANCELLED
```

Order items store snapshot values such as quantity and unit price, so historical orders remain consistent even if product data changes later.

### Idempotent Order Creation

`POST /orders` requires an `Idempotency-Key` header.

This prevents duplicate orders when a client retries the same request due to refreshes, double-clicks, timeouts or network issues.

Behaviour:

```text
Same user + same operation + same key + same body
→ returns the original order

Same user + same operation + same key + different body
→ returns 409 Conflict

Missing Idempotency-Key
→ returns 400 Bad Request
```

### Outbox Event Handling

When an order is confirmed, the backend creates an outbox event in the same database transaction as the order update.

This avoids a common reliability issue where a database transaction succeeds but queue publishing fails afterward.

Example event:

```text
ORDER_CONFIRMED
```

The outbox publisher can later process pending events and enqueue background jobs safely.

### AI Order Intelligence

The Order Intelligence module generates an AI-assisted analysis for an order.

The AI provider receives a controlled order context instead of raw database records. The AI response is then validated with Zod before being stored.

Stored analysis includes:

- Summary
- Priority: `LOW`, `MEDIUM`, `HIGH`
- Risk flags
- Missing information
- Recommended actions
- Customer-facing explanation
- Provider metadata
- Model metadata

Important design decision:

```text
AI output is treated as untrusted until validated.
```

Invalid AI output is rejected before persistence.

### Email Notification Workflow

When an AI analysis is marked as high priority, the system can send an internal manual-review alert.

Supported email providers:

- Fake provider for local development and CI.
- Resend provider for real email delivery.

The system is designed so that a failed email notification does not remove or roll back a successfully stored AI analysis.

### Operations Dashboard

The Next.js dashboard provides an operations-facing UI for:

- Logging in.
- Viewing orders.
- Viewing order details.
- Generating AI order analysis.
- Reviewing AI priority, risk flags, missing information and recommended actions.

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
cp .env.example .env
```

Generate the Prisma client:

```bash
pnpm prisma generate --schema src/infrastructure/database/prisma/schema.prisma
```

Run database migrations:

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

### Backend Environment Variables

Example values are provided in `.env.example`.

```env
PORT=3001
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/forgeflow_oms?schema=public"
REDIS_URL="redis://localhost:6379"
REDIS_HOST="localhost"
REDIS_PORT=6379
JWT_SECRET="replace-with-a-secure-secret"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
AI_PROVIDER="fake"
OPENAI_API_KEY=""
OPENAI_MODEL="gpt-5-mini"
OPENAI_TIMEOUT_MS=15000
EMAIL_PROVIDER="fake"
RESEND_API_KEY=""
RESEND_FROM_EMAIL="ForgeFlow <onboarding@resend.dev>"
OPS_REVIEW_EMAIL="ops@example.com"
```

For local development and CI, `AI_PROVIDER=fake` and `EMAIL_PROVIDER=fake` allow the system to run without OpenAI or Resend secrets.

## Dashboard Setup

From the dashboard folder:

```bash
cd forgeflow-oms-dashboard
pnpm install
cp .env.local.example .env.local
pnpm dev
```

Dashboard environment:

```env
NEXT_PUBLIC_API_BASE_URL="http://localhost:3001"
```

Default dashboard URL:

```text
http://localhost:3000
```

## Testing and Quality Checks

### Backend

```bash
cd forgeflow-oms-api
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm build
```

### Dashboard

```bash
cd forgeflow-oms-dashboard
pnpm lint
pnpm build
```

## CI Pipeline

The GitHub Actions workflow validates the project in a clean environment.

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

CI uses fake AI and email providers, so no OpenAI or Resend secrets are required for automated checks.

## E2E Coverage

The e2e test suite covers important workflows, including:

- Authentication and login behaviour.
- Role-protected product creation.
- Public product reads.
- Admin-only inventory endpoints.
- Customer order creation.
- Admin order confirmation.
- Inventory reservation behaviour.
- Required idempotency key validation.
- Duplicate order prevention.
- Idempotency key conflict detection.
- Outbox event creation for confirmed orders.

## Design Decisions

### AI is advisory, not authoritative

The AI module supports operations users, but it does not control order state transitions or inventory updates. Business-critical behaviour remains deterministic and testable.

### External output is validated at runtime

OpenAI output is treated as untrusted data. The response is validated with Zod before persistence.

### Write operations are protected from duplicate requests

Order creation uses idempotency records so that retries do not create duplicate orders or reserve inventory multiple times.

### Events are created transactionally

Order confirmation creates an outbox event inside the same database transaction as the order status update.

### Providers are abstracted

AI and email integrations are behind provider interfaces. This allows local development and CI to use fake providers while production-like environments can use OpenAI and Resend.

## Project Status

Completed:

- NestJS backend architecture.
- PostgreSQL and Prisma integration.
- JWT authentication and refresh token flow.
- Role-based authorization.
- Product, inventory and order workflows.
- Atomic inventory reservation.
- Idempotent order creation.
- Outbox event creation.
- AI order analysis module.
- OpenAI provider integration.
- Resend notification workflow.
- Next.js dashboard core flow.
- Unit and e2e test coverage.
- GitHub Actions CI.
- Strict TypeScript and ESLint cleanup.

Future improvements:

- Docker Compose and seed data for repeatable local demos
- Swagger/OpenAPI documentation for easier API exploration
- Pagination and filtering for order-management workflows
- Correlation IDs and structured request logging
- Full outbox-backed notification delivery with retries and dead-letter handling

## Portfolio Summary

ForgeFlow OMS demonstrates how to build a full-stack TypeScript system with realistic backend concerns: authentication, authorization, transactions, inventory consistency, idempotency, outbox events, AI validation, email notifications, automated testing and CI.

The project is intentionally designed to show senior engineering judgement: protecting critical write operations, validating untrusted external output, separating business logic from infrastructure concerns, and backing the system with automated quality checks.