# PGM Direct

E-commerce platform for **PGM Direct** (operated by **PGM Technologies Ltd**), an Irish
supplier of electronic components, automation equipment, sensors,
IoT hardware and specialist technical products.

## Stack

- Next.js (App Router) + React + TypeScript, server components by default
- Tailwind CSS
- PostgreSQL + Prisma ORM
- Server actions / route handlers for all mutations and payment logic
- Revolut Merchant API + Revolut Checkout for payments

## Project structure

```
prisma/
  schema.prisma      All data models (see below)
  seed.ts            Development seed data (categories, brands, products, VAT rates, admin user)
src/
  app/               Routes (pages, layouts, API route handlers)
  actions/           Server actions (cart, checkout, auth, account, contact, admin/*)
  components/        UI components, organised by domain (product, cart, checkout, admin, ...)
  lib/               Framework-agnostic business logic
    db.ts            Prisma client singleton
    auth.ts           Session/auth (JWT cookie, bcrypt password hashing)
    cart.ts           Cart resolution, stock validation, VAT-aware cart summary
    pricing.ts         VAT calculation — the single source of truth for money math
    orders.ts          Server-side order creation from the cart (recomputes everything)
    catalog.ts         Product/category/brand data access
    payments/revolut.ts Revolut Merchant API abstraction (server-only)
    rate-limit.ts       In-memory rate limiter for sensitive endpoints
```

Business logic lives in `lib/` and `actions/`, independent of any specific UI
component, so it can be reused by a future mobile app, import job, or ERP
integration without duplicating logic.

## Getting started

1. Install dependencies:
   ```
   npm install
   ```
2. Start PostgreSQL (a `docker-compose.yml` is included):
   ```
   docker compose up -d
   ```
   Or point `DATABASE_URL` in `.env` at any PostgreSQL instance.
3. Copy the example environment file and fill in real values before going to production:
   ```
   cp .env.example .env
   ```
4. Run migrations and seed development data:
   ```
   npx prisma migrate dev
   npm run db:seed
   ```
   The seed script prints a development admin login (`admin@pgmdirect.ie`) —
   **change this password immediately** in any shared environment.
5. Start the dev server:
   ```
   npm run dev
   ```

## Environment variables

See `.env.example`. Notably:

- `DATABASE_URL` — PostgreSQL connection string.
- `AUTH_SECRET` — long random string used to sign session JWTs.
- `REVOLUT_ENVIRONMENT` — `sandbox` or `production`.
- `REVOLUT_PUBLIC_KEY` / `REVOLUT_SECRET_KEY` / `REVOLUT_WEBHOOK_SECRET` — from
  the Revolut Business dashboard once the Merchant account is activated. The
  secret key and webhook secret are **only** read server-side
  (`src/lib/payments/revolut.ts`, `src/app/api/webhooks/revolut/route.ts`) and
  must never be prefixed `NEXT_PUBLIC_`.
- `NEXT_PUBLIC_SITE_URL` — canonical site URL, used for sitemap/structured data/absolute links.
- `EMAIL_*` — configure before wiring up transactional email (order confirmations, contact routing).

## Payments (Revolut)

- All Revolut API calls go through `src/lib/payments/revolut.ts`.
- Checkout flow: `src/actions/checkout.ts` recalculates prices/VAT/stock/shipping
  server-side, creates an internal `Order` (`PENDING_PAYMENT`), creates a
  matching Revolut order, and returns only the public token/key to the browser.
  The frontend (`src/components/checkout/CheckoutForm.tsx`) mounts the
  `@revolut/checkout` embedded widget with that token.
- `src/app/api/webhooks/revolut/route.ts` is the source of truth for payment
  status: it verifies the HMAC-SHA256 signature (`Revolut-Signature` /
  `Revolut-Request-Timestamp` headers), is idempotent (`WebhookEvent` table
  dedupes by event id), and only marks an order `PAID` — and decrements stock —
  on `ORDER_COMPLETED`. The widget's `onSuccess` callback is used only for UX
  (redirecting the browser), never to mark an order paid.
- Register `https://<your-domain>/api/webhooks/revolut` as a webhook URL in
  the Revolut Business dashboard, subscribed to at least `ORDER_COMPLETED`,
  `ORDER_PAYMENT_FAILED`, `ORDER_PAYMENT_DECLINED`, `ORDER_PAYMENT_REFUNDED`.

## VAT

VAT rates are rows in the `VatRate` table (see `prisma/schema.prisma`), each
product references one. Nothing in the codebase hardcodes a percentage —
`src/lib/pricing.ts` takes the rate as a parameter everywhere. Manage rates via
the database/Prisma Studio for now; an admin UI for VAT rates can be added
under `src/app/admin/` following the same pattern as categories/brands.

## Admin area

`/admin` (protected, `role: ADMIN` required) covers products, categories,
brands, orders (status/tracking/refunds) and customers. Promote a user to
admin by setting `role = 'ADMIN'` on their `User` row.

## Known follow-ups (not implemented in this pass)

- **PDF invoice generation.** The schema already gives every order a
  human-readable `orderNumber` (e.g. `PGM-2026-00001`, independent of the
  internal cuid) ready to print on an invoice; wire up a PDF library
  (e.g. `@react-pdf/renderer`) against `Order`/`OrderItem` when needed.
- **Transactional email.** `EMAIL_*` env vars are reserved; order confirmation
  email sending is stubbed with a comment in the webhook handler.
- **Image/document uploads.** The admin product form accepts image and
  document **URLs** rather than direct file uploads — wire up a storage
  provider (S3/Blob) and swap the URL fields for an upload widget.
- **Company details** (registration number, VAT number, address, phone,
  email) are intentionally left blank in `SiteSettings` until the real values
  are supplied — never populate these with placeholder data in production.
- Rate limiting (`src/lib/rate-limit.ts`) is in-memory, fine for a single
  instance; swap for a shared store (e.g. Redis) once running multiple
  server instances behind a load balancer.

## Production checklist

- Set all `REVOLUT_*` and `AUTH_SECRET` env vars from a secrets manager, never committed.
- Serve over HTTPS only (required for secure cookies and Apple Pay/Google Pay).
- Fill in real company details in `SiteSettings` (via Prisma Studio or an admin UI) before launch.
- Point `DATABASE_URL` at a managed PostgreSQL instance and run `npx prisma migrate deploy`.
