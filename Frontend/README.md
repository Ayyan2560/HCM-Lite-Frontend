# HCM Lite — Frontend

A complete React + Vite frontend for the HCM Lite human capital management API. It is built around the backend's real endpoints, response envelope, permissions and business rules — there is no mock data and no offline demo mode.

The interface is a responsive, enterprise-style workspace with a navy navigation rail, a light working area and an indigo accent. Authentication uses the backend's HTTP-only cookie; no token is written to `localStorage` or `sessionStorage`.

---

## Stack

| Concern | Choice |
|---|---|
| UI runtime | React 18 |
| Build tool | Vite 5 |
| Language | JavaScript (ES modules, JSX) |
| Routing | React Router 6 |
| HTTP | Axios (single shared instance) |
| Icons | lucide-react |
| Styling | Hand-written CSS with design tokens (no UI framework) |

There is no state library; server data stays in page state and is refetched after mutations.

---

## Requirements

- Node.js 18 or newer (verified with Node 24.21.0, npm 11.19.0)
- A running HCM Lite backend
- The backend must allow the frontend origin in its CORS configuration and must issue the `token` cookie

PowerShell note: if `npm` is blocked by execution policy, use `npm.cmd` on Windows.

---

## Quick start

```bash
cd Frontend
npm install
copy .env.example .env      # Windows
# cp .env.example .env      # macOS / Linux
npm run dev
```

Open `http://localhost:5173`.

The default `.env.example` points at `http://localhost:5000`, which matches the backend's default port and the Vite dev proxy.

---

## Environment configuration

Only one variable is used:

```env
VITE_API_URL=http://localhost:5000
```

Accepted forms:

- `http://localhost:5000` — the app appends `/api`
- `http://localhost:5000/api` — used as-is
- empty — the app calls same-origin `/api` and the Vite dev server proxies to `http://localhost:5000`

If the backend runs on another host or port, set `VITE_API_URL` to that origin. For same-origin production deployments behind a reverse proxy, leave it empty and proxy `/api` and `/uploads` to the backend.

The Vite dev proxy target is configured in `vite.config.js` (`server.proxy`). Change it there if you want to use the blank-URL mode against a backend on a different port.

> Vite reads `VITE_*` variables at dev-server start and at build time. Restart `npm run dev` or rebuild after changing `.env`.

---

## Scripts

```bash
npm run dev       # Vite dev server on http://localhost:5173
npm run build     # production bundle in dist/
npm run preview   # serve the production build on http://localhost:4173
```

---

## Roles and routes

Roles come from the backend and are limited to `admin`, `hr` and `employee`.

| Route | Page | Access |
|---|---|---|
| `/login` | Sign in | Public |
| `/setup` | First-run workspace setup | Public, only when the backend reports `setupRequired` |
| `/change-password` | Forced password change | Signed-in users with a temporary password |
| `/` | Dashboard | All signed-in users (staff and personal variants) |
| `/employees` | Employee directory | Admin, HR |
| `/employees/new` | Add employee | Admin, HR |
| `/employees/:id` | Employee dossier | Admin, HR |
| `/employees/:id/edit` | Edit employee | Admin, HR |
| `/attendance` | Attendance workspace | All (staff overview vs. personal history) |
| `/leave` | Leave workspace | All (employee self-service vs. staff approvals and balances) |
| `/payroll` | Payroll runs | Admin, HR |
| `/payroll/:id` | Payroll run detail | Admin, HR |
| `/payslips` | Personal payslips | All with an employee profile |
| `/profile` | Account and personal profile | All |
| `/organization` | Company configuration and team accounts | Admin |
| `/announcements` | Company announcements | All (publishing for Admin/HR) |
| `/notifications` | Notification inbox | All |
| `/audit` | Audit log | Admin |
| `/ai` | Read-only assistant and leave planner | All |
| `*` | Not found | All |

Role guards render an “Access restricted” page rather than leaking data. All API calls are additionally enforced by the backend.

