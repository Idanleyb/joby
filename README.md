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

Local phone sign-in sends no SMS: test numbers `972500000001`–`972500000012` accept code `123456` (see `supabase/config.toml`). Studio (database UI) runs at http://127.0.0.1:54323.

### Changing the database

1. `npx supabase migration new <short_name>` and write SQL in the new file. Never edit a migration that is already deployed.
2. `npm run db:reset` — rebuilds the local database from all migrations + seed.
3. `npm run db:types` — regenerates `src/lib/database.types.ts`.
4. `npm run test:db` — runs the business-rule tests.

### Tests

```bash
npm run test:unit      # pure logic (reserve-day counting, AI output cleaning)
npm run test:db        # database rules; needs PostgreSQL 15+ binaries OR a running local Supabase
npm run lint && npm run typecheck && npm run build
```

`test:db` without Docker: install PostgreSQL (`brew install postgresql@16` on Mac) and run it as is. With the local Supabase stack running instead: `TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres npm run test:db`.

End-to-end (real browser, phone width) — needs the app and the local Supabase stack running, on a fresh database:

```bash
npm run db:reset && JOBY_AI_FAKE=1 npm run build && JOBY_AI_FAKE=1 npm start   # app on :3000, canned AI readings
E2E_SUPABASE_URL=http://127.0.0.1:54321 \
E2E_SUPABASE_ANON_KEY=<anon key from supabase status> \
E2E_SUPABASE_SERVICE_KEY=<service_role key from supabase status> \
npm run test:e2e
```

They use the test phone numbers from `supabase/config.toml` (code `123456`), so no SMS is sent. `JOBY_AI_FAKE=1` makes Form 3010 / CV reading return canned results based on the file name (see `src/lib/ai/form3010.ts`), and is refused on Vercel production.

CI (`.github/workflows/ci.yml`) runs lint, types, build and the database tests on every push and pull request.

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
   **Updating an existing project without the CLI:** `bash scripts/make-bootstrap-sql.sh --after <last applied version> > update.sql`, paste into the SQL Editor, Run. It applies only the newer migrations and records them.
   **No command line?** On an empty project you can instead run `bash scripts/make-bootstrap-sql.sh > bootstrap.sql` (or use the file from the founder chat), paste it into the SQL Editor and click Run. It applies every migration and the seed in one transaction and records the migration history, so later `supabase db push` runs only newer migrations.
2. **Supabase → Authentication → Providers**:
   - **Phone**: enable, SMS provider **Twilio Verify** (Account SID, Auth Token, Verify Service SID from the Twilio console → Verify → Services). Verify handles sender IDs and code delivery, which is simpler than running our own sender for Israel. Add test numbers with fixed codes if you want to test without SMS charges. Two traps seen in setup:
     - Twilio refuses to send until its identity check is approved (error *"Primary compliance profile is not approved"*): complete **Trust Hub → Profiles → Primary** (individual or business) and wait for approval.
     - Error *"Invalid From Number (caller ID): VA…"* means the dropdown is set to **Twilio** instead of **Twilio Verify**. The `VA…` service SID only works with Twilio Verify.
     - The sign-in form shows the technical error code in small print under the message, which is usually enough to diagnose.
   - **Google**: in Google Cloud Console → APIs & Services → Credentials, create an *OAuth client ID* (type: Web application) with the authorized redirect URI `https://<project-ref>.supabase.co/auth/v1/callback`, then paste the client ID and secret into Supabase.
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

The MVP starts on the founder's personal accounts and moves to dedicated company accounts if it succeeds. To keep that move cheap:

| Service | Start (personal) | Moving later |
|---|---|---|
| GitHub | Personal account, private repo used only for Joby | Transfer the repository to the company organization (history, issues and pull requests move with it) |
| Supabase | A separate **organization** named for Joby inside the personal account, holding only Joby's projects | Transfer the projects to the company organization; keys and URL stay the same |
| Vercel | Personal account, one project for Joby. Hobby is fine while building; **upgrade to Pro before real users**, because Hobby is for non-commercial use only | Transfer the project to the company team; re-check environment variables and domain |
| Domain | Registered in the founder's name | Transfer to the company registrar account |
| WhatsApp (Meta) | Create a **Meta business portfolio for Joby** from day one, even if owned by the personal Facebook account | Add the company admins to the portfolio; avoid re-registering the number |
| Twilio, Resend, Anthropic | Personal accounts, with a separate project or API key for Joby | Create company accounts and swap the keys in Vercel and Supabase |

Rules that apply from day one: every secret lives only in environment variables (never in code), each service uses keys created only for Joby, and the list of accounts and where each key is used is kept up to date in the password manager.
