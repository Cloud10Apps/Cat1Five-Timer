# Elevator Inspection Tracker

## Overview

Multi-tenant SaaS platform for managing elevator inspections, compliance schedules, and reporting.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/elevator-tracker)
- **Styling**: Tailwind CSS + shadcn/ui
- **State/data fetching**: TanStack React Query (generated hooks)
- **API framework**: Express 5 (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (zod/v4), drizzle-zod
- **Auth**: JWT + bcryptjs
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (ESM bundle)
- **Excel export**: ExcelJS
- **Date handling**: dayjs
- **Payments**: Stripe (via Replit integration) + stripe-replit-sync

## Architecture

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express 5 API server
│   │   └── src/
│   │       ├── middleware/auth.ts      # JWT middleware
│   │       └── routes/
│   │           ├── auth.ts            # POST /auth/login, GET /auth/me
│   │           ├── customers.ts       # CRUD /customers
│   │           ├── buildings.ts       # CRUD /buildings
│   │           ├── elevators.ts       # CRUD /elevators
│   │           ├── inspections.ts     # CRUD /inspections
│   │           ├── dashboard.ts       # GET /dashboard/summary|attention|status-breakdown|overdue-by-building
│   │           ├── users.ts           # Admin user management
│   │           └── export.ts          # Excel export /export/inspections|elevators
│   └── elevator-tracker/   # React + Vite frontend
│       └── src/
│           ├── pages/                 # login, dashboard, customers, buildings, elevators, inspections, calendar, reports, admin, settings
│           └── components/            # layout, auth-provider, status-badge, UI components
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas
│   └── db/                 # Drizzle ORM schema + DB connection
│       └── src/schema/
│           ├── organizations.ts
│           ├── users.ts
│           ├── customers.ts
│           ├── buildings.ts
│           ├── elevators.ts
│           └── inspections.ts
└── scripts/                # Utility scripts
    └── src/seed.ts         # Database seeder
```

## Multi-Tenant Model

- Each account = Organization
- All DB queries include `WHERE organization_id = current_user.organization_id`
- JWT token contains: { id, email, role, organizationId }

## Auth

- POST /api/auth/login — returns JWT token
- Token stored in localStorage as "token"
- All requests include `Authorization: Bearer <token>`
- Roles: ADMIN (full access + user management), USER (view + update inspections)

## Seed Data

Run: `pnpm --filter @workspace/scripts run seed`

Default accounts:
- Admin: admin@acme.com / admin123
- Inspector: inspector@acme.com / user123

## Key Business Logic

- next_due_date = last_inspection_date + recurrence_years
- Status auto-computed: if next_due_date < today and not COMPLETED → OVERDUE
- CAT1 inspection type: 1-year recurrence (typical)
- CAT5 inspection type: 5-year recurrence

## API Endpoints

- POST /api/auth/login
- GET /api/auth/me
- CRUD /api/customers, /api/buildings, /api/elevators, /api/inspections
- GET /api/dashboard/summary|attention|status-breakdown|overdue-by-building
- GET/PUT /api/users, POST /api/users/invite
- GET /api/export/inspections?customerId=&buildingId=&status=&inspectionType=
- GET /api/export/elevators?customerId=&buildingId=

## Running

- Frontend: `pnpm --filter @workspace/elevator-tracker run dev`
- API: `pnpm --filter @workspace/api-server run dev`
- Seed: `pnpm --filter @workspace/scripts run seed`
- DB push: `pnpm --filter @workspace/db run push`
- Codegen: `pnpm --filter @workspace/api-spec run codegen`
