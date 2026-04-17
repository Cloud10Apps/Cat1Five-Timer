# Cat1Five-Timer — Project Notes
*Last updated: April 17, 2026*

---

## 🔗 Quick Links

| Resource | URL |
|---|---|
| **Live App** | https://app.cat1fivetimer.com |
| **Railway URL** | https://cat1five-timer-production.up.railway.app |
| **GitHub** | https://github.com/Cloud10Apps/Cat1Five-Timer |
| **Railway Project** | proud-happiness |
| **Railway Dashboard** | https://railway.app |
| **Resend (Email)** | https://resend.com — account: cloud10analytics |

---

## 🔐 Credentials

| Item | Value |
|---|---|
| **Admin Login** | smorris@cloud10analytics.com |
| **Admin Password** | Sophud0709! |
| **Railway DB Host** | metro.proxy.rlwy.net:56946 |
| **Railway DB User** | postgres |
| **Railway DB Password** | IXEYvcJxCvdHquHlxoCbpJqRMqoIbuyj |
| **Railway DB Name** | railway |

---

## 💻 Local Development

| Item | Value |
|---|---|
| **Local Code Path** | C:\Users\smorr\Downloads\Cat1Five-Timer |
| **Project Notes Path** | C:\Users\smorr\OneDrive\Desktop\Cat1Five Timer\Cat1Five Timer\Cat1Five-Timer-Project-Notes.md |
| **Node Package Manager** | pnpm |
| **Local Install Command** | `pnpm install --ignore-scripts` |
| **Windows Note** | Use `set VAR=value` not `export VAR=value` |

### DB Migration Command
```bash
cd lib\db
set DATABASE_URL=postgresql://postgres:IXEYvcJxCvdHquHlxoCbpJqRMqoIbuyj@metro.proxy.rlwy.net:56946/railway
npx drizzle-kit push
```

### Deployment Workflow
```
Claude Code makes changes
    ↓
git push (auto-commits and pushes)
    ↓
Railway auto-deploys (~3 min)
    ↓
Refresh live URL to see changes
```

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| **Structure** | TypeScript monorepo, pnpm workspaces |
| **Backend** | Express 5, Node.js |
| **Frontend** | React + Vite |
| **Database** | PostgreSQL + Drizzle ORM |
| **Auth** | JWT (7-day expiry), bcrypt passwords |
| **API Client** | Generated via Orval (OpenAPI → TypeScript) |
| **State Management** | TanStack Query |
| **UI Components** | shadcn/ui + Tailwind CSS |
| **Excel Export** | ExcelJS |
| **Billing** | Stripe (configured but hidden from nav) |
| **Email** | Resend (API key needed in Railway) |
| **Hosting** | Railway |

---

## 📁 Monorepo Structure

```
Cat1Five-Timer/
├── artifacts/
│   ├── api-server/src/
│   │   ├── routes/          ← API endpoints
│   │   │   ├── auth.ts
│   │   │   ├── users.ts
│   │   │   ├── customers.ts
│   │   │   ├── buildings.ts
│   │   │   ├── elevators.ts
│   │   │   ├── inspections.ts
│   │   │   ├── dashboard.ts
│   │   │   └── export.ts
│   │   ├── middleware/auth.ts
│   │   └── lib/
│   │       ├── email.ts     ← Resend email functions (built, needs API key)
│   │       └── user-access.ts
│   └── elevator-tracker/src/
│       ├── pages/           ← React pages
│       │   ├── dashboard.tsx
│       │   ├── customers.tsx
│       │   ├── buildings.tsx
│       │   ├── units.tsx
│       │   ├── elevators.tsx      ← Active Inspections (route: /elevators)
│       │   ├── inspections.tsx    ← Inspection History
│       │   ├── calendar.tsx
│       │   ├── admin.tsx
│       │   ├── settings.tsx
│       │   └── login.tsx
│       └── components/
│           ├── layout.tsx   ← Nav, sidebar, header
│           └── auth-provider.tsx
├── lib/
│   ├── db/src/schema/       ← Drizzle ORM schema
│   │   ├── organizations.ts
│   │   ├── users.ts
│   │   ├── customers.ts
│   │   ├── buildings.ts
│   │   ├── elevators.ts
│   │   ├── inspections.ts
│   │   └── user-customers.ts
│   ├── api-zod/             ← Generated Zod schemas
│   └── api-client-react/    ← Generated React hooks
└── lib/api-spec/            ← OpenAPI spec + codegen
    └── openapi.yaml         ← SOURCE OF TRUTH for all types
```

---

## 🗄️ Database Schema Summary

### Key Tables
| Table | Purpose |
|---|---|
| `organizations` | Multi-tenant isolation — each org is isolated |
| `users` | Login accounts with role (ADMIN/USER) |
| `user_customers` | Links users to specific customers (access control) |
| `customers` | Building owner companies |
| `buildings` | Physical locations belonging to customers |
| `elevators` | Individual elevator units within buildings |
| `inspections` | CAT1/CAT5 inspection records per elevator |

