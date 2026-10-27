# Decisions log

Decisions made while building, beyond what the PRD states. Add new entries at the top.

| Date | Decision | Why |
|---|---|---|
| 2026-10-27 | **Stack**: GitHub + Supabase + Vercel, Next.js 16 / TypeScript / Tailwind. | Mainstream, easy to hand over; Supabase covers phone OTP, Google, storage, cron. |
| 2026-10-27 | **Business rules in Postgres functions**, RLS for reads, no direct writes except owner-edited content. | One place for the rules; cannot be bypassed from the browser; testable without UI. |
| 2026-10-27 | **Founder (PRD v1.2): job lifetime** is 30 days plus one 30-day extension approved by the poster (60 days maximum). | Gives more providers a chance to apply. |
| 2026-10-27 | **Founder (PRD v1.2): no refund for unopened applications once the job ends with a hire.** The 30-day unopened refund applies only while the job is still open. | The poster used the platform to hire. |
| 2026-10-27 | **Founder (PRD v1.2): job ends without a hire** (closed, expired after up to 60 days, removed) → every application refunded, including declined ones; withdrawn ones are not. | PRD 5.10. |
| 2026-10-27 | **Founder (PRD v1.2): duplicate identity.** User accounts cannot be duplicated (unique user id and phone, enforced by the database). The same ID *document number* on a second account is flagged for admin to approve or reject. A dedicated resolution process is planned for Phase 1–2. | Not required for MVP. |
| 2026-10-27 | **Withdrawing frees a slot** under the 30-applicant cap. | The cap is about posters' review load. |
| 2026-10-27 | **ID hash** is computed on the server with a secret salt (`ID_HASH_SALT`); `submit_verification` is callable only with the server key. | The salt never reaches the browser. |
| 2026-10-27 | **Wallet balance in its own table** (`provider_wallets`), not on the profile. | Profiles are public; balances are private. |
| 2026-10-27 | **Post-on-behalf claims** (phone + token) in a separate admin-only table `job_claims`. | Keeps the claimant's phone off the public jobs table. |
| 2026-10-27 | **Contact reveal** via `get_contact()`: after Contact or hire (Flow A), or approval (Flow B). | PRD 5.10 / 5.11. |
| 2026-10-27 | **Early feedback** is allowed before the +3-day request; the timer then records it as complete. | No reason to refuse a willing reviewer. |
| 2026-10-27 | **Heebo font self-hosted** from npm (`@fontsource-variable/heebo`). | No build-time dependency on Google Fonts. |
| 2026-10-27 | **Next.js 16** (`proxy.ts` replaces `middleware.ts`); pinned to a patched release. | 15.5.x had critical advisories. |
