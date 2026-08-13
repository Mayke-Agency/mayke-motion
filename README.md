# Mayke Motion

Mayke Motion is a premium client portal platform for Mayke Agency clients. It gives retail, restaurant, and dance studio clients a curated operating dashboard for customer communication, inquiries, CRM, campaigns, analytics, integrations, billing, and business activity.

## Stack

- Next.js App Router
- React and TypeScript
- Prisma ORM
- PostgreSQL
- Tailwind CSS plus Mayke Motion design tokens
- Server actions for auth and dashboard mutations
- Cookie-backed sessions with hashed session tokens
- Middleware-protected dashboard and admin routes
- Role-aware, business-scoped data access
- Modular portal architecture for business-specific capabilities

## Local Setup

First move into the project directory:

```bash
cd /Users/alancampos/Documents/mayke-motion
```

Install dependencies:

```bash
npm install
```

Create `.env`:

```bash
cp .env.example .env
```

This workspace was verified against a local PostgreSQL server on port `55432`.

For a brand-new local database directory:

```bash
initdb -D postgres-data
pg_ctl -D postgres-data -l postgres.log -o "-p 55432 -k /tmp" start
createdb -h localhost -p 55432 mayke_motion
```

If `postgres-data` already exists, do not run `initdb` again. Start or check the existing server:

```bash
pg_ctl -D postgres-data status
pg_ctl -D postgres-data -l postgres.log -o "-p 55432 -k /tmp" start
```

If `createdb` says `database "mayke_motion" already exists`, that is fine. Continue with Prisma.

Apply the database schema and seed demo data:

```bash
npm run prisma:migrate
npm run prisma:seed
```

Generate the Prisma client manually if needed:

```bash
npm run prisma:generate
```

Run the app:

```bash
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Open `http://127.0.0.1:3000`.

If npm says a script is missing or Prisma says `prisma/schema.prisma` is missing, you are almost certainly in the wrong directory. Run `pwd` and make sure it prints `/Users/alancampos/Documents/mayke-motion`.

## Environment Variables

See `ENVIRONMENT.md` for provider-specific notes and production caveats.

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public"
SESSION_COOKIE_NAME="mayke_motion_session"
APP_URL="http://127.0.0.1:3000"
RESEND_API_KEY=""
RESEND_FROM_EMAIL="Mayke Motion <onboarding@resend.dev>"
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""
STRIPE_STARTER_PRICE_ID=""
STRIPE_GROWTH_PRICE_ID=""
STRIPE_PRO_PRICE_ID=""
```

`RESEND_API_KEY` enables real follow-up email sending. Keep it server-side only in `.env`; never prefix it with `NEXT_PUBLIC_`. `RESEND_FROM_EMAIL` should be a sender address or domain verified in Resend. The `onboarding@resend.dev` sender is useful only for limited local testing.

`STRIPE_SECRET_KEY` enables server-side checkout and customer portal sessions. `STRIPE_WEBHOOK_SECRET` verifies Stripe webhook events at `/api/stripe/webhook`. Each plan also needs a Stripe recurring price ID. Keep all Stripe secret values server-side only; never prefix them with `NEXT_PUBLIC_`.

## Production Deployment Checklist

Use this checklist when deploying Mayke Motion to Vercel with a production PostgreSQL database.

1. Create a production PostgreSQL database and set `DATABASE_URL` in Vercel.
2. Set `APP_URL` to the production app origin, for example `https://motion.maykeagency.com`.
3. Set `SESSION_COOKIE_NAME`; the current auth system uses database-backed random session tokens, so `NEXTAUTH_SECRET` and `NEXTAUTH_URL` are not used unless the app later migrates to NextAuth.
4. Set Resend values: `RESEND_API_KEY` and a production verified `RESEND_FROM_EMAIL`.
5. Set Stripe values: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and plan price IDs for Starter, Growth, and Pro.
6. Configure the Stripe webhook endpoint as `https://your-production-domain.com/api/stripe/webhook`.
7. Run production migrations with `npx prisma migrate deploy`.
8. Run `npm run prisma:seed` only if you intentionally want demo/admin seed data in that environment.
9. Confirm a Mayke admin account exists before inviting pilot clients.
10. Run `npm run build` before deploy or rely on the Vercel build command.

Recommended Vercel build settings:

```bash
npm install
npx prisma migrate deploy
npm run build
```

The package build command already runs `prisma generate && next build`. Vercel should not run `prisma migrate dev` in production.

## Private Staging Setup

Use staging before pilot launch so Mayke can test the portal with production-like hosting and a separate database.

See `STAGING_SETUP.md` for the focused manual GitHub, Vercel, staging database, Stripe webhook, Resend, and staging account checklist.

1. Create a separate staging PostgreSQL database.
2. Create or link a Vercel staging project.
3. Set staging env vars from `ENVIRONMENT.md`, including `DATABASE_URL`, `APP_URL`, `SESSION_COOKIE_NAME`, and the four `STAGING_*` account variables.
4. Enable Vercel Deployment Protection for the staging deployment if available.
5. Run staging migrations with `npx prisma migrate deploy`.
6. Create one Mayke admin and one pilot client with:

```bash
npm run staging:setup
```

7. Deploy with Vercel.
8. Open the staging URL and confirm admin login, pilot client login, and dashboard load.

Do not run the full demo seed in staging unless the purpose is demo-data QA. `npm run staging:setup` creates only the minimal pilot workspace and accounts.

## Local Demo Accounts

