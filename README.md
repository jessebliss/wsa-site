# Walker Sports Academy

Scheduling for Walker Sports Academy. The public site is the session schedule, booking and checkout, membership signup, and the waiver. The academy’s existing website links here. Admin stays at `/admin`.

The schedule is in Eastern Time. Group sessions can be covered by a monthly plan tied to the parent email. Camps and private lessons are one-time payments. A waiver is stored before payment. Card data stays in Stripe.

## Local setup

```bash
npm install
cp .env.example .env
```

Fill in `.env`. For a local database:

```bash
createdb wsa
```

```
DATABASE_URL=postgresql://USER:PASSWORD@127.0.0.1:5432/wsa
```

Neon (production) uses a pooled URL that includes `neon.tech` and `sslmode=require`. The app then uses the Neon serverless driver. Queries look up a session, a date range, an email, or a subscription by index.

```bash
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Staff sign in at `/admin/login`. The academy admin uses `ADMIN_EMAIL` and `ADMIN_PASSWORD` and still manages the schedule, prices, plans, promos, waiver, rosters, and attendance. That admin creates coach logins at `/admin/coaches` (name, email, password) and links each one to a coach already on the schedule. Coaches only see `/admin/availability`: a month calendar where they open one-hour blocks or mark a day not available. The public schedule is a month calendar. A coach with a login is bookable only on days and hours they saved. Coach passwords are never stored in the repo.

Stripe checkout needs test keys (`sk_test_...` and `pk_test_...`). Without them, a parent who has sessions left on a monthly plan can still confirm a group spot. Card payments and new memberships wait on Stripe. Live keys are ignored unless `STRIPE_ALLOW_LIVE=true`.

Receipt email is sent only after a successful Stripe payment, and only when `RESEND_API_KEY` and `RECEIPT_FROM_EMAIL` are set. Subscription receipts include a Stripe billing-portal link to update the card or cancel.

Point Stripe webhooks at `/api/stripe/webhook` for:

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`
- `charge.refunded`

## Scripts

- `npm run dev` — local site
- `npm run build` — apply migrations, generate the Prisma client, and build
- `npm run db:migrate` — apply migrations
- `npm run db:seed` — add the starter plans, sessions, and waiver if they are missing
