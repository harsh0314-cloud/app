# StoreX E-Commerce — PRD & Progress

## Original Problem Statement
Audit and fix an existing production e-commerce platform (GitHub: harsh0314-cloud/ecommerce-platform), then add missing production-ready features. Strict backward compatibility: do NOT change architecture, routes, APIs, response formats, or redesign UI.

## Tech Stack (unchanged)
- Frontend: React 19 + Vite, React Router v7, Zustand, Axios, Tailwind, Framer Motion
- Backend: Node.js + Express, Prisma ORM, PostgreSQL, JWT auth, Multer, Razorpay, Nodemailer, PDFKit
- Deploy: Vercel (client) + Render (server) + Neon (db)

## Environment Setup (this workspace)
- Local PostgreSQL provisioned to match user's `DATABASE_URL` (localhost:5432, db `ecommerce_db`, `@` in password URL-encoded to `%40`).
- Supervisor programs: `ecom_server` (node, :8001, mapped to /api) and `ecom_client` (vite, :3000). Default template backend/frontend are stopped.
- Seed: `server/seed-test-data.js` creates admin/user/products/coupon.
- Test credentials in `/app/memory/test_credentials.md`.

## Core Requirements (static)
Existing features: auth (register/login/me), products+search+filters, cart, wishlist, coupons, orders (COD + Razorpay), reviews, admin panel (stats, products, inventory, orders, customers, categories, brands).

## Bugs Fixed (2026-07-21) — Milestone 1
1. **Razorpay checkout crash (CRITICAL)** — `createRazorpayOrder` wrote non-existent Prisma field `couponCode` and used `coupon.expiresAt` (field is `endDate`). Rewrote to use `couponId` + `endDate` + proper discount via `calculateOrderTotals`. Now returns a real Razorpay `order_id`.
2. **Reviews crash (CRITICAL)** — `reviewController` imported `AppError` as default instead of `{ AppError }`, breaking every error path. Fixed import.
3. **DB migration drift (CRITICAL)** — committed init migration missing `orders.paymentMethod` and had stale `payments` columns. Generated + applied new Prisma migration `sync_schema`.
4. **CORS blocked all browser writes (CRITICAL)** — origin whitelist was hardcoded; made env-driven (`CORS_ORIGINS`) + allow `*.vercel.app` and preview domains. Preserves existing Vercel origin.
5. **`<base target="_blank">` in index.html** — forced all links into new tabs; removed.
6. **Admin dashboard KPIs showed 0** — read `res.data.*` instead of `res.data.stats.*`; fixed.
7. **Rate limit too aggressive** — 100/15min blocked normal SPA browsing; raised to 1000 and skip GET/OPTIONS.
8. **Code quality** — removed debug `console.log`s (coupon/review controllers, useProducts).

## Testing
- Backend: 26/26 pytest pass (auth, products, cart, wishlist, coupons, COD orders, Razorpay order create, reviews, admin CRUD + RBAC).
- Verified CORS + admin stats shape via curl with browser Origin.

## Auth Features Added (2026-07-21) — Milestone 2
Implemented via `integration_expert` (Resend) with backward-compatible responses (only added fields):
- **Email Verification**: register creates EMAIL_VERIFICATION token + sends Resend email; `POST/GET /api/auth/verify-email` marks `isVerified` (single-use). `POST /api/auth/resend-verification` (auth).
- **Forgot/Reset Password**: `POST /api/auth/forgot-password` (no email enumeration) emails a 1h reset link; `POST /api/auth/reset-password` sets new bcrypt password (single-use, invalidates all sessions).
- **Refresh Tokens**: register/login now also return `refreshToken` + set httpOnly cookie; `POST /api/auth/refresh` rotates (old token invalidated); `POST /api/auth/logout` deletes session. Tokens stored sha256-hashed in `Session`/`VerificationToken` tables.
- **Frontend**: `/forgot-password`, `/reset-password`, `/verify-email` pages (luxe styled); "Forgot password?" link on Login; axios interceptor does single-flight silent refresh on 401 before redirecting.
- Files: server `controllers/authController.js`, `routes/authRoutes.js`, `utils/email.js`, `validators/authValidator.js`; client `services/api.js`, `store/authStore.js`, `pages/ForgotPassword.jsx`, `pages/ResetPassword.jsx`, `pages/VerifyEmail.jsx`, `pages/Login.jsx`, `App.jsx`.
- Tested: 13/13 new auth pytest pass + all UI pages + browser silent-refresh verified (iteration_2.json). Build ✅.
- NOTE: Resend TEST mode only delivers to your own verified Resend address; verify/reset links are also logged to server console in non-production for testing.


P0 (Auth/Payment/Orders):
- Forgot/Reset Password, Email Verification, Refresh Tokens (Resend key available)
- Razorpay Webhook signature verification (handler exists; wire secret + test), Duplicate Payment Protection, Invoice PDF (pdfkit installed)
- Order: Live Tracking, Cancel Order, Return/Exchange, Refund Tracking
P1 (Dashboard/Product/Search/Cart):
- Multiple Addresses, Recently Viewed (partial hook exists), Notification/Security Settings
- Image Zoom, Related Products, Frequently Bought Together, Instant Search + Suggestions
- Save for Later, Shipping Estimator, Guest Checkout
P2 (Admin/Security/SEO/Perf):
- Sales Dashboard, Revenue Analytics, Inventory Alerts, Customer Analytics, Export Orders
- Zod validation coverage, XSS protection, file upload validation (Helmet + rate limit already present)
- Dynamic meta (SEO.jsx exists), Sitemap, Robots.txt, Structured Data
- React.lazy/code splitting, lazy loading, skeleton loaders, image optimization

## Next Tasks
Start P0 auth features (Forgot/Reset Password + Email Verification + Refresh Tokens) using the provided Resend key, then Razorpay webhook verification + Invoice PDF.
