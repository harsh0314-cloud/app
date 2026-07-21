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

## Payment Hardening Added (2026-07-21) — Milestone 3
Via `integration_expert` (Razorpay). Backward compatible.
- **Duplicate Payment Protection** — `verifyRazorpayPayment` idempotent (guards on existing payment + order status); no double inventory decrement / duplicate payment.
- **Razorpay Webhook Verification (fixed CRITICAL)** — webhook was mounted before `req.prisma` middleware → undefined; injected prisma into webhook route. Now confirms PENDING orders on `payment.captured`, idempotent on double-fire, rejects bad/missing signatures (400), returns 500 on error (Razorpay retries).
- **Invoice PDF** — `GET /api/orders/:id/invoice` (owner-or-admin, non-owner 404) streams pdfkit invoice; "Download Invoice" button on OrderDetails.
- **Robustness** — inventory decrements via `updateMany` (no P2025); flaky COD 404 resolved.
- Tested: 10/10 payment-hardening pytest pass (iteration_3.json). Build ✅.

## Backlog — Missing Production Features (not yet built)
P0 (Auth/Payment/Orders): DONE — Auth (verify/reset/refresh), Payment (webhook/dup-protect/invoice), Orders (tracking/cancel/return-exchange/refund).

## Orders Lifecycle Added (2026-07-21) — Milestone 4
Additive `ReturnRequest` model + migration. Backward compatible.
- **Live Order Tracking** — timeline (Placed→Confirmed→Processing→Shipped→Delivered) on OrderDetails with timestamps + tracking number; banner for cancelled/refunded.
- **Cancel Order** — `PATCH /api/orders/:id/cancel` (owner), allowed pre-shipment; restocks inventory, marks paid orders REFUNDED; 400 otherwise; non-owner 404.
- **Return/Exchange** — `POST /api/orders/:id/return` (owner, DELIVERED only, no duplicate open request); user form on OrderDetails.
- **Refund Tracking** — admin `GET/PATCH /api/admin/returns[/:id]`; COMPLETED → order REFUNDED + payment REFUNDED + inventory restock + refundAmount default=total. New Admin "Returns" page + sidebar nav.
- Tested: 12/12 lifecycle + 39/39 regression pass (iteration_4.json). Build ✅.

## Product & Search Discovery Added (2026-07-21) — Milestone 5
- **Related Products** — `GET /api/products/:slug/related` (same category, featured fallback). Fixed the old broken related fetch (queried category.id against a slug filter → empty).
- **Frequently Bought Together** — `GET /api/products/:slug/frequently-bought-together` (co-purchase ranking + category fallback); FBT section on PDP with bundle price + "Add all to Bag".
- **Instant Search + Suggestions** — `GET /api/products/suggestions?q=` (debounced dropdown in header with thumbnail/name/category/price; click-to-navigate; popular tags when <2 chars).
- **Image Zoom** — hover magnify (transform scale) on the PDP main image.
- **Fixes** — added missing `AppError` import in productController (was a latent 500 on unknown slug → now 404); fixed a **guest-redirect bug** in the axios interceptor (guests were bounced to /login on any auth-only 401 like canReview; now only redirect when a token actually existed). Cleaned catalog to 6 active products with valid images.
- Tested: 10/10 discovery + 61/61 regression pass (iteration_5.json); guest browsing verified. Build ✅.

## Cart & Checkout Added (2026-07-21) — Milestone 6
Additive `CartItem.savedForLater` + `User.isGuest` migration. Backward compatible.
- **Save for Later** — `PATCH /api/cart/:itemId/save` toggles; getCart splits active/saved (frontend Saved section with move-to-bag); order creation uses only active items and preserves saved items after checkout.
- **Shipping Estimator** — `POST /api/shipping/estimate` (metro/standard zones, free ≥₹500 else ₹99, ETA); pincode widget in Cart summary.
- **Guest Checkout** — `POST /api/auth/guest` (anonymous session) auto-created on first Add-to-Bag; `PATCH /api/auth/guest-details` attaches email/name at checkout; guest banner + email field on CheckoutPage. Reuses full cart/order/payment flow.
- **Fix** — getCart uses upsert to avoid first-visit cart-create race (P2002).
- Tested: 12/12 new + 71/71 regression = 83/83 pass (iteration_6.json). Build ✅.

## Remaining Backlog
P1 (User Dashboard): Multiple Addresses, Recently Viewed (partial hook exists), Notification/Security Settings.
P2 (Admin/Security/SEO/Perf):
- Sales Dashboard, Revenue Analytics, Inventory Alerts, Customer Analytics, Export Orders
- Zod validation coverage, XSS protection, file upload validation (Helmet + rate limit already present)
- Dynamic meta (SEO.jsx exists), Sitemap, Robots.txt, Structured Data
- React.lazy/code splitting, lazy loading, skeleton loaders, image optimization

## Next Tasks
Next P1: User dashboard — Multiple Addresses, Recently Viewed, Notification/Security Settings. Then P2 (admin analytics + export orders, SEO sitemap/robots/structured-data, code-splitting/skeletons).
