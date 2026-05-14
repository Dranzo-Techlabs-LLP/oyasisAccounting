# OasisGo Holidays

Travel & Tourism Booking and Accounting Management System built with React, Express, Prisma, and MySQL.

## Stack

- Frontend: React + Vite + Tailwind CSS
- Backend: Node.js + Express
- ORM: Prisma
- Database target: MySQL
- Auth: JWT in httpOnly cookie
- Charts: Recharts
- Invoice output: PDFKit

## Project Structure

- `client` - React dashboard
- `server` - Express API and Prisma schema

## Quick Start

1. Install dependencies:

```bash
PATH="/Users/shinky777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/Users/shinky777/Library/pnpm:$PATH" pnpm install
```

2. Start the frontend:

```bash
PATH="/Users/shinky777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/Users/shinky777/Library/pnpm:$PATH" pnpm --filter client dev
```

3. Open:

```text
http://localhost:5173
```

## Demo Mode

If the API is unavailable, the frontend automatically falls back to local mock data stored in `localStorage`. This keeps the UI usable for review in environments where MySQL is not installed or not reachable yet.

Demo login:

- Email: `admin@oasisgoholidays.com`
- Password: `Admin@123`

## Full Backend Setup

1. Copy `.env.example` to `.env`
2. Set a working MySQL `DATABASE_URL`
3. Generate Prisma client:

```bash
PATH="/Users/shinky777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/Users/shinky777/Library/pnpm:$PATH" pnpm --filter server exec prisma generate
```

4. Push schema:

```bash
PATH="/Users/shinky777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/Users/shinky777/Library/pnpm:$PATH" pnpm --filter server exec prisma db push
```

5. Seed sample data:

```bash
PATH="/Users/shinky777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/Users/shinky777/Library/pnpm:$PATH" pnpm --filter server seed
```

6. Start the API:

```bash
PATH="/Users/shinky777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/Users/shinky777/Library/pnpm:$PATH" pnpm --filter server dev
```

## Notes

- Monetary values are formatted in INR.
- Dates are rendered in `DD/MM/YYYY`.
- Invoice numbers use `OGH-YYYY-0001`.
- Booking IDs use `BK-00001`.
