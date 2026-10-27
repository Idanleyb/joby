# Decisions log

Decisions made while building, beyond what the PRD states. Add new entries at the top.

| Date | Decision | Why |
|---|---|---|
| 2026-10-27 | **Form 3010 is submitted at wizard step 1**, not at the end of the wizard. | Review starts while the provider finishes the profile; faster approval. The profile is still hidden until approved. |
| 2026-10-27 | **AI reading is optional at runtime**: without `ANTHROPIC_API_KEY` (or if reading fails) the provider types the total days and the reviewer checks the documents. | The product keeps working if the AI is down. |
| 2026-10-27 | **Claude reads documents through a forced tool call** with a fixed schema; output is normalized and treated as untrusted. DOCX CVs are converted to text (mammoth) since the API does not read .docx. | Predictable structure; resistant to text inside documents. |
| 2026-10-27 | **The AI summary is signed (HMAC)** between "read" and "confirm", so the browser cannot change the counted days. The ID number never leaves the server; only its salted hash is stored. | Integrity and privacy. |
| 2026-10-27 | **Verification documents are deleted immediately** after approve/reject (PRD allowed up to 24h). Uploads removed before submitting can be deleted by the user. Uploads abandoned without submitting are not yet cleaned up automatically — a cleanup job is a later item. | Data minimization. |
| 2026-10-27 | **CV autofill fills only empty fields** unless the provider ticks "replace". | Never overwrite what the provider wrote. |
| 2026-10-27 | **Spouse invite is shared by the reservist** (WhatsApp button / copy link) until the WhatsApp notification worker exists. | Works today without the WhatsApp API. |
| 2026-10-27 | **A spouse who ticked "offer services" before opening the invite** has the draft reservist profile converted to a spouse profile (if no verification was submitted). | Avoids a dead end in sign-up. |
| 2026-10-27 | **Forms submit without React's automatic reset** (`submitWith`). | The reset could wipe text typed right after a validation error. |
| 2026-10-27 | **Google user whose phone already has an account** is told to sign in with that phone instead; accounts are not merged automatically. Linking Google to an existing phone account is a later item. | Automatic merging needs identity linking; not needed for the beta. PRD 5.1 deviation. |
| 2026-10-27 | **Private posters are shown as "First L."**; organizations by their name. No separate display-name field. | Privacy, and one field fewer. |
| 2026-10-27 | **Phone codes via Twilio Verify** (recommended in README). | Handles sender IDs and delivery to Israel without managing our own sender. |
| 2026-10-27 | **Forms keep what the user typed after a validation error** (server action echoes values). | React resets forms after an action; losing input is bad UX. |
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
