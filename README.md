# `example-prisma-postgres`

Minimal JavaScript + PostgreSQL + Prisma project testing `prisma-safe-query` against a real PostgreSQL database.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure `.env` with your PostgreSQL connection string (see `.env.example`):
   ```bash
   cp .env.example .env
   ```
3. Push the Prisma schema and generate Prisma Client:
   ```bash
   npm run db:push
   npm run db:generate
   ```
4. Run the integration tests:
   ```bash
   npm test
   ```
