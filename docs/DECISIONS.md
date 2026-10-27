# Decisions log

Decisions made while building, beyond what the PRD states. Add new entries at the top.

| Date | Decision | Why |
|---|---|---|
| 2026-10-27 | **Stack**: GitHub + Supabase + Vercel, Next.js 16 / TypeScript / Tailwind. | Mainstream, easy to hand over; Supabase covers phone OTP, Google, storage, cron. |
| 2026-10-27 | **Business rules in Postgres functions**, RLS for reads, no direct writes except owner-edited content. | One place for the rules; cannot be bypassed from the browser; testable without UI. |
| 2026-10-27 | **Credit-back for unopened applications** uses "never opened by the poster" rather than "still in Sent". | If a poster hires someone else without ever opening an application, that provider still gets refunded at 30 days. |
| 2026-10-27 | **Closing / expiring / removing a job without a hire refunds every application still in play**, including ones the poster declined. Withdrawn ones are not refunded. | PRD 5.10: "all of that job's applications are refunded". |
| 2026-10-27 | **Withdrawing frees a slot** under the 30-applicant cap. | The cap is about posters' review load. |
| 2026-10-27 | **Duplicate ID hash** does not reject automatically: the request enters the queue flagged `duplicate_suspected`. | PRD §15 "blocked and routed to admin"; admin decides. |
| 2026-10-27 | **ID hash** is computed on the server with a secret salt (`ID_HASH_SALT`); `submit_verification` is callable only with the server key. | The salt never reaches the browser. |
| 2026-10-27 | **Wallet balance in its own table** (`provider_wallets`), not on the profile. | Profiles are public; balances are private. |
| 2026-10-27 | **Post-on-behalf claims** (phone + token) in a separate admin-only table `job_claims`. | Keeps the claimant's phone off the public jobs table. |
| 2026-10-27 | **Contact reveal** via `get_contact()`: after Contact or hire (Flow A), or approval (Flow B). | PRD 5.10 / 5.11. |
| 2026-10-27 | **Early feedback** is allowed before the +3-day request; the timer then records it as complete. | No reason to refuse a willing reviewer. |
| 2026-10-27 | **Heebo font self-hosted** from npm (`@fontsource-variable/heebo`). | No build-time dependency on Google Fonts. |
| 2026-10-27 | **Next.js 16** (`proxy.ts` replaces `middleware.ts`); pinned to a patched release. | 15.5.x had critical advisories. |
