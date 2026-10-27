# Architecture

## Principle: the rules live in the database

Every business rule from the PRD that involves money (credits), trust (verification, feedback) or fairness (budget rule, caps, timers) is enforced **inside Postgres**, in security-definer functions that the app calls as RPCs. The web app only displays data and calls those functions.

Why: one place for the rules, impossible to bypass from the browser, testable without a UI (`npm run test:db`), and any future client (admin tool, mobile app) gets identical behavior.

```
Browser ──(publishable key + user session)──▶ Supabase API ──▶ Postgres
   │                                                        ├─ RLS policies: who can READ what
   │                                                        ├─ public.* RPC functions: every WRITE with a rule
   │                                                        └─ private.* internals: credits ledger, notify, audit, timers
   └─ Next.js server (Vercel) ──(secret key, server only)──▶ verification intake, workers
pg_cron (every 10 min) ──▶ private.run_timers()
```

## Schemas

| Schema | Exposed to API? | Contents |
|---|---|---|
| `public` | yes | Tables (read via RLS) and RPC functions (writes) |
| `private` | **no** | `apply_credit` (ledger), `notify` (outbox), `audit`, `run_timers`, guards |
| `auth`, `storage` | Supabase-managed | Users, files |

## Migrations (in order)

| File | What it adds | PRD |
|---|---|---|
| `0100_foundation` | enums, `app_settings` (every rule number), profiles, admins, audit log, categories | §6, §7, 5.1 |
| `0200_people_credits` | notification outbox, poster & provider profiles, wallets + ledger, Form 3010 / spouse verification, spouse links | 5.2–5.7, 5.13 |
| `0300_marketplace` | jobs + budget rule, applications (Flow A), direct requests (Flow B), engagements, hiring, extra hires, contact reveal, blocks | 5.8–5.12 |
| `0400_feedback` | feedback requests, blind reviews, ratings, `public_reviews` view | 5.14 |
| `0500_trust_admin` | reports (3 reports hide a job), suspensions, category suggestions, settings editor | 5.15, 5.17, 5.18 |
| `0600_timers` | `private.run_timers()` + pg_cron schedule | §7 |
| `0700_security` | RLS on every table, column-level update grants, function privileges | §11 |
| `0800_storage` | buckets and file policies (avatars, verification docs, CVs, attachments) | 5.3, 5.4 |

## Key RPC functions

| Area | Functions |
|---|---|
| Onboarding | `complete_signup`, `start_provider_onboarding`, `upsert_poster_profile` |
| Verification | `submit_verification` (server only), `decide_verification` (admin), `mark_documents_deleted` (server only) |
| Spouse | `invite_spouse`, `cancel_spouse_invite`, `accept_spouse_invite`, `admin_set_spouse_eligibility` |
| Jobs | `create_job`, `extend_job`, `close_job`, `claim_job`, `admin_post_job`, `admin_remove_job`, `admin_release_job` |
| Flow A | `apply_to_job`, `mark_application_viewed`, `shortlist_application`, `contact_applicant`, `decline_application`, `withdraw_application`, `hire_application`, `request_extra_hire`, `decide_extra_hire` |
| Flow B | `send_direct_request`, `respond_direct_request` |
| Contact | `get_contact(other_user)` — returns phone/email only after Contact, hire or an approved request |
| Feedback | `submit_feedback`, `admin_hide_review_comment` |
| Trust | `report_content`, `resolve_report`, `block_user`, `unblock_user`, `admin_set_account_status` |
| Admin | `admin_adjust_credits`, `admin_update_setting`, `admin_cancel_engagement` |

Errors are raised as stable codes (e.g. `insufficient_credits`); `src/lib/errors.ts` maps them to Hebrew.

## Credits

- Balance in `provider_wallets` (not on the public profile); every change is a row in the append-only `credit_transactions`.
- `private.apply_credit` locks the wallet row, so two simultaneous applications can never overspend.
- A unique index stops the same application being charged or refunded twice; timers are safe to re-run.
- The test suite checks that every wallet equals the sum of its ledger.

## Timers (`private.run_timers`, every 10 minutes)

1. Expire jobs past `expires_at` → refund applications in play.
2. "Job expires in 2 days" notice.
3. Refund applications never opened after 30 days.
4. Expire unanswered direct requests after 7 days.
5. Create feedback requests 3 days after an engagement.
6. Reminders at +7 and +14 days (the second warns of the block).
7. Block at +30 days (lifted on submission).
8. Reveal one-sided reviews 14 days after submission.
9. Expire spouse invites.

## Notifications

The database only writes rows to `public.notifications` (the outbox). A worker (later step) reads queued rows, applies quiet hours, and sends WhatsApp templates / email. In-app notifications are the same rows (`in_app = true`).

## Files

Uploads go to `<bucket>/<user_id>/<file>`. Verification documents are private to the owner and admins, and are deleted by the server after the admin decision (`decide_verification` returns the paths; `mark_documents_deleted` records it).

## What is not built yet

UI screens, the verification intake route (AI extraction + ID hash), the notification worker, payments (P1). See the build plan in the project chat.
