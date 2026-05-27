# Mayke Motion Testing Checklist

Use this checklist before testing with real users or making feature changes.

## Focused Stability Pass - 2026-05-20

Checked:

- Reused the single active dev server on `http://localhost:3000`.
- Confirmed the restaurant dashboard returns `200` for the existing restaurant demo login.
- Confirmed Coyote Grill appears on the restaurant dashboard.
- Confirmed restaurant modules still include Menu and Reservations.
- Confirmed the sidebar markup includes the sign-out action.
- Confirmed the sidebar nav uses viewport-height layout with a scrollable navigation region.

Fixed:

- Fixed desktop sidebar layout so the shell fits within the viewport and the nav area scrolls when menu items exceed available space.
- Kept the sidebar footer fixed in the sidebar flow so the sign-out button remains accessible.
- Renamed the restaurant demo/client from the generic restaurant name to Coyote Grill in seed data, the active local database, and testing references.

Remaining known issues:

- Restaurant demo login emails are unchanged to preserve existing credentials.

## Latest Local Audit

Status: passing for manual MVP testing.

Verified in the current local environment:

- One active Next.js development server on `http://localhost:3000`.
- Signed-out `/dashboard` requests redirect to `/login`.
- Mayke admin can view all three demo tenants: Coyote Grill, Mago Hot Sauce, and Jete Dance Center.
- Restaurant, retail, and dance studio dashboards render the correct seeded business data.
- Sidebar modules adapt by business type.
- Wrong-business inquiry and customer detail URLs return not found instead of leaking data.
- Browser route checks reported no console errors across audited dashboard routes.
- Mobile viewport at `390px` keeps navigation and dashboard content accessible.

Fixed during this audit:

- Replaced the old Urban Thread retail demo with Mago Hot Sauce across seed data, login copy, and docs.
- Updated retail demo products, inquiries, campaigns, orders, conversations, and activity to match Mago Hot Sauce.
- Made non-enabled module pages explicit with `Product catalog is not enabled` and `Menu is not enabled` empty states.
- Renamed product and menu panel headings to `Product catalog` and `Menu library` for clearer tester expectations.
- Restarted the single dev server after production build verification to clear stale Next.js `.next` chunks from the active development process.

Known issues:

- Browser automation input typing was unavailable in the local audit tool, so manual form submission should still be checked by hand in the browser.
- Resend is configured only if `.env` contains a verified sender and valid API key; `onboarding@resend.dev` is not a real client sending domain.
- Stripe checkout and portal require Stripe env vars and production webhooks are still pending.
- Logo upload and settings editing remain staged placeholders.

Remaining priorities:

- Add automated Playwright or Vitest coverage for auth, tenancy, and server actions.
- Add production Stripe webhook handling.
- Add staff invites, password reset, and audit export.
- Add real integration sync jobs behind feature flags.

## Local Startup

```bash
cd /Users/alancampos/Documents/mayke-motion
pg_ctl -D postgres-data status
npm run prisma:migrate
npm run prisma:seed
npm run dev -- --hostname 127.0.0.1 --port 3000
```

If port `3000` is already in use, run:

```bash
npm run dev -- --hostname 127.0.0.1 --port 3001
```

## Demo Credentials

Password for all demo users:

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
- Admin: `admin@mayke.agency`

## Email Provider Setup

Real follow-up sending uses Resend from server actions.

Add these to `.env`:

```bash
RESEND_API_KEY="re_..."
RESEND_FROM_EMAIL="Mayke Motion <verified-sender@example.com>"
```

- Keep `RESEND_API_KEY` server-side only. Do not use `NEXT_PUBLIC_`.
- Use a Resend-verified sender or domain for `RESEND_FROM_EMAIL`.
- If `RESEND_API_KEY` is missing, sending should show an inline error and store a failed follow-up record in history.

## Stripe Billing Setup

Real subscription checkout and portal sessions use Stripe from server actions.

Add these to `.env`:

```bash
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_STARTER_PRICE_ID="price_..."
STRIPE_GROWTH_PRICE_ID="price_..."
STRIPE_PRO_PRICE_ID="price_..."
```

- Keep `STRIPE_SECRET_KEY` server-side only. Do not use `NEXT_PUBLIC_`.
- Each price ID should be a recurring subscription price in Stripe.
- If Stripe env vars are missing, billing buttons should show inline errors without exposing secrets.
- Production webhooks are still a TODO; checkout returning successfully does not yet finalize local subscription state.

## Access And Auth

