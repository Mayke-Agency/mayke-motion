# Mayke Motion Environment Guide

Mayke Motion keeps provider credentials on the server only. Never prefix secrets with `NEXT_PUBLIC_`.

## Vercel Production Variables

Set these in Vercel Project Settings → Environment Variables for Production, Preview, and Development as appropriate.

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public&sslmode=require"
APP_URL="https://your-production-domain.com"
SESSION_COOKIE_NAME="mayke_motion_session"

RESEND_API_KEY="re_..."
RESEND_FROM_EMAIL="Mayke Motion <hello@verified-domain.com>"

STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_STARTER_PRICE_ID="price_..."
STRIPE_GROWTH_PRICE_ID="price_..."
STRIPE_PRO_PRICE_ID="price_..."
```

Auth note: Mayke Motion currently uses first-party, database-backed session tokens, not NextAuth. `NEXTAUTH_SECRET` and `NEXTAUTH_URL` are not required unless the auth layer is migrated to NextAuth later. `APP_URL` is the production URL used by Stripe redirects and public registration payment URLs.

## Private Staging Variables

Use a separate Vercel project or Preview/Staging environment with its own PostgreSQL database. Do not point staging at production data.

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

Optional staging values:

```bash
STAGING_CLIENT_SLUG="pilot-client"
```

After staging migrations run, create only the minimal accounts/workspace:

```bash
npm run staging:setup
```

Protect staging with Vercel Deployment Protection when available. If password protection is enabled, keep the protection password outside the app env and share it only with Mayke testers.

## Local Variables

```bash
DATABASE_URL="postgresql://alancampos@localhost:55432/mayke_motion?schema=public"
SESSION_COOKIE_NAME="mayke_motion_session"
APP_URL="http://localhost:3000"
```

- `DATABASE_URL` points Prisma at PostgreSQL.
- `SESSION_COOKIE_NAME` controls the first-party session cookie name.
- `APP_URL` must be the canonical app origin. Use localhost locally and the deployed Vercel URL or custom domain in production.

## Email / Resend

```bash
RESEND_API_KEY="re_..."
RESEND_FROM_EMAIL="Mayke Motion <verified-sender@example.com>"
```

- `RESEND_API_KEY` enables real follow-up, campaign, and announcement email sending.
- `RESEND_FROM_EMAIL` must use a Resend-verified sender or domain for real client delivery.
- Client onboarding stores sender name, sender email, domain, and verification status in Prisma.
- DNS verification is currently represented as a status placeholder in the app; verify the sending domain directly in Resend before launch.
- `Mayke Motion <onboarding@resend.dev>` is only useful for limited sandbox testing and is not appropriate for production clients.
- TODO: Add Twilio credentials when SMS reminders and campaign sends are implemented.

## Stripe

```bash
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_STARTER_PRICE_ID="price_..."
STRIPE_GROWTH_PRICE_ID="price_..."
STRIPE_PRO_PRICE_ID="price_..."
```

- `STRIPE_SECRET_KEY` enables server-side Stripe Checkout, customer portal, registration payments, and Stripe Connect Express onboarding.
- Stripe Connect Express uses the same Stripe secret key in this MVP; there is no separate Connect client ID env var in the current implementation.
- `STRIPE_WEBHOOK_SECRET` verifies `POST /api/stripe/webhook`.
- Configure the production Stripe webhook endpoint as `https://your-production-domain.com/api/stripe/webhook`.
- The webhook currently handles `checkout.session.completed`, `payment_intent.succeeded`, and `payment_intent.payment_failed`.
- Plan price IDs must be recurring Stripe subscription prices.
- Missing Stripe values produce inline billing/payment errors without exposing secrets.

## Prisma Production Commands

Use migrations in production. Do not use `prisma migrate dev` against production.

```bash
npx prisma migrate deploy
npx prisma generate
```

For an initial controlled demo/admin setup, run the seed script once against the production database only if demo accounts are wanted:

```bash
npm run prisma:seed
```

For a real launch, prefer creating the Mayke admin and first client through a one-off production-safe setup script or the admin UI, then remove demo/test records using the admin cleanup tool before pilot launch.

## Integration Roadmap

The app currently stores integration readiness in Prisma for Shopify, Stripe, Square, Toast, Resend, Twilio, Klaviyo, and external CRM systems. Provider-specific API credentials should be added only when those sync jobs are implemented and can be stored securely.
