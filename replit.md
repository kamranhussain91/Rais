# Rais Motors — Showroom Management

A modern web app for managing a motorcycle showroom (Pakistan), replacing an outdated PHP system.

## Stack

- **Monorepo**: pnpm workspace (catalog versioning).
- **Frontend** (`artifacts/rais-motors`): React + Vite + Wouter + TanStack Query, shadcn/ui, Tailwind v4, next-themes, recharts, framer-motion, react-hook-form + Zod, lucide-react, date-fns.
- **Backend** (`artifacts/api-server`): Express 5 + Drizzle ORM + PostgreSQL, pino logging, cookie-based sessions.
- **API Contract**: `lib/api-spec/openapi.yaml` -> generates `@workspace/api-zod` schemas + `@workspace/api-client-react` hooks.
- **DB schemas**: `lib/db/src/schema/{users,sessions,bikes,customers,sales,payments}.ts`.

## Auth

- Cookie session (`rm_session`, HttpOnly, SameSite=Lax, 30-day TTL).
- scrypt password hashing via Node crypto (no bcrypt dependency).
- Demo credentials: **admin / admin123** (seeded).

## Theming

- Both light and dark modes are first-class. Toggle is in the app header.
- `next-themes` with `attribute="class"`, default `system`.
- Brand accent (amber/gold `hsl(38 92% 50%)`) is the primary color in both themes.
- All HSL tokens are filled in `artifacts/rais-motors/src/index.css`.

## Currency / Locale

- All amounts are PKR. `formatPKR(n)` renders as `Rs 152,000`.
- Dates via `formatDate()` -> "Apr 25, 2026" (date-fns).

## Pages

- `/login` — split-panel sign in.
- `/` — Dashboard: KPI tiles, monthly revenue area chart, weekly sales bar chart, best sellers, recent sales, pending payments.
- `/inventory`, `/inventory/:id` — Bike CRUD with stock indicators and per-bike sales history.
- `/customers`, `/customers/:id` — Customer CRUD with totals and full sales history.
- `/sales`, `/sales/:id` — Sales CRUD, payment recording, printable receipt (uses `window.print()` + print stylesheet).
- `/settings` — account info + logout.

## Seed / Import

- `pnpm --filter @workspace/scripts run seed` resets to a tiny demo seed.
- `pnpm --filter @workspace/scripts run import-backup` resets and imports the legacy MySQL backup from `/tmp/dbbackup/my_db_backup.sql`:
  1347 customers, 20 bikes (prices averaged from historical sales), 1451 cash sales, 1026 installment sales (as outstanding balances). Admin: `admin / admin123`.

## Admin / Export endpoints

All require authentication.
- `GET /api/export/report` → JSON of customers/bikes/sales/payments + totals summary.
- `GET /api/export/csv?table=sales|customers|bikes|payments` → CSV.
- `GET /api/export/backup` → SQL dump (INSERTs) of all tables. Filenames include date+time.
- All wired into the Settings page as download buttons.

## Print receipt

`@media print` in `index.css` hides everything except elements inside `.printable-receipt` so the invoice prints cleanly without the app shell. Sale detail page wraps its receipt Card in `.printable-receipt`.

## Workflows

- `artifacts/api-server: API Server` — Express on port 8080.
- `artifacts/rais-motors: web` — Vite dev for the frontend.

## Notes / Conventions

- Numeric DB columns use `numeric(12,2)`; `lib/api-server/src/lib/serialize.ts` casts them to `number` for JSON responses.
- `lib/api-client-react/src/custom-fetch.ts` already sends `credentials: "include"` for session cookies.
- Generated query hooks require `queryKey` in the options — pages pass `{ query: { queryKey: getXQueryKey(...), enabled: ... } }`.