- Visit `/dashboard` while signed out. Expected: redirect to `/login`.
- Visit `/onboarding` while signed out. Expected: redirect to `/login`.
- Visit `/admin` while signed out. Expected: redirect to `/login`.
- Log in as `owner@bloomtable.com`. Expected: restaurant dashboard with Menu navigation.
- Log out. Expected: return to `/login`.
- Log in as `owner@magohotsauce.com`. Expected: Mago retail dashboard with Products navigation.
- Log in as `owner@jetedance.com`. Expected: dance studio dashboard with Events and Announcements navigation.
- Log in as `new@maykeclient.com`. Expected: redirect to `/onboarding`.
- Log in as `admin@mayke.agency`. Expected: admin client command view.
- Try visiting `/admin` as a client user. Expected: redirect back to `/dashboard`.

## Billing

- Log in as `owner@bloomtable.com`.
- Open `/dashboard/billing`. Expected: current Growth plan, active status, Stripe readiness, and Starter/Growth/Pro cards.
- Click an upgrade button without Stripe configured. Expected: inline configuration or price ID error.
- Click `Manage in Stripe` without Stripe configured. Expected: inline Stripe configuration error.
- Log in as `staff@bloomtable.com` and open `/dashboard/billing`. Expected: page is visible but billing actions return owner-only errors.
- With Stripe env vars configured, click a plan. Expected: redirect to Stripe Checkout.
- With Stripe env vars configured, click `Manage in Stripe`. Expected: redirect to Stripe Customer Portal.
- Manually set a business `subscriptionStatus` to `INACTIVE` or `CANCELED` in the database. Expected: `/dashboard` redirects to `/dashboard/billing?restricted=subscription`, while `/dashboard/billing` remains accessible.

## Onboarding

- Log in as `new@maykeclient.com`.
- Confirm `/onboarding` shows business name, business type, website, contact email, phone, brand color, logo placeholder, address, and description fields.
- Submit the form with missing required fields. Expected: browser validation or inline error.
- Create a restaurant workspace. Expected: redirect to `/dashboard`, restaurant labels show, and Menu navigation appears.
- Reseed the database, log in as `new@maykeclient.com` again, then create a retail workspace. Expected: redirect to `/dashboard`, retail labels show, and Products navigation appears.
- Reseed the database, log in as `new@maykeclient.com` again, then create a dance studio workspace. Expected: redirect to `/dashboard`, education labels show, and Events navigation appears.
- After onboarding, visit `/onboarding` again. Expected: redirect to `/dashboard`.
- Admin users should not use onboarding. Expected: `/onboarding` redirects admins to `/admin`.

## Restaurant Account

- Log in as `owner@bloomtable.com`.
- Confirm overview metrics, revenue chart, menu chart, inquiries, campaign pulse, and activity feed render.
- Open `/dashboard/customers`; search for `Nora`.
- Add a test customer with a valid email.
- Open `/dashboard/inquiries`; create a reservation or catering inquiry. Use either an existing customer or new lead name/email/phone.
- Open the new inquiry detail page from the inquiry table. Expected: request detail, status form, notes, conversion panel, and follow-up composer render.
- Update the inquiry status to `In progress`. Expected: success message, refreshed status badge, and activity log entry.
- Add an internal note. Expected: note appears in the notes timeline.
- If the inquiry is a new lead, convert it into a customer. Expected: customer profile link appears and the new customer appears in `/dashboard/customers`.
- Save a follow-up email draft, then mark a follow-up sent. Expected: follow-up history updates and the customer profile shows follow-up history.
- With Resend configured, click `Send email`. Expected: success message, `SENT` history item, provider message ID, and activity log entry.
- Without Resend configured, click `Send email`. Expected: inline configuration error and `FAILED` history item.
- Open the linked customer profile. Expected: inquiry history includes the converted inquiry.
- Open `/dashboard/sales`; confirm restaurant sales render.
- Open `/dashboard/menu`; confirm menu items render and add a test menu item.
- Open `/dashboard/products`; expected: `Product catalog is not enabled`.
- Open `/dashboard/reservations`; confirm reservation queue renders.
- Open `/dashboard/marketing`; create a scheduled campaign.
- Open `/dashboard/analytics`; confirm restaurant analytics render.
- Open `/dashboard/integrations`; confirm Toast, Resend, and Stripe integration statuses render.
- Open `/dashboard/communications`; confirm conversation history renders.
- Open `/dashboard/notifications`; confirm workspace notifications render.
- Open `/dashboard/settings`; confirm Coyote Grill brand colors show `#241915` and `#733038`.

## Retail Account

