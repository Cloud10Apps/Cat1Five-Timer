# Cat1Five Timer — Project Notes
*Last updated: April 13, 2026*

---

## 🔗 Quick Links

| Resource | URL |
|---|---|
| **Live App** | https://cat1five-timer-production.up.railway.app |
| **Custom Domain** | https://app.cat1fivetimer.com *(DNS setup in progress)* |
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
│   │       ├── email.ts     ← Resend email functions
│   │       └── user-access.ts
│   └── elevator-tracker/src/
│       ├── pages/           ← React pages
│       │   ├── dashboard.tsx
│       │   ├── customers.tsx
│       │   ├── buildings.tsx
│       │   ├── units.tsx
│       │   ├── elevators.tsx      ← Active Inspections
│       │   ├── inspections.tsx    ← Inspection History
│       │   ├── calendar.tsx
│       │   ├── admin.tsx
│       │   ├── settings.tsx
│       │   ├── login.tsx
│       │   ├── forgot-password.tsx  ← NEW (Session 7)
│       │   └── setup-password.tsx   ← NEW (Session 7)
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
│   │   ├── user-customers.ts
│   │   └── passwordResetTokens.ts  ← NEW (Session 7)
│   ├── api-zod/             ← Generated Zod schemas
│   └── api-client-react/    ← Generated React hooks
└── lib/api-spec/            ← OpenAPI spec + codegen
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
| `password_reset_tokens` | Invite/reset tokens *(NEW — Session 7)* |

### Elevator Unit Profile Fields
`name, description, bank, type (traction/hydraulic/other),
manufacturer, elevatorType (passenger/freight),
oemSerialNumber, capacity, speed, yearInstalled,
numLandings, numOpenings, locationId,
internalId (Unit ID), stateId (NM State ID)`

---

## 🧭 Navigation Structure

```
NAVIGATION
├── Dashboard          /dashboard
├── Customers          /customers
├── Buildings          /buildings
├── Units              /units
├── Active Inspections /elevators    "Open records needing attention"
├── Inspection History /inspections  "Completed inspection records"
└── Calendar           /calendar

SYSTEM
├── Admin              /admin        (ADMIN role only)
└── Settings           /settings
```
*Note: Billing is hidden from nav (not yet configured)*

---

## 📊 Dashboard KPI Cards

Three compliance score cards — each measures something different:

| Card | Formula | Answers |
|---|---|---|
| **Unit Compliance** | Compliant units / Total units | "Are my elevators legally compliant right now?" |
| **Inspection Completion (90 Days)** | Completed / Total due in next 90 days (future only, excludes overdue) | "How prepared am I for what's coming next?" |
| **Year-to-Date Completion** | Completed / Total due up to today this year | "How have I kept up with inspections due so far this year?" |

### Dashboard Layout (top to bottom)
1. Header (Refresh + title + All Customers filter)
2. Three KPI compliance score cards
3. Overdue Inspections table (full width)
4. Coming Up — Next 90 Days table (full width)

---

## 🔧 Business Logic

### Inspection Types
- **CAT1** = Annual Inspection (recurrence: 1 year)
- **CAT5** = Five-Year Inspection (recurrence: 5 years)

### Inspection Statuses (stored)
`NOT_STARTED → SCHEDULED → IN_PROGRESS → COMPLETED`
*Note: OVERDUE is COMPUTED (nextDueDate < today AND not completed) — never stored*

### Auto-Follow-Up
When an inspection is marked COMPLETED, the system automatically
creates the next inspection record with the new due date calculated
from completionDate + recurrenceYears.

### Next Due Date Calculation
`nextDueDate = lastInspectionDate + recurrenceYears`

### Compliance Score Logic
- **Unit Compliance**: unit has NO overdue inspections = compliant
- **90-Day Completion**: inspections where nextDueDate is between TODAY and TODAY+90 days
- **YTD Completion**: inspections where nextDueDate <= TODAY within current year

---

## 🎨 Design System

### Status Colors (sacred — never deviate)
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

