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
    inventory.ts       Atomic stock reservation, sale, release and restock transitions
    order-lifecycle.ts Idempotent payment/order/inventory state transitions
    catalog.ts         Product/category/brand data access
    payments/revolut.ts Revolut Merchant API abstraction (server-only)
    rate-limit.ts       Upstash-backed distributed limiter with a local fallback
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
- `CRON_SECRET` — authorises the reservation-cleanup cron route.
- `REVOLUT_ENVIRONMENT` — `sandbox` or `production`.
- `REVOLUT_PUBLIC_KEY` / `REVOLUT_SECRET_KEY` / `REVOLUT_WEBHOOK_SECRET` — from
  the Revolut Business dashboard once the Merchant account is activated. The
  secret key and webhook secret are **only** read server-side
  (`src/lib/payments/revolut.ts`, `src/app/api/webhooks/revolut/route.ts`) and
  must never be prefixed `NEXT_PUBLIC_`.
- `NEXT_PUBLIC_SITE_URL` — canonical site URL, used for sitemap/structured data/absolute links.
- `EMAIL_*` — SMTP delivery for order confirmations and contact routing.
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` — shared production rate limiting.
- `BLOB_READ_WRITE_TOKEN` — product image uploads through Vercel Blob.

## Payments (Revolut)

- All Revolut API calls go through `src/lib/payments/revolut.ts`.
- Checkout flow: `src/actions/checkout.ts` recalculates prices/VAT/stock/shipping
  server-side, atomically reserves stock, creates an internal `Order`
  (`PENDING_PAYMENT`), creates a
  matching Revolut order, and returns only the public token/key to the browser.
  The frontend (`src/components/checkout/CheckoutForm.tsx`) mounts the
  `@revolut/checkout` embedded widget with that token.
- `src/app/api/webhooks/revolut/route.ts` is the source of truth for payment
  status: it verifies the HMAC-SHA256 signature (`Revolut-Signature` /
  `Revolut-Request-Timestamp` headers), is idempotent (`WebhookEvent` table
  dedupes by event id), and only marks an order `PAID` — and decrements stock —
  on `ORDER_COMPLETED`. The widget's `onSuccess` callback is used only for UX
  (redirecting the browser), never to mark an order paid.
- Pending Revolut orders expire after 30 minutes. A Vercel cron releases local
  stock reservations after the provider expiry and webhook retry grace period.
- Full refunds restore inventory exactly once. Failed/declined attempts leave
  the order pending because Revolut allows another attempt on the same order.
- Register `https://<your-domain>/api/webhooks/revolut` as a webhook URL in
  the Revolut Business dashboard, subscribed to at least `ORDER_COMPLETED`,
  `ORDER_AUTHORISED`, `ORDER_PAYMENT_FAILED`, and `ORDER_PAYMENT_DECLINED`.
  Revolut's current webhook API does not expose a refund event; refunds
  initiated in this application's admin area are reconciled immediately after
  the Revolut refund request succeeds.

## VAT

VAT rates are rows in the `VatRate` table (see `prisma/schema.prisma`), each
product references one. Nothing in the codebase hardcodes a percentage —
`src/lib/pricing.ts` takes the rate as a parameter everywhere. Manage rates at
`/admin/vat-rates`; the default selected under `/admin/settings` is used for
delivery VAT and the storefront display preference.

## Admin area

`/admin` (protected, `role: ADMIN` required) covers products, categories,
brands, orders (status/tracking/refunds), customers, delivery, VAT, discounts,
image uploads, and company settings. Promote a user to admin by setting
`role = 'ADMIN'` on their `User` row.

The settings page includes a production-readiness report. Production checkout
is blocked if required secrets, company details, VAT, shipping, or real product
media are missing.

## Production deployment (Vercel)

1. Use a Vercel plan that permits commercial use and create a managed
   PostgreSQL database in the same or a nearby region.
2. Import this repository into Vercel and add every value from `.env.example`
   to the Production environment. Use sandbox Revolut values in Preview.
3. Apply schema changes to production before routing traffic:

```
DATABASE_URL="<production-url>" npx prisma migrate deploy
```

4. Do **not** run `npm run db:seed` in production. It installs demonstration
   products, placeholder documents, a discount, and a known development login.
5. Register `https://<your-domain>/api/webhooks/revolut` in Revolut and store
   its signing secret as `REVOLUT_WEBHOOK_SECRET`.
6. Attach the custom domain, verify HTTPS, SPF, DKIM and DMARC, then complete
   the checklist shown at `/admin/settings`.
7. Configure uptime monitoring against `/api/health` and alert on non-200
   webhook responses. Database backups and restore testing belong with the
   selected PostgreSQL provider.

`vercel.json` runs a daily reservation cleanup compatible with Vercel Hobby.
Checkout also performs a small cleanup pass before creating each order, so
expired stock is released on demand. Vercel sends
`Authorization: Bearer <CRON_SECRET>` to the scheduled route.

## Pre-launch operator tasks

- Replace every seeded product, placeholder image, and `example.com` datasheet
  with real catalogue information, prices, stock, and documents.
- Enter the legal name, company number, VAT number, registered address, phone,
  public email, and default VAT rate under `/admin/settings`.
- Review delivery prices and disable the seeded `WELCOME10` discount unless it
  is intentionally part of the launch.
- Have the terms, privacy policy, and returns policy reviewed for the actual
  business and products before accepting orders.
- Test guest and registered checkout, failed payment, webhook replay, order
  email, fulfilment, full refund, stock restoration, and a backup restore in
  sandbox. Then complete one low-value production purchase and refund.

Run the local quality checks with:

```
npm test
npm run lint
npm run build
npm audit
```

## Known follow-ups

- **PDF invoice generation.** The schema already gives every order a
  human-readable `orderNumber` (e.g. `PGM-2026-00001`, independent of the
  internal cuid). Until PDF generation is added, issue compliant invoices
  through the business accounting system.
- **International checkout.** Checkout currently fixes billing and delivery
  country to Ireland. Add shipping zones and destination tax rules before
  accepting international orders.

## Production checklist

- Set all secrets from the hosting provider's encrypted environment settings,
  never in source control.
- Serve over HTTPS only (required for secure cookies and Apple Pay/Google Pay).
- Fill in and clear every blocker shown at `/admin/settings`.
- Point `DATABASE_URL` at a managed PostgreSQL instance and run `npx prisma migrate deploy`.
