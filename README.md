# Joby — the Miluim Marketplace (MVP)

A two-sided marketplace: **verified reservists** (30+ reserve days since 7 Oct 2023) and their **approved spouses** offer services; **anyone** can post a job or approach a provider directly. Providers spend credits to apply (10) or to accept a direct request (2). Both sides rate each other after every engagement.

- Product spec: [`docs/PRD.md`](docs/PRD.md) (v1.1)
- How the code is organized and why: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- Decisions made while building: [`docs/DECISIONS.md`](docs/DECISIONS.md)

## Stack

| Layer | Tool |
|---|---|
| App | Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Hebrew, right-to-left |
| Hosting | Vercel |
| Database, auth, files, scheduled jobs | Supabase (Postgres, Auth, Storage, pg_cron) |
| Sign-in | Phone OTP (Twilio via Supabase Auth) · Google |
| Later steps | WhatsApp Cloud API · Resend (email) · Claude API (Form 3010 + CV reading) |

## Project layout

```
src/
  app/                 pages and route handlers (App Router)
  app/auth/callback/   Google sign-in return URL
  lib/supabase/        Supabase clients: browser, server, service role, session proxy
  lib/database.types.ts  generated from the database — do not edit by hand (npm run db:types)
  lib/errors.ts        database error codes → Hebrew messages
  proxy.ts             refreshes the session on every request (Next 16 "proxy", formerly middleware)
supabase/
  migrations/          the whole database: tables, rules, security policies, timers
  seed.sql             category taxonomy (PRD §6)
  tests/               database tests (business rules end to end)
  config.toml          local Supabase settings (phone OTP, Google)
scripts/test-db.sh     runs the database tests
```

## Local development

Prerequisites: Node 20.9+, and **Docker Desktop** for the local Supabase stack.

```bash
npm install
npx supabase start                # local Postgres, Auth, Storage, Studio (first run downloads images)
cp .env.example .env.local        # paste the URL and keys printed by `supabase start`
npm run dev                       # http://localhost:3000
```

Local phone sign-in sends no SMS: test numbers `972500000001`–`972500000003` accept code `123456` (see `supabase/config.toml`). Studio (database UI) runs at http://127.0.0.1:54323.

### Changing the database

1. `npx supabase migration new <short_name>` and write SQL in the new file. Never edit a migration that is already deployed.
2. `npm run db:reset` — rebuilds the local database from all migrations + seed.
3. `npm run db:types` — regenerates `src/lib/database.types.ts`.
4. `npm run test:db` — runs the business-rule tests.

### Tests

```bash
npm run test:db        # database rules; needs PostgreSQL 15+ binaries OR a running local Supabase
npm run lint && npm run typecheck && npm run build
```

`test:db` without Docker: install PostgreSQL (`brew install postgresql@16` on Mac) and run it as is. With the local Supabase stack running instead: `TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres npm run test:db`.

CI (`.github/workflows/ci.yml`) runs all of the above on every push and pull request.

## Environments

| | Supabase project | Vercel |
|---|---|---|
| **staging** | `joby-staging` (free plan is fine) | Preview deployments (every pull request) |
| **production** | `joby-prod` (Pro plan before beta) | Production (branch `main`) |

## Deploying (first time)

1. **Supabase**: create the project in the region closest to Israel that Supabase offers (Frankfurt if there is no closer one). Then from this folder:
   ```bash
   npx supabase login
   npx supabase link --project-ref <project-ref>
   npx supabase db push                     # applies all migrations
   ```
   Run `supabase/seed.sql` once in the SQL Editor (categories).
2. **Supabase → Authentication → Providers**: enable **Phone** (Twilio: Account SID, Auth Token, Messaging Service SID) and **Google** (OAuth client from Google Cloud Console).
3. **Supabase → Authentication → URL Configuration**: Site URL = your Vercel URL; add `https://<your-domain>/auth/callback` to Redirect URLs.
4. **Supabase → Database → Extensions**: confirm `pg_cron` is enabled and the job `joby-run-timers` exists (`select * from cron.job;`). If the migration ran before pg_cron was enabled, run:
   ```sql
   select cron.schedule('joby-run-timers', '*/10 * * * *', 'select private.run_timers()');
   ```
5. **First admin**: after signing up with your own phone, run in the SQL Editor:
   ```sql
   insert into public.admins (user_id, role)
   select id, 'admin' from public.profiles where phone = '+9725XXXXXXXX';
   ```
6. **Vercel**: import the GitHub repo, framework Next.js, and set the variables from `.env.example` (Production and Preview separately). `SUPABASE_SECRET_KEY` and `ID_HASH_SALT` are server-only — never prefix them with `NEXT_PUBLIC_`.

## Accounts and ownership

All service accounts (GitHub organization, Vercel team, Supabase organization, Meta/WhatsApp, Twilio, Resend, Anthropic) are registered with the project email, not a personal one, and the credentials live in the shared password manager. Rename them when the brand name is final.