- Log in as `owner@magohotsauce.com`.
- Confirm overview metrics, revenue chart, product chart, inquiries, campaign pulse, and activity feed render.
- Open `/dashboard/customers`; search for `Lena`.
- Add a test customer with a valid email.
- Open `/dashboard/inquiries`; create a product question or wholesale inquiry. Use either an existing customer or new lead name/email/phone.
- Open the seeded `Heat level help for Mago Variety Flight` inquiry. Expected: it starts as an unconverted lead with a draft follow-up.
- Convert that inquiry into a customer. Expected: the lead becomes a CRM customer and follow-up records link to the new profile.
- Add an internal note and mark a follow-up sent. Expected: both actions appear on the inquiry detail page and activity feed.
- With Resend configured, send a follow-up from the inquiry detail page. Expected: Resend accepts the email and Mayke Motion stores the sent record.
- Open the linked customer profile. Expected: inquiry history and follow-up timeline show the workflow records.
- Send a direct customer follow-up from the customer profile. Expected: message is connected to the customer even when it is not tied to a specific inquiry.
- Open `/dashboard/sales`; confirm retail sales render.
- Open `/dashboard/products`; confirm products render and add a test product.
- Open `/dashboard/menu`; expected: `Menu is not enabled`.
- Open `/dashboard/reservations`; expected: not enabled message.
- Open `/dashboard/marketing`; create a scheduled campaign.
- Open `/dashboard/analytics`; confirm retail analytics render.
- Open `/dashboard/integrations`; confirm Shopify, Klaviyo, and Stripe integration statuses render.
- Open `/dashboard/communications`; confirm conversation history renders.
- Open `/dashboard/notifications`; confirm workspace notifications render.
- Open `/dashboard/settings`; confirm Mago Hot Sauce brand colors show `#14110f` and `#9b6548`.

## Dance Studio Account

- Log in as `owner@jetedance.com`.
- Confirm overview metrics, revenue chart, program momentum chart, inquiries, campaign pulse, and activity feed render.
- Open `/dashboard/customers`; search for `Amara`.
- Add a test family contact with a valid email.
- Open `/dashboard/inquiries`; create a registration, class info, or recital inquiry.
- Open the seeded `Trial class follow-up for jazz program` inquiry. Expected: it starts as an unconverted lead with a draft follow-up.
- Convert the inquiry into a customer. Expected: CRM customer profile appears and inquiry history follows the profile.
- Add an internal note and save a follow-up draft. Expected: notes and follow-up history update.
- With Resend configured, send a follow-up from the inquiry detail page. Expected: Resend accepts the email and Mayke Motion stores the sent record.
- Open `/dashboard/events`; confirm classes, recitals, workshops, and registrations render.
- Open `/dashboard/announcements`; confirm recital or registration announcements render.
- Open `/dashboard/products`; expected: `Product catalog is not enabled`.
- Open `/dashboard/menu`; expected: `Menu is not enabled`.
- Open `/dashboard/marketing`; confirm the recital campaign renders.
- Open `/dashboard/analytics`; confirm top programs render.
- Open `/dashboard/integrations`; confirm Resend, Twilio, and Stripe statuses render.
- Open `/dashboard/communications`; confirm parent/student communication history renders.
- Open `/dashboard/notifications`; confirm studio notification signals render.
- Open `/dashboard/settings`; confirm Jete Dance Center profile and modules render.

## Multi-Tenancy

- Restaurant users should never see Mago customers, products, sales, inquiries, or campaigns.
- Retail users should never see Coyote Grill customers, menu items, sales, inquiries, or campaigns.
- Dance studio users should never see restaurant or retail customers, menu items, products, sales, inquiries, announcements, or events.
- Customer selection in inquiry forms should only include the current business's customers.
- Inquiry detail URLs should only load for the signed-in user's own business.
- Customer profile URLs should only load for the signed-in user's own business.
- Admin can see cross-business summary data only on `/admin`.
- Newly onboarded users should only see records created for their new `businessId`.
- Billing records and Stripe customer IDs should remain attached only to the signed-in user's `businessId`.
- Integrations, modules, notifications, conversations, reservations, announcements, events, and orders should remain scoped to the signed-in user's `businessId`.

## Forms And Errors

- Submit each create form with missing required fields. Expected: browser validation or inline error.
- Submit a customer with an invalid email. Expected: inline error.
- Submit valid create forms. Expected: success message and refreshed page data.
- Submit follow-up email forms with a missing recipient, subject, or short message. Expected: browser validation or inline error.
- Temporarily remove `RESEND_API_KEY` and try sending an email. Expected: inline error and no API key exposed in the browser.
- Confirm sign-out works from dashboard and admin.

## Mobile Responsiveness

- Test a narrow viewport around `390px` wide.
- Confirm sidebar stacks above content.
- Confirm nav links wrap cleanly.
- Confirm tables scroll horizontally instead of breaking layout.
- Confirm forms remain usable on mobile.

## Final Quality Checks

```bash
npm run lint
npm run build
```