An employee account without a linked employee profile can still use the dashboard, announcements, notifications, assistant and profile, but not the employee-scoped attendance, leave or payslip features.

---

## Feature coverage

- **Authentication** — login, logout, session restoration via `GET /auth/me`, forced temporary-password change, setup wizard when required, role-aware navigation, 401 session-expiry handling and 403 password-required handling.
- **Dashboard** — staff operating picture (headcount, attendance, decisions, departments, payroll snapshot, shortcuts) and a personal dashboard (today's clock, month summary, balances, latest payslip, recent leave, announcements).
- **Employees** — searchable/filterable directory, pagination, CSV export, CSV import with dry-run validation and one-time credentials, create/edit, deactivate/reactivate, dossier with leave balances, avatar upload.
- **Attendance** — staff daily overview with filters, raw records, correction queue and approve/reject decisions; employee check-in/check-out, personal history, period summary and correction requests.
- **Leave** — employee balances, request history, apply and cancel; staff approval queue with notes and team balance viewer. Request/approval/cancellation flows refresh balances.
- **Payroll** — run list, draft generation by month, editable draft notes, admin-only finalization with a cutoff guard, employee entries with breakdowns, and payslip PDF downloads for finalized runs.
- **Payslips** — finalized personal payslips with figures exactly as stored by the backend.
- **Profile** — account details, password change entry point, self-service contact fields, avatar upload and linked employment record.
- **Organization** — company identity, timezone, working schedule, leave policy, geofencing, departments, designations, holidays, and HR account creation/deactivation.
- **Announcements** — category/search filters, pinning, publishing, deletion (admin; HR for their own posts).
- **Notifications** — unread filter, mark one/all read, deep links to the relevant page.
- **Audit log** — action/entity/date filters, pagination, before/after snapshots and links to related records.
- **Assistant** — live context, read-only chat (AI or deterministic rules-engine fallback), and a leave planner that prefills the leave form without submitting it.

---

## API integration notes

- One Axios instance lives in `src/api/client.js`. It uses `withCredentials: true`, a 20-second timeout, and unwraps `{ success: true, data }` responses.
- `VITE_API_URL` is normalised to always end in `/api`; assets such as avatars resolve against the backend origin instead.
- All mutations refetch the affected data instead of guessing local state.
- Network errors, 401, 403, 404, validation errors and field-level errors are surfaced as inline messages, toasts or full error states.
- PDF and CSV downloads use blob responses and the server's `Content-Disposition` filename.
- Authentication relies only on the backend's HTTP-only `token` cookie.

### Backend behaviour the UI deliberately follows

- **Payroll finalization is admin-only.** HR users see an explanatory note and no finalize action.
- **Draft cutoff guard.** A draft generated before its period ends cannot be finalized until the period closes and the draft is regenerated; the UI explains this and disables the action.
- **Attendance and payroll values are displayed as returned.** The frontend does not recalculate salary, tax or attendance classifications.
- **Announcement deletion.** The announcement list response has no author id, so the UI offers HR deletion only when `authorName` matches the signed-in user's name. The backend still enforces ownership.
- **AI fallback.** Without an AI API key the backend returns rules-engine answers; the UI labels them clearly rather than implying a model was used.
- **Dismissal/cancellation rules** (pending leave, pending corrections, run finalization) come from the backend, and API errors are shown verbatim where useful.

---

## Project structure

```text
Frontend/
├── public/
│   └── favicon.svg
├── src/
│   ├── api/            # one Axios client + one module per backend area
│   ├── components/
│   │   ├── employees/  # CSV import dialog
│   │   ├── layout/     # app shell, sidebar, top bar
│   │   └── ui/         # buttons, fields, modals, tables, states, etc.
│   ├── context/        # AuthContext and ToastContext
│   ├── lib/            # formatting, constants, helpers
│   ├── pages/          # one component per route
│   ├── styles/         # tokens, app shell and page styles
│   ├── App.jsx         # routes and role guards
│   └── main.jsx        # providers and bootstrap
├── .env.example
├── index.html
├── package.json
└── vite.config.js
```

---

## Production build

```bash
npm run build
```

The output is written to `dist/`. Serve `dist/` from any static host and make sure:

1. The SPA fallback rewrites unknown paths to `index.html` (needed for client-side routing).
2. `/api` (and `/uploads` for avatars) are proxied to the backend if you use same-origin mode.
3. The backend `CLIENT_ORIGINS` includes the deployed frontend origin, and cookies are configured appropriately for HTTPS (`secure`, `sameSite`).
4. `VITE_API_URL` is set at build time if the API is on a different origin.

---

## Verification performed

The frontend was tested in a real browser against a seeded backend on `http://localhost:5001` with Vite on `http://localhost:5173` (port 5000 was occupied by another project). The production build completed successfully.

**Verified end-to-end**

- Admin, HR and employee login; session restoration after reload; logout; role-aware navigation and restricted-route handling; forced temporary-password change and redirect into the workspace.
- Staff and employee dashboards with live data.
- Employee directory, CSV export, create employee with one-time password, edit, deactivate/reactivate, dossier; CSV dry-run and import.
- Employee check-in/check-out; attendance overview, raw records, correction submission and approval.
- Employee leave application and cancellation; staff approve and reject with notes; team balances; AI leave suggestion prefilling the leave form.
- Payroll list, draft generation, draft detail, admin finalization, HR finalize restriction, finalized run detail, payslip PDF download for admin and employee.
- Profile contact update; avatar upload request; avatar display once the backend served the upload.
- Organization configuration page load; HR account creation and deactivation; team account list.
- Announcements: admin create/delete, HR create/delete ownership visibility, employee read-only view.
- Notifications: unread counts, mark one read, mark all read.
- Audit log: action filter, details expansion, pagination controls.
- Assistant: status, rules-engine chat fallback, leave suggestion; error handling for an unavailable backend.
- Password change on the forced-change screen; contact-detail update and refresh behaviour.

**Not fully automated/verified**

- The first-run `/setup` wizard against a brand-new database (the test backend was already seeded).
- The standalone profile password modal (the same endpoint was verified through the forced-change screen).
- CSV duplicate/invalid-row error presentation and organization settings save/reload.
- Pagination beyond the first page and every filter combination.
- Visual QA at phone/tablet breakpoints (layout is responsive but was exercised primarily at desktop width).

### Uploads and the extracted test backend

The frontend requests `/uploads/<file>` from the backend after an avatar upload. The extracted backend used for testing resolves its static uploads directory from the repository root while Multer writes to the process working directory; those paths differed in the extracted layout, so uploaded avatars returned 404 until the files were also present in the directory being served. This is a backend path issue, not a frontend issue, but it is documented here so it is not mistaken for broken UI. Deploy the backend with its expected `server/` directory structure (or align `uploads` with the directory served at `/uploads`).

---

## Demo data note

The backend seed used during testing created these demo accounts:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@hcm-lite.demo` | `Admin@12345` |
| HR | `hr@hcm-lite.demo` | `Hr@12345` |
| Employee | `employee@hcm-lite.demo` | `Employee@12345` |

These come from the backend seed script, not from the frontend. Do not ship seeded credentials or a seeded database to production.

The testing session also created disposable records (a test employee, a test HR account, a payroll draft and test leave/attendance entries), so a fresh seed is recommended before a demo or hand-off.

---

## Troubleshooting

- **“Cannot reach the server”** — confirm the backend port and that `VITE_API_URL` matches it, then restart Vite.
- **401 immediately after login** — check that cookies are enabled, the frontend origin is allowed by backend CORS, and both sides use the same host (`localhost` vs `127.0.0.1` matters for cookies).
- **403 `PASSWORD_CHANGE_REQUIRED`** — the account uses a temporary password; the app redirects to `/change-password`.
- **Blank page after deployment** — configure SPA fallback to `index.html`.
- **Avatar 404** — see the uploads note above and confirm `/uploads` is served by the backend.