### Authentication
- JWT tokens, 7-day expiry, stored in localStorage
- bcrypt password hashing (cost factor 12)
- Rate limiting: 20 login attempts per 15 minutes
- Multi-tenant: each org completely isolated via organizationId

### Password Requirements
- Minimum 8 characters (admin reset)
- Minimum 10 characters (user self-service)

### Environment Variables (Railway)
```
SESSION_SECRET          JWT signing secret
DATABASE_URL            PostgreSQL connection string
ALLOWED_ORIGINS         Comma-separated allowed CORS origins
RESEND_API_KEY          re_xxxx (from resend.com) — EMAIL NOT WORKING WITHOUT THIS
FROM_EMAIL              noreply@cat1fivetimer.com
APP_URL                 https://cat1fivetimer.com (update after domain setup)
BOOTSTRAP_ADMIN_EMAIL   smorris@cloud10analytics.com
BOOTSTRAP_ADMIN_PASSWORD Current admin password
STRIPE_SECRET_KEY       Stripe key (billing not active)
```

---

## 📧 Email (Resend)

**Status: Code built, needs Railway env vars to work**

Resend account: cloud10analytics at resend.com
Domain: cat1fivetimer.com (needs DNS verification in Resend)

### To activate email:
1. Go to resend.com → API Keys → Create key named "Cat1Five Timer"
2. Add to Railway: `RESEND_API_KEY=re_xxxxx`
3. Add domain in Resend → Domains → Add domain → cat1fivetimer.com
4. Add DNS records at your registrar
5. Update `FROM_EMAIL` and `APP_URL` in Railway

### Email Functions
- `sendInviteEmail(to, token)` — new user invitation
- `sendPasswordResetEmail(to, token)` — forgot password

---

## 🌐 Custom Domain Setup

**Domain purchased:** cat1fivetimer.com
**Target URL:** app.cat1fivetimer.com

### Steps to complete:
1. ✅ Buy domain cat1fivetimer.com
2. ⏳ Update ALLOWED_ORIGINS in Railway to include new domain
3. ⏳ Railway → Cat1Five-Timer → Settings → Networking → Add custom domain: `app.cat1fivetimer.com`
4. ⏳ Copy CNAME record from Railway
5. ⏳ Add CNAME record at domain registrar (Host: `app`, Value: Railway CNAME)
6. ⏳ Wait 5-30 min for DNS propagation
7. ⏳ Railway auto-provisions SSL certificate

---

## 📤 Excel Exports

| Export | Route | Contents |
|---|---|---|
| Units/Elevators | `/api/export/elevators` | Full unit profile + latest inspection status |
| All Inspections | `/api/export/inspections` | Complete inspection records with all fields |
| Overdue | `/api/export/overdue` | Overdue inspections with days overdue |
| Upcoming | `/api/export/upcoming` | Upcoming inspections within 14 days |

*Note: "Due Status" column renamed to "Timeline" in all exports*
*Note: Future inspections show "Due YYYY" not "Due in 90+ Days"*

---

## ✅ Completed Features

- [x] Multi-tenant SaaS architecture
- [x] JWT authentication with rate limiting
- [x] Admin panel (user management, customer access control)
- [x] Customer → Building → Unit → Inspection hierarchy
- [x] CAT1 and CAT5 inspection tracking
- [x] Auto-calculated next due dates
- [x] Auto-follow-up inspection creation on completion
- [x] Three compliance KPI score cards
- [x] Dashboard with overdue + upcoming tables
- [x] Active Inspections page with Show Me filters
- [x] Inspection History with More Filters + date ranges
- [x] Calendar view
- [x] Units page with card-based layout
- [x] Buildings page grouped by customer
- [x] Customers page with compliance badges
- [x] Excel export (4 export types)
- [x] Admin password reset for users
- [x] Onboarding banner for new users
- [x] "Timeline" column showing "Due YYYY" for future inspections
- [x] Confetti on inspection completion 🎉
- [x] Overdue badge in header linking to Active Inspections

