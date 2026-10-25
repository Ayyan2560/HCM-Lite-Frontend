# HCM Lite — Backend API

Node.js / Express / MongoDB REST API for the HCM Lite HR management system.

## Quick start

```bash
cp .env.example .env   # fill in MONGODB_URI and JWT_SECRET
npm install
npm run seed           # create demo org + accounts (dev only)
npm run dev            # hot-reload with node --watch
```

The API starts on `http://localhost:5000`.  
Health check: `GET /api/health`

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `MONGODB_URI` | prod | *(embedded)* | Atlas or local connection string |
| `JWT_SECRET` | **yes** | *(insecure default)* | Min 32-char random secret |
| `JWT_EXPIRES_IN` | no | `12h` | Token lifetime (`12h`, `7d`, …) |
| `PORT` | no | `5000` | HTTP port |
| `CLIENT_ORIGIN` | no | `http://localhost:5173` | Comma-separated allowed CORS origins |
| `COMPANY_TIMEZONE` | no | `Asia/Karachi` | IANA timezone for attendance clocks |
| `SEED_ENABLED` | no | `true` | Allow `npm run seed` |
| `AI_API_KEY` | no | *(fallback mode)* | OpenAI-compatible API key |
| `AI_BASE_URL` | no | OpenAI | API base URL |
| `AI_MODEL` | no | `gpt-4o-mini` | Model name |

> **Production checklist**  
> • Set `NODE_ENV=production`  
> • Set a strong `JWT_SECRET` (≥ 64 hex chars)  
> • Set `MONGODB_URI` (embedded MongoDB is dev-only)  
> • Set `CLIENT_ORIGIN` to your actual frontend URL

## API surface

| Prefix | Description |
|---|---|
| `POST /api/auth/setup` | First-run company + admin bootstrap |
| `POST /api/auth/login` | Sign in; sets `token` cookie + returns JWT |
| `GET  /api/auth/me` | Current user + employee profile |
| `POST /api/auth/change-password` | Change own password |
| `GET  /api/employees` | List employees (admin/hr) |
| `POST /api/employees` | Create employee + user account (admin/hr) |
| `POST /api/employees/me/avatar` | Upload profile photo (`multipart/form-data`, field: `avatar`) |
| `POST /api/employees/import` | Bulk CSV import (admin/hr) |
| `GET  /api/employees/export` | Download employee CSV (admin/hr) |
| `POST /api/attendance/check-in` | Employee clock-in |
| `POST /api/attendance/check-out` | Employee clock-out |
| `GET  /api/attendance/me` | Own attendance history |
| `GET  /api/attendance` | HR daily overview |
| `POST /api/attendance/corrections` | Request attendance correction |
| `GET  /api/leaves/me` | Own leave history + balances |
| `POST /api/leaves` | Apply for leave |
| `PATCH /api/leaves/:id/decision` | Approve / reject (admin/hr) |
| `GET  /api/payroll` | List payroll runs (admin/hr) |
| `POST /api/payroll/drafts` | Generate draft (admin/hr) |
| `POST /api/payroll/:id/finalize` | Finalize payroll (admin only) |
| `GET  /api/payroll/:id/payslip/:employeeId` | Download PDF payslip |
| `GET  /api/payroll/me/payslips` | Own payslips |
| `GET  /api/organization` | Company settings |
| `PUT  /api/organization` | Update settings (admin) |
| `GET  /api/dashboard` | Summary metrics |
| `GET  /api/health` | Liveness + setup status |

## Roles

| Role | Access |
|---|---|
| `admin` | Everything, including payroll finalization and user management |
| `hr` | All employee data, attendance, leave decisions, payroll drafts |
| `employee` | Own profile, own attendance/leave, own payslips |

## Seeded demo accounts (after `npm run seed`)

| Email | Password | Role |
|---|---|---|
| `admin@demo.com` | `Admin@123` | admin |
| `hr@demo.com` | `Hr@12345` | hr |

## Project structure

```
src/
  app.mjs              Express app factory
  server.mjs           Entry point
  config/              Database + env config
  controllers/         Route handlers
  middleware/          Auth, rate-limit, error handler  (*.mjs — active)
  middlewares/         uploadMiddleware.js              (avatar upload)
  models/              Mongoose models
  routes/              Express routers
  services/            Business logic
  utils/               Shared helpers
uploads/               Avatar images (git-ignored except .gitkeep)
scripts/seed.mjs       Demo data seeder
tests/                 Node test-runner tests
```