These credentials exist only in a local database created by `npm run prisma:seed`. They are not displayed by the application, should not be used for production, and should not be seeded into a real client workspace.

All demo accounts use:

```text
Motion2026!
```

- Restaurant owner: `owner@bloomtable.com`
- Restaurant staff: `staff@bloomtable.com`
- Mago retail owner: `owner@magohotsauce.com`
- Mago retail staff: `staff@magohotsauce.com`
- Dance studio owner: `owner@jetedance.com`
- Dance studio staff: `staff@jetedance.com`
- New client onboarding: `new@maykeclient.com`
- Mayke admin: `admin@mayke.agency`

The new client account intentionally has no business attached. After login it redirects to `/onboarding`, creates a workspace, and lands on a personalized dashboard.

## Quality Checks

```bash
npm run lint
npm run build
```

`npm run lint` currently runs TypeScript checking. The production build skips Next's built-in lint hook in `next.config.ts`; this avoids a Next/ESLint bridge issue in the current local toolchain while preserving type safety and production compilation checks.

## Security And Tenancy Notes

- `/dashboard/*` and `/admin/*` are protected by middleware and server-side route guards.
- `/onboarding` is protected and available only to signed-in non-admin users without a completed business workspace.
- Dashboard pages require a user attached to a business.
- Dashboard pages other than `/dashboard/billing` require an active or trialing subscription.
- Admin pages require the `ADMIN` role.
- Business data queries are scoped by `businessId`.
- Restaurant, retail, and dance studio modules are resolved from the signed-in business type and seeded module configuration.
- Form actions validate submitted data and prevent cross-business customer IDs.
- Onboarding creates a business, connects it to the signed-in owner, and scopes the initial activity log to the new business.
- Inquiry detail, customer profile, notes, conversion, and follow-up actions all re-check the signed-in user's `businessId` before reading or mutating records.
- Billing actions are server-side, scoped to the signed-in business, and restricted to client owners.
- Product creation is limited to retail businesses; menu item creation is limited to restaurants.
- Session cookie values are random tokens; only hashed token values are stored in the database.

## Portal Architecture

The app is organized around reusable portal systems instead of one-off pages:

- `app/` contains App Router routes for login, onboarding, admin, and dashboard modules.
- `components/dashboard/` contains reusable cards, tables, charts, forms, badges, empty states, and layout pieces.
- `lib/` contains auth, actions, Prisma access, billing, email, formatting, and business-type configuration.
- `server/tenant.ts` centralizes active tenant and subscription checks.
- `modules/portal-modules.ts` defines business-type module availability.
- `integrations/registry.ts` defines the Mayke-managed integration catalog.
- `prisma/schema.prisma` owns relational models for tenants, CRM, communication, campaigns, operations, billing, and integration readiness.

## Billing Foundations

Mayke Motion supports three subscription plan foundations:

1. Starter
2. Growth
3. Pro

Business records store the Stripe customer ID, Stripe subscription ID, plan, subscription status, and current period end. `/dashboard/billing` can start Stripe Checkout or open the Stripe customer portal when Stripe env vars are configured. If keys or price IDs are missing, the billing page shows inline errors instead of exposing secrets.

Stripe webhook handling exists at `/api/stripe/webhook` for registration and payment status events: `checkout.session.completed`, `payment_intent.succeeded`, and `payment_intent.payment_failed`. Subscription lifecycle events such as `customer.subscription.updated` remain a future billing hardening step.

## Inquiry Workflow Test Path

The first complete Mayke Motion workflow is inquiry management into CRM and follow-up:

1. Log in as `owner@magohotsauce.com` or `owner@bloomtable.com`.
2. Open `/dashboard/inquiries` and create an inquiry with either an existing customer or new lead contact details.
3. Open the inquiry detail page from the table.
4. Update status, add an internal note, save or send a follow-up email, and convert unlinked leads into customers.
5. Open the linked customer profile to confirm inquiry history and follow-up records are preserved.

With `RESEND_API_KEY` configured, “Send email” sends through Resend, stores provider metadata, updates the activity log, and attaches the email history to the inquiry and/or customer. Without a key, the form shows an error and stores a failed follow-up record for auditability.

## Known Limitations

- This MVP uses first-party, database-backed session auth; password-reset delivery and forced initial-password changes remain future work.
- Settings fields are read-only placeholders until business profile editing is added.
- Logo upload is a placeholder; no file storage provider is connected yet.
- Sales, product, menu, and campaign integrations are represented by local Prisma data only.
- Shopify, Toast, Square, Twilio, Klaviyo, and external CRM integrations are scaffolded as integration records and settings UI, not live sync jobs yet.
- Inquiry and customer follow-up emails can send through Resend when configured; SMS delivery is not connected yet.
- Stripe checkout and portal sessions are available when Stripe env vars are configured; subscription lifecycle webhook handling still needs to be expanded.
- Invite flows, password reset, and audit export are not implemented yet.

## Next Recommended Development Steps

- Add password reset and staff invite flows.
- Add automated tests for auth, route guards, and server actions.
- Add profile/settings editing with validation and audit logging.
- Add file storage for logos and brand assets.
- Add production auth/session hardening before public deployment.
- Expand Stripe webhook coverage for subscription lifecycle updates.
- Integrate Stripe, Shopify, Toast, Square, and email/SMS providers behind feature flags.
- Continue expanding role management and secure invite acceptance flows.
- Add automated integration sync jobs and operational module CRUD once provider credentials are available.

## Verified Commands

```bash
npm run lint
npm run build
```
