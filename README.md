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
  constraints.sql    PostgreSQL constraints not represented in the Prisma schema
  cable-making-production.sql  One-time additive update for an existing database
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
2. Start Docker Desktop (or another Docker runtime), then start PostgreSQL:
   ```
   docker compose up -d
   ```
   The included Compose service only exposes PostgreSQL on localhost.
   Or point `DATABASE_URL` in `.env` at an existing development PostgreSQL instance.
3. Copy the example environment file and fill in real values before going to production:
   ```
   cp .env.example .env
   ```
4. Create the database schema:
   ```
   npm run db:push
   ```
   This also applies PostgreSQL constraints that Prisma cannot express. Run it
   after schema changes; Prisma may prompt before changes that would lose data.
   To optionally add demonstration data, run `npm run db:seed`. The seed command
   loads `.env` through Prisma. It prints a development
   admin login (`admin@pgmdirect.ie`) when it creates the account —
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

## Google Merchant Center

The public RSS product feed is available at:

```
https://pgmdirect.ie/google-merchant.xml
```

Register this URL as a primary file data source in Merchant Center with Ireland
as the target country, English as the language, and a daily fetch schedule. The
feed is generated from the current database and includes VAT-inclusive EUR
prices, live availability, product links, images, brand, MPN, GTIN, category,
and shipping weight where available.

Only active products with at least one valid HTTP(S) image are included. Manage
GTIN and Google product category values in the product admin area. Delivery
charges and delivery times remain configured at account level in Merchant
Center so they can match the checkout methods and thresholds.

## Admin area

`/admin` (protected, `role: ADMIN` required) covers products, categories,
brands, orders (status/tracking/refunds), customers, delivery, VAT, discounts,
image uploads, and company settings. Promote a user to admin by setting
`role = 'ADMIN'` on their `User` row.

**Cable Making** (`/admin/cable-making`) tracks work and payments for one cable
maker. Use Overview for totals, Harnesses for creating and searching harnesses,
Parts for connectors and cables, Work log for completed batches, Payments for
payments, and Activity for the audit log. Add a harness (the default is €1 per
pin termination), then open Harness Creator to prepare a drawing. Expand
**Show saved wiring drawing** on its harness card to view it; open Harness Creator to edit it.
The add forms open within their sections. Each batch keeps the cable name, pin count,
and rate used at the time.
The location summary totals completed batches by their recorded cable name and
location, including older batches with no location. It is not a current stock
count. Record payments after they happen and use the summary to check the balance.
The tracker does not send money or replace the accounting system.
Each cable type can have one optional image (JPEG, PNG, or WebP, up to 1 MB)
and one optional PDF (up to 2 MB). Leave either or both file fields blank to
save without choosing a new file. Use **Preview attachments** in the cable
list to view an image or PDF without editing the cable type. If the browser
cannot show PDFs inline, use **Download PDF**. Files are stored in PostgreSQL,
and only admins can preview or download them.

Under **Connectors and cables**, define reusable connectors with numbered pins,
and cables with their core colours and optional stripes. Existing parts without
these details must be edited before selecting them in a new harness. Custom
colours can be picked or entered as hex values; unspecified colours stay
unspecified. Editing a part does not change saved harnesses: each selection
copies its current details into the drawing.
Connectors and cables can also have an optional JPEG, PNG or WebP image (up to
1 MB). A harness keeps the image selected when the part is added, even if the
library image is later replaced or removed. Use **Use library image** in the
creator to update an existing full harness drawing without changing its wiring,
then save the drawing. Existing drawings without images stay unchanged.

Open **Harness Creator**, add connector, bare-wire and splice ends, then add
the cables between them. For each cable core, choose the connector pin, enter
the bare-wire label or enter a splice group at each end. At a splice, core ends
with the same group name are joined; each group must have at least two core
ends. Mark unused cores spare. All cables must form one connected harness.
The preview and downloadable SVG use symbolic connector housings, bare-wire
ends and splice markers, and show the chosen core colours. These symbols do not
represent exact part geometry. The printable build
sheet lists all connections and colours. Print physical labels separately.
On the interactive full harness drawing, click a camera marker on a connector,
cable or harness to view its image. Harness images are managed through the
harness's optional attachments. Image markers are not included in downloaded
SVGs or printed sheets. Older simple and advanced drawings still support the
harness attachment, but do not have per-part image markers.

Each connected connector pin counts as one pin termination per harness;
spare cores and bare-wire ends are excluded. Saving requires at least one
connected connector pin and updates the count used for new batches. New harnesses
require a saved drawing before work can be recorded. Existing manually counted
types remain usable, and their counts are unchanged until their drawings are
saved. Previously recorded batches keep their original counts and rates.

Existing simple and advanced drawings continue to open in their original
editors. The older advanced drawing does not assign individual cable cores
or printed bare-end labels; specify those separately before manufacture.
Its W numbers and colours distinguish connections, not physical wire colours.
Older cable drawings are
converted in memory to harness segments, preserving leg lengths; check the
layout before saving. An existing advanced drawing can be replaced with a
simple build sheet, but its wiring is not copied automatically and is only
replaced when the new sheet is saved. An old drawing can also be explicitly
replaced by a new multi-cable harness; wiring is not copied automatically.
Drawings are schematic, not to scale.
Use the trash icon to delete a part after confirmation. A part used by a saved
drawing cannot be deleted until it is removed from each drawing and those
drawings are saved.

Use the pencil icon to edit cable types, completed batches, and payment records.
Select **Louise** or **PGM** when recording or editing a batch. Existing batches
without a location show **Not set** until edited. Batch edits can change the
date, quantity, and location; earnings still use the original pin count and rate.
Payment edits update the tracker only.
The admin-only **Activity log** records successful Cable Making changes from
when the log was enabled, with the administrator's email and previous and new
values. It covers parts, harnesses, drawings, work batches, payments and
attachments, including deletions; it cannot reconstruct earlier changes or
changes made directly in the database. Attachment entries retain file metadata
and a SHA-256 fingerprint, not file contents. Entries are retained independently
of the records and accounts they describe.
Use the trash icon to delete attachments, completed batches, and payment records after
confirming. Deleting a cable type removes its attachments and stops it from
being selected for new batches, but keeps historical work and earnings.
Deleting a work or payment record updates the balance.

The settings page includes a production-readiness report. Production checkout
is blocked if required secrets, company details, VAT, shipping, or real product
media are missing.

## Production deployment (Vercel)

1. Use a Vercel plan that permits commercial use and a managed PostgreSQL
   database in the same or a nearby region. Keep the existing database if the
   application is already live.
2. Connect this repository to Vercel and configure the Production environment
   using `.env.example` as a reference. Use sandbox Revolut values in Preview.
3. For an existing production database that does not yet have Cable Making,
   back up the database and verify its schema matches the previous deployed
   version before applying the one-time `prisma/cable-making-production.sql`.
   It creates only the new Cable Making objects and must be applied before
   deploying the new application. The script was generated against the
   repository's previous deployed schema; stop if production differs or if
   Cable Making objects already exist. From a trusted environment with
   `DATABASE_URL` securely set to the production database, run:

   ```
   npx prisma db execute --schema prisma/schema.prisma --file prisma/cable-making-production.sql
   ```

   Verify the target before running this command. Do not use `db:push` or
   `--force-reset` on production. The script assumes Cable Making objects do not
   already exist and does not update Prisma's migration history. Reconcile
   that history and establish a reviewed migration strategy for future changes.

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
- Apply the appropriate reviewed database update before deploying; establish
  a migration strategy for subsequent production schema changes.