### Important Schema Notes
- Every table has `organization_id` for multi-tenant isolation
- `OVERDUE` is COMPUTED (nextDueDate < today AND not completed) — never stored
- `mustChangePassword` boolean exists on users table
- Database indexes added April 2026 on: organizationId, elevatorId, buildingId, status, nextDueDate

### Elevator Unit Profile Fields
```
name, description, bank, type (traction/hydraulic/other),
manufacturer, elevatorType (passenger/freight),
oemSerialNumber, capacity, speed, yearInstalled,
numLandings, numOpenings, locationId,
internalId (Unit ID), stateId (NM State ID)
```

---

## 🧭 Navigation Structure

```
NAVIGATION
├── Dashboard          /dashboard
├── Customers          /customers
├── Buildings          /buildings
├── Units              /units
├── Active Inspections /elevators    ← route named /elevators — DO NOT rename
├── Inspection History /inspections
└── Calendar           /calendar

SYSTEM
├── Admin              /admin        (ADMIN role only)
└── Settings           /settings
```

---

## 🔧 Business Logic

### Inspection Types
- **CAT1** = Annual Inspection (recurrence: 1 year)
- **CAT5** = Five-Year Inspection (recurrence: 5 years)

### Inspection Statuses (stored)
`NOT_STARTED → SCHEDULED → IN_PROGRESS → COMPLETED`

### Auto-Follow-Up
When an inspection is marked COMPLETED, the system automatically
creates the next inspection record:
`nextDueDate = completionDate + recurrenceYears`

### How Inspections Are Created
- Adding a Unit automatically creates both a CAT1 and CAT5 inspection record
- There is NO manual "Add Inspection" button — records are auto-created
- Users click the pencil icon to enter Last Inspection Date and seed the record

---

## 🎨 Design System

### Status Colors (never deviate)
| Color | Meaning |
|---|---|
| 🔴 Red | Overdue / Action required |
| 🟡 Amber | Due soon / Attention needed |
| 🔵 Blue | Scheduled / Planned |
| 🟢 Green | Compliant / Completed |
| ⚫ Gray | Neutral / No data |