---

## ⏳ Pending Features

| Feature | Priority | Notes |
|---|---|---|
| **Email notifications** | HIGH | 30/60/90-day alerts before due dates via Resend |
| **Forgot password flow** | HIGH | Built in Session 7 — needs Resend API key in Railway |
| **Invite email flow** | HIGH | Built in Session 7 — needs Resend API key in Railway |
| **Custom domain** | HIGH | cat1fivetimer.com purchased — DNS setup pending |
| **PDF compliance report** | MEDIUM | One-click PDF per customer for auditors |
| **Self-service signup** | MEDIUM | Building owners create their own accounts |
| **Building owner portal** | MEDIUM | Read-only view for building owners |
| **State inspector view** | LOW | Read-only, filtered by jurisdiction |
| **Document attachments** | LOW | Attach inspection certificates to records |
| **Global search** | LOW | Search across all data |
| **Mobile responsive** | LOW | App is desktop-only currently |

---

## 🐛 Known Issues / Watch List

- Dashboard cache: after adding new data, click **Refresh** button if 
  compliance cards don't appear immediately
- OVERDUE is computed not stored — any filter logic must use 
  `nextDueDate < today AND status != COMPLETED` not `status === OVERDUE`
- `internalId` and `stateId` on elevator objects may require 
  `(elevator as any).internalId` in some places — codegen was updated 
  but watch for type casting issues
- Billing tab hidden from nav — `/billing` route still exists but 
  Stripe not configured

---

## 💡 Key Business Context

**The Problem:** New Mexico changed state law requiring building owners 
to self-manage their CAT1 (annual) and CAT5 (five-year) elevator 
inspection schedules. They must proactively schedule with state 
inspectors (no third-party inspectors allowed).

**The Users:**
1. **Platform Admin (Stephanie/Cloud10)** — manages the platform
2. **Consultant** — resells/distributes to building owners
3. **Building Owners** — primary end users, enter their own data

**The Workflow:**
```
Building owner adds buildings → adds elevator units →
enters last inspection dates → app calculates next due dates →
owner schedules with NM state inspector →
records scheduled date in app →
inspection happens →
owner marks complete → app auto-creates next cycle
```

**Revenue Potential:**
- Charge per organization/month
- Consultant resells to building owners
- NM law change = immediate market need
- Other states may follow

---

## 🚀 Session History Summary

| Session | What Was Done |
|---|---|
| Early sessions | Initial app build, deployment, core inspection tracking |
| UI Redesign | All 8 pages redesigned — dashboard, customers, buildings, units, active inspections, inspection history, calendar, login |
| Nav restructure | Added Units page, renamed Current→Active Inspections, added nav subtitles |
| Dashboard redesign | 3 KPI cards, overdue table, coming up table, removed charts |
| Filter redesign | Show Me dropdown, search bars, date range fixes |
| Compliance fixes | Formula corrected, 90-day window, YTD annualized |
| Units page | Card-based layout replacing table rows |
| Security | Admin password reset, Resend email setup |
| Domain | cat1fivetimer.com purchased |

---

## 📋 Demo Data (Test Customers)

Three demo customers set up for consultant demo:

**1. Albuquerque Plaza Properties** — Fully compliant portfolio
- One Albuquerque Plaza (4 units: ABQ-101 to ABQ-104)
- Uptown Corporate Center (3 units: ABQ-201 to ABQ-203)

**2. City of Santa Fe Facilities** — Mixed active portfolio
- Santa Fe City Hall (2 units: SF-101, SF-102)
- Santa Fe Convention Center (3 units: SF-201 to SF-203)
- Santa Fe Municipal Court (2 units: SF-301, SF-302)

**3. Sandia Peak Commercial Group** — Has overdue CAT5
- Sandia Office Plaza (3 units: SPC-101 to SPC-103)
- Rio Rancho Commerce Park (2 units: SPC-201, SPC-202)

---

*This document should be uploaded at the start of each new Claude session to provide full project context.*
