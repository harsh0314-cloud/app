# StoreX — Enterprise Upgrade PRD

## Original problem statement

Upgrade StoreX (React/Vite + Node/Express + Prisma + PostgreSQL) into an
enterprise-grade e-commerce platform WITHOUT rewriting or breaking any existing
functionality. Add:

1. **RBAC** — 6 roles (SUPER_ADMIN, ADMIN, MANAGER, STAFF, SUPPORT, USER) with a
   professional permission catalog covering products, orders, customers, coupons,
   analytics, settings, users, email templates, audit logs, import/export.
2. **Activity Audit Log** — permanent (no auto-delete), captures who/what/when/where
   with previous/new values, IP, browser, device, admin notes. Server-side
   pagination, filters, date range, CSV/Excel export.
3. **Bulk Product Import / Export** — CSV + Excel equally, preview + validation,
   row-level errors, downloadable templates, error reports, transaction-safe
   per-row imports.

## Architecture

- `client/` (Vite + React 19 + Tailwind, react-router 7, zustand, react-query)
- `server/` (Express 4, Prisma 5, PostgreSQL 15, JWT + refresh tokens)
- `client/` and `server/` folders preserved. NO new top-level folders were added.

## Personas

- **Super Admin** — one seeded account, full access, role management.
- **Admin** — day-to-day platform ops, all except super-admin-only actions.
- **Manager** — merchandising & operations: products, inventory, coupons,
  imports/exports, analytics, returns.
- **Staff** — order fulfilment + inventory + product editing.
- **Support** — order visibility + contact messages + returns view.
- **Customer** — storefront only (unchanged).

## Delivered (2026-02)

- Prisma schema extended with new roles enum, `AuditLog` table (fully indexed),
  optional `UserPermissionOverride`.
- Central permission catalog: `server/src/utils/permissions.js` + mirror at
  `client/src/lib/permissions.js`.
- RBAC middleware: `authorize` (legacy, backward-compat), `requireStaff`,
  `requirePermission`, `requireAnyPermission`.
- Audit log helper (`server/src/utils/audit.js`) attached to
  login/logout/register/product-CRUD/order-status-change/coupon-CRUD/user-mgmt/import/export.
- Admin routes rewired to use per-permission guards (existing endpoints keep
  the same URL & payloads).
- New admin endpoints:
  `GET /api/admin/audit-logs` (+ filters/stats/detail/export/notes)
  `GET|POST|PATCH|DELETE /api/admin/users`
  `GET /api/admin/users/roles`
  `POST /api/admin/import/products/preview`
  `POST /api/admin/import/products`
  `GET  /api/admin/import/products/template`
  `GET  /api/admin/import/products/errors`
  `GET  /api/admin/export/products`
- Frontend pages: `AdminAuditLogs`, `AdminUsers`, `AdminImportExport`,
  `Unauthorized`. All wired into `App.jsx`.
- Sidebar filtered by permissions. `ProtectedAdminRoute` supports per-page
  permission checks.
- Seed script: `server/seed-rbac.js` — idempotent, creates one demo user per role.
- Postgres provisioned locally in the preview container.
- README updated with setup, RBAC matrix, seed & import/export docs.
- `/app/memory/test_credentials.md` updated with all seeded credentials.

## Backlog (P1)

- Per-user permission overrides (schema is ready, UI TBD).
- Audit-log activity graph and anomaly highlights (failed logins, off-hours access).
- Async large-file imports with a background job queue (currently synchronous, 25MB cap).
- Bulk export of orders and customers (products only in this phase).
- Fine-grained "role changed" email notifications to affected users.

## Backlog (P2)

- 2FA for staff accounts.
- SSO / SAML for enterprise deployments.
- IP allow-lists per role.
- Signed URLs for downloadable export files with expiry.

## Testing to run

- Auth: login/logout/refresh/register untouched — smoke test.
- RBAC: SUPPORT cannot create products; MANAGER can import; USER cannot access `/admin`.
- Audit logs: login writes an entry; product edit writes an entry with diff.
- Import: preview + full import work for CSV and XLSX; invalid rows are reported.
- Export: CSV + XLSX download with correct headers.
- Existing flows: products list, checkout, cart, wishlist, orders, coupons.