### Brand Colors
- Primary accent: `amber-500` (#f59e0b)
- Sidebar/Nav background: `zinc-950`
- Active nav item: white background, zinc-950 icon

---

## 🔒 Security

- JWT tokens, 7-day expiry, stored in localStorage
- bcrypt password hashing (cost factor 12)
- Rate limiting: 20 login attempts per 15 minutes
- Multi-tenant: each org completely isolated via organizationId
- Minimum password length: 8 characters

### Environment Variables (Railway)
```
SESSION_SECRET          JWT signing secret
DATABASE_URL            PostgreSQL connection string
ALLOWED_ORIGINS         * (currently allows all origins)
RESEND_API_KEY          re_xxxx — EMAIL NOT WORKING WITHOUT THIS
FROM_EMAIL              noreply@cat1fivetimer.com
APP_URL                 https://app.cat1fivetimer.com
BOOTSTRAP_ADMIN_EMAIL   smorris@cloud10analytics.com
STRIPE_SECRET_KEY       Stripe key (billing not active)
```

---

## 📧 Email (Resend) — NOT YET ACTIVE

**Status: Code partially built, needs completion + Railway env vars**

### To activate email:
1. Go to resend.com → API Keys → Create key
2. Add to Railway: `RESEND_API_KEY=re_xxxxx`
3. Add `FROM_EMAIL` and `APP_URL` to Railway variables

---

## 🌐 Custom Domain

- **cat1fivetimer.com** — purchased via Tailor Brands (managed at Dynadot)
- **app.cat1fivetimer.com** — LIVE ✅
- DNS: CNAME `app` → `6defr36u.up.railway.app`
- TXT verification record configured
- SSL auto-provisioned by Railway

---

## 📤 Excel Exports

Export buttons exist on: Units, Active Inspections, Inspection History

| Export | Route | Filter Support |
|---|---|---|
| Units/Elevators | `/api/export/elevators` | Customer + Building only |
| All Inspections | `/api/export/inspections` | Customer + Building only |

*Note: Only Customer and Building filters pass through to exports.
Status, timeline, date range filters do NOT affect exports.*

---

## ✅ Completed Features

- [x] Multi-tenant SaaS architecture
- [x] JWT authentication with rate limiting
- [x] Admin panel (user management, customer access control, password reset)
- [x] Customer → Building → Unit → Inspection hierarchy
- [x] CAT1 and CAT5 inspection tracking
- [x] Auto-calculated next due dates
- [x] Auto-follow-up inspection creation on completion
- [x] Three compliance KPI score cards on dashboard
- [x] Dashboard with overdue + upcoming tables
- [x] Active Inspections with Show Me filters + advanced filters
- [x] Inspection History with date range filters
- [x] Calendar view
- [x] Units page with card-based layout
- [x] Buildings page with compliance-status Building2 icons (not dark square initials)
- [x] Excel export (Units, Active Inspections, Inspection History)
- [x] Confetti on inspection completion 🎉
- [x] Overdue badge in header linking to Active Inspections
- [x] Unit ID and State ID columns readable in Active Inspections
- [x] Database indexes added (org, elevator, building, status, nextDueDate)
- [x] Custom domain live: app.cat1fivetimer.com
- [x] mustChangePassword field on users table
- [x] "New Mexico" and "legally compliant" language removed from UI
- [x] Database directly accessible via Azure Data Studio
- [x] User manual created (PDF + Word)

---

## ⏳ Pending Features (Priority Order)

| Feature | Priority | Notes |
|---|---|---|
| **Forgot password / email invites** | HIGH | Code partially built — needs Resend API key + completion |
| **Email notifications 30/60/90 days** | HIGH | Not started — needs Resend + nightly cron job |
| **Stripe exempt flag** | HIGH | Add `stripeExempt` boolean to organizations table BEFORE activating Stripe |
| **Document attachments (PDF)** | HIGH | Store inspection certificates — needs Cloudflare R2 or AWS S3 |
| **Marketing landing page** | HIGH | cat1fivetimer.com should be a landing page, not point to the app |
| **PDF compliance report** | MEDIUM | One-click PDF per customer for auditors |
| **Self-service signup + Stripe** | MEDIUM | Building owners create own accounts |
| **Mobile responsive** | MEDIUM | Currently desktop-only |
| **Building owner portal** | LOW | Read-only view for building owners |
| **Global search** | LOW | Search across all data |

---

## 🐛 Known Issues / Watch List

- **Schema push must happen before deploy** — if DB schema changes without `drizzle-kit push`, API crashes on startup and all users lose login
- **Export filters limited** — only Customer and Building filter through to Excel exports
- **Billing hidden** — `/billing` route exists but Stripe not configured. Do NOT activate Stripe without first adding `stripeExempt` to organizations table
- **Active Inspections route** — named `/elevators` in code. Never rename this route
- **OpenAPI is source of truth** — never manually edit files in `lib/api-zod/src/generated/` or `lib/api-client-react/src/generated/`

---

## 💡 Key Business Context

**The Problem:** New Mexico changed state law requiring building owners
to self-manage their CAT1 (annual) and CAT5 (five-year) elevator
inspection schedules with state inspectors.

**Current Clients / Prospects:**
- **Charlie** — NM consultant, set up as Admin, first client
- **Ryan Gressett @ ATIS** — Large national inspection company evaluating the app

**Pricing Strategy (planned):**
- Charlie: flat monthly fee (~$299/mo)
- Direct building owners: per-unit tiered pricing
  - 1–10 units: $49/mo
  - 11–25 units: $99/mo
  - 26–50 units: $179/mo
  - 50+ units: custom

**Scalability Notes for ATIS conversation:**
- PostgreSQL scales fine for national use
- Multi-tenant architecture already correct
- Indexes added April 2026 — query performance ready
- Missing: file storage for PDFs (needs R2/S3), Railway plan upgrade for prod load

---

## 🚀 Claude Code Session Starter Prompt

Paste this at the start of each new Claude Code session:

```
I am working on the Cat1Five-Timer app at C:\Users\smorr\Downloads\Cat1Five-Timer.

Please read this file for full project context before we begin:
C:\Users\smorr\OneDrive\Desktop\Cat1Five Timer\Cat1Five Timer\Cat1Five-Timer-Project-Notes.md

Key facts:
- TypeScript monorepo, pnpm workspaces
- Frontend: artifacts/elevator-tracker (React + Vite, Tailwind, shadcn/ui, TanStack Query, Wouter)
- Backend: artifacts/api-server (Express 5)
- Database: PostgreSQL + Drizzle ORM on Railway (project: proud-happiness)
- Live URL: https://app.cat1fivetimer.com
- Auto-deploys to Railway on git push

DB migration command:
cd lib\db && set DATABASE_URL=postgresql://postgres:IXEYvcJxCvdHquHlxoCbpJqRMqoIbuyj@metro.proxy.rlwy.net:56946/railway && npx drizzle-kit push

After any schema or OpenAPI changes always run in order:
1. drizzle-kit push (with DATABASE_URL above)
2. cd lib/api-spec && pnpm run generate
3. pnpm run typecheck
4. git push

Please confirm you have read the project notes and understand the structure before we begin.
```

---

*This file lives at:*
*C:\Users\smorr\OneDrive\Desktop\Cat1Five Timer\Cat1Five Timer\Cat1Five-Timer-Project-Notes.md*
