# StoreX — Enterprise E-commerce Platform

An enterprise-grade e-commerce platform built on React (Vite), Node/Express, Prisma and PostgreSQL. This upgrade adds production-grade RBAC, permanent audit logging and bulk product import/export while keeping every existing feature intact.

## Quick start

```bash
# Backend
cd server && yarn install
cp .env.example .env      # ensure DATABASE_URL and JWT_SECRET are set
npx prisma migrate deploy || npx prisma db push
node seed-rbac.js         # OR:  npx prisma db seed
yarn dev                  # http://localhost:5000 (mounted under /api)

# Frontend
cd client && yarn install
yarn dev                  # http://localhost:3000 (proxies /api to backend)
```

Both services are auto-managed by supervisor in the preview container (`storex-server`, `storex-client`, `postgres`).

## RBAC — Roles & seeded accounts

Six roles are defined in `server/prisma/schema.prisma`:

| Role         | What they see                                                                             |
|--------------|-------------------------------------------------------------------------------------------|
| `SUPER_ADMIN`| Everything, including role management and user deletion                                    |
| `ADMIN`      | Everything except SUPER_ADMIN-only actions                                                 |
| `MANAGER`    | Products, orders, inventory, coupons, imports/exports, analytics, returns                  |
| `STAFF`      | Products (update), orders (view + update status), inventory, returns view, exports         |
| `SUPPORT`    | Orders (view), customers, contact messages, returns (view), newsletter (view)              |
| `USER`       | Storefront only                                                                            |

The permission catalog is defined once at `server/src/utils/permissions.js` and mirrored in `client/src/lib/permissions.js`. The server is always the source of truth.

### Seeded test accounts

Run once (idempotent — never overwrites existing users):

```bash
cd server
node seed-rbac.js
# or via prisma:
npx prisma db seed
```

| Role         | Email                        | Password         |
|--------------|------------------------------|------------------|
| Super Admin  | superadmin@storex.test       | SuperAdmin@123   |
| Admin        | admin@storex.test            | Admin@12345      |
| Manager      | manager@storex.test          | Manager@12345    |
| Staff        | staff@storex.test            | Staff@12345      |
| Support      | support@storex.test          | Support@12345    |

Also written to `/app/memory/test_credentials.md`.

### Guarding routes / actions

- **Backend** — use middleware:
  ```js
  const { requirePermission, requireStaff } = require('./middleware/rbac');
  router.post('/products', requirePermission('product.create'), handler);
  ```
- **Frontend** — use the gate component or helpers:
  ```jsx
  import PermissionGate from './components/PermissionGate';
  <PermissionGate perm="product.create">
    <Button>Add product</Button>
  </PermissionGate>
  ```

## Audit Logs

Every mutating admin/auth action writes to `audit_logs` via `server/src/utils/audit.js#logAudit()`. Logging never blocks or fails the request.

Captured for each entry:
- `user`, `userRole`, `userEmail`, `ipAddress`, `browser`, `device`, `userAgent`
- `action`, `entity`, `entityId`, `previousValue`, `newValue`
- `status`, `message`, `adminNotes`, `createdAt`

Tracked actions (extendable): `LOGIN`, `LOGIN_FAILED`, `LOGOUT`, `REGISTER`, `PRODUCT_CREATE / UPDATE / DELETE`, `ORDER_STATUS_CHANGE`, `COUPON_CREATE / UPDATE / DELETE / TOGGLE`, `USER_CREATE / UPDATE / DELETE / ROLE_CHANGE / STATUS_CHANGE`, `EMAIL_TEMPLATE_UPDATE`, `IMPORT`, `EXPORT`.

**Retention**: permanent. No TTL, no auto-archival. Indexed on user/action/entity/status/createdAt/ipAddress. Admin UI at `/admin/audit-logs` supports server-side pagination, search, filters (date range, user, role, entity, action, status, IP), row-level notes and CSV/Excel export of the current filter.

## Bulk Import / Export (Products)

UI at `/admin/import-export`, requires `import` / `export` permission.

- **Formats**: CSV and Excel (`.xlsx`) — treated equally.
- **Preview**: `POST /api/admin/import/products/preview` — validates every row and reports Will Create / Will Update / Will Skip counts before any write.
- **Import**: `POST /api/admin/import/products` — each valid row runs in its own transaction (invalid rows are skipped, not fatal); returns a report with `imported`, `updated`, `skipped`, `failed` plus row-level errors.
- **Duplicate detection**: matched by `sku` first, then `slug`.
- **Images**: pipe- or comma-separated URL list in the `imageUrls` column. If the column is empty on an update, existing images are preserved.
- **Templates**: `GET /api/admin/import/products/template?format=csv|xlsx`.
- **Error report**: available as CSV or Excel after any run.
- **Export**: `GET /api/admin/export/products?format=csv|xlsx&filter=all|active|inactive&category=&brand=&search=&ids=...`.

Supported columns:
```
name, slug, sku, description, shortDescription,
price, comparePrice, costPrice,
category, brand,
stock, lowStockThreshold,
isActive, isFeatured, isNewArrival, isBestSeller, isTrending,
isReturnable, isExchangeable, returnWindowDays,
metaTitle, metaDescription,
imageUrls   -- pipe/comma-separated URLs; first URL becomes primary
```

## Security notes

- Every `/api/admin/*` route is authenticated (`authenticate`) then guarded by `requireStaff` and per-route `requirePermission(...)`.
- Passwords hashed with bcrypt (cost 12). JWT + rotating refresh tokens (existing flow untouched).
- Rate limiting on `/api` (existing). Test-email endpoint has its own limiter.
- Input validation on all admin write routes (`zod` schemas — existing).
- Frontend permissions never grant access on their own; the server always re-checks.
- Import: `multer` memory storage capped at 25 MB, only CSV/XLSX MIME types accepted, transaction-per-row, sensitive fields never logged.

## Directory highlights (only new/changed files)

```
server/
  prisma/schema.prisma                      (extended: UserRole enum, AuditLog, UserPermissionOverride)
  seed-rbac.js                              (new)
  src/utils/permissions.js                  (new)
  src/utils/audit.js                        (new)
  src/middleware/rbac.js                    (extended)
  src/controllers/auditLogController.js     (new)
  src/controllers/importExportController.js (new)
  src/controllers/userManagementController.js (new)
  src/routes/adminRoutes.js                 (extended)
  src/controllers/authController.js         (audit-logs login/logout/register)
  src/controllers/adminController.js        (audit-logs product/order changes)
  src/controllers/couponController.js       (audit-logs coupon changes)

client/
  src/lib/permissions.js                    (new)
  src/components/PermissionGate.jsx         (new)
  src/components/ProtectedAdminRoute.jsx    (extended)
  src/components/admin/AdminLayout.jsx      (permission-filtered nav)
  src/pages/Unauthorized.jsx                (new)
  src/pages/admin/AdminAuditLogs.jsx        (new)
  src/pages/admin/AdminUsers.jsx            (new)
  src/pages/admin/AdminImportExport.jsx     (new)
  src/App.jsx                               (new routes)
```
