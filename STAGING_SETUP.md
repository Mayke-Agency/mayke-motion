# Mayke Motion Staging Setup

Use this for a private Vercel staging deployment. This is a manual setup guide only; do not point staging at production data.

## What Is Ready

- App Router dashboard, admin, onboarding, CRM, communications, campaigns, billing foundations, and Jete workflows are present.
- Production build command exists: `npm run build`.
- Prisma production migration command is `npx prisma migrate deploy`.
- Minimal staging account/workspace setup command exists: `npm run staging:setup`.
- Stripe webhook endpoint exists at `POST /api/stripe/webhook`.
- Resend is server-side only through `RESEND_API_KEY` and `RESEND_FROM_EMAIL`.
- Production Stripe redirects require `APP_URL`; the code throws in production if `APP_URL` is missing.

## Manual Vercel Setup

1. Push the current repo to GitHub.
2. Create a separate staging PostgreSQL database.
3. Create or import the project in Vercel from GitHub.
4. Set Vercel Environment Variables for the staging environment.
5. Run database migrations against the staging database.
6. Run the staging setup command once to create one Mayke admin and one pilot client.
7. Deploy from Vercel.
8. Open the staging URL and test admin login, pilot client login, dashboard load, module visibility, and logout.

## Required Staging Env Vars

Set these in Vercel for the staging environment:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@STAGING_HOST:5432/STAGING_DB?schema=public&sslmode=require"
APP_URL="https://your-staging-domain.vercel.app"
SESSION_COOKIE_NAME="mayke_motion_staging_session"

STAGING_ADMIN_EMAIL="admin@example.com"
STAGING_ADMIN_PASSWORD="use-a-private-password-12-chars-min"
STAGING_CLIENT_EMAIL="pilot@example.com"
STAGING_CLIENT_PASSWORD="use-a-private-password-12-chars-min"
STAGING_CLIENT_NAME="Pilot Client"
STAGING_CLIENT_TYPE="RETAIL"
```

Optional:

```bash
STAGING_CLIENT_SLUG="pilot-client"
```

`STAGING_CLIENT_TYPE` must be `RESTAURANT`, `RETAIL`, or `DANCE_STUDIO`.

## Optional Provider Env Vars

Email sending:

```bash
RESEND_API_KEY="re_..."
RESEND_FROM_EMAIL="Mayke Motion <hello@verified-domain.com>"
```

Use a Resend-verified sender/domain. DNS verification status is stored in Prisma as a setup signal, but the domain must be verified in Resend for real delivery.

Stripe:

```bash
STRIPE_SECRET_KEY="sk_test_or_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_STARTER_PRICE_ID="price_..."
STRIPE_GROWTH_PRICE_ID="price_..."
STRIPE_PRO_PRICE_ID="price_..."
```

Configure the Stripe webhook URL as:

```text
https://your-staging-domain.vercel.app/api/stripe/webhook
```

Current handled events:

- `checkout.session.completed`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`

## Auth Note

Mayke Motion currently uses first-party database-backed session tokens. `NEXTAUTH_SECRET` and `NEXTAUTH_URL` are not required unless the app is later migrated to NextAuth.

## Prisma Staging Commands

Do not use `prisma migrate dev` against staging.

Run migrations against the staging database:

```bash
npx prisma migrate deploy
```

Then create the minimal staging admin/client workspace:

```bash
npm run staging:setup
```

Do not run `npm run prisma:seed` in staging unless you intentionally want the full demo dataset.

## Vercel Build Command

Use:

```bash
npm run build
```

The package build script runs:

```bash
prisma generate && next build
```

## Known Staging Blockers To Clear

- `DATABASE_URL` must point to a reachable staging PostgreSQL database.
- `APP_URL` must match the deployed staging URL; Stripe redirects depend on it.
- Vercel Deployment Protection should be enabled for private staging.
- Resend sender/domain must be verified before real client email testing.
- Stripe webhook secret must match the webhook endpoint configured in Stripe.
- Staging passwords must be at least 12 characters.
- Run `npm run staging:setup` once after migrations so login accounts exist.
