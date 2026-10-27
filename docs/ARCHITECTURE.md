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
| `0900_spouse_accept_draft` | spouse invite accepted after a draft provider profile; invite lookup; deleting unsubmitted uploads | 5.6 |
| `1000_unlimited_subcategories` | `max_subcategories` = 0 means unlimited | 5.2 (v1.3) |
| `1100_job_saves` | saved jobs (owner-only) | 5.9 |
| `1200_profiles_search` | `il_cities` + `distance_km`, distance matching (`my_matching_jobs`, `jobs_near`), job alerts, "application viewed" notice, `search_providers`, availability + gallery, poster "about", `portfolio` bucket | 5.5, 5.7, 5.9, 5.19, 5.20 |

## Key RPC functions

| Area | Functions |
|---|---|
| Onboarding | `complete_signup`, `start_provider_onboarding`, `upsert_poster_profile` |
| Verification | `submit_verification` (server only), `decide_verification` (admin), `mark_documents_deleted` (server only) |
| Spouse | `invite_spouse`, `cancel_spouse_invite`, `accept_spouse_invite`, `admin_set_spouse_eligibility` |
| Jobs | `create_job`, `extend_job`, `close_job`, `claim_job`, `admin_post_job`, `admin_remove_job`, `admin_release_job` |
| Flow A | `apply_to_job`, `mark_application_viewed`, `shortlist_application`, `contact_applicant`, `decline_application`, `withdraw_application`, `hire_application`, `request_extra_hire`, `decide_extra_hire` |
| Flow B | `send_direct_request`, `respond_direct_request` |
| Search & matching | `my_matching_jobs`, `jobs_near(city, radius)`, `search_providers(...)`, `distance_km(a, b)` |
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

1. Expire jobs past `expires_at` (30 days, or 60 with the poster's extension) → refund every application except withdrawn ones.
2. "Job expires in 2 days" notice.
3. Refund applications never opened after 30 days, only while the job is still open.
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

## App structure (src/app)

| Route | What |
|---|---|
| `/login`, `/auth/callback`, `/onboarding/*` | Sign-in (phone code, Google), phone step, welcome (roles, terms), poster details |
| `/provider/onboarding/{proof,cv,categories,area,about,services,photo}` | Provider wizard (PRD 5.2–5.5) |
| `/providers/[id]` | Public provider profile (approved only, via RLS) |
| `/invite/[token]` | Spouse invite landing (PRD 5.6) |
| `/account` | Roles, wizard progress, credits, spouse invite |
| `/home` | Dashboard for the current role (PRD 5.19) |
| `/notifications` | In-app notifications, mark read (PRD 5.19) |
| `/profile`, `/profile/edit` | Own profile: provider (strength, availability, gallery, edit links) or poster (view + edit) |
| `/posters/[id]` | Public poster profile (PRD 5.7) |
| `/providers` | Provider search: category, area, available now; sort rating / distance / price / A–Z (PRD 5.20) |
| `/proposals` | Provider's applications in tabs: active, hired, closed |
| `/jobs` | Opportunities: Matches / Newest / Saved; category, subcategory, area + radius, remote, budget stated; sort (PRD 5.9) |
| `/jobs/new` | Post a job: budget rule on screen, attachments, preview, publish (PRD 5.8) |
| `/jobs/[id]` | Job page with poster trust signals and the apply form (10 credits, balance after) |
| `/poster/jobs`, `/poster/jobs/[id]` | Poster's jobs (status, new applicants, days left, extend once, close) and applicant list |
| `/poster/jobs/[id]/applications/[appId]` | Application detail: marks opened, shortlist, contact (phone + WhatsApp), decline, hire, extra-hire request (PRD 5.10–5.12) |
| `/provider/credits` | Credit ledger |
| `/admin`, `/admin/verifications[/id]` | Admin dashboard and verification queue (PRD 5.18) |
| `/admin/jobs`, `/admin/extra-hires` | Held jobs (release / remove) and extra-hire requests (approve / decline) |

## Navigation

`AppNav` (sidebar on computers, bottom bar on phones) and the header's `RoleSwitch` are in the root layout. The menu depends on the mode cookie `joby_mode` ("work" / "hire", `src/lib/mode.ts`). Layouts are not re-rendered on client navigation, so sign-in does a full page load, onboarding actions call `revalidatePath("/", "layout")`, and the bell count is refetched on each page change.

## AI document reading (src/lib/ai)

`client.ts` sends a PDF / image (or DOCX converted to text) with a forced tool call; `form3010.ts` and `cv.ts` define the schemas and clean the output. `reserve-days.ts` merges periods and counts days from 7 Oct 2023. Files go browser → Supabase Storage directly; the server downloads them with the service key only to read them.

## What is not built yet

Direct requests (Flow B) and feedback screens; the notification worker (WhatsApp/email); reports UI; cleanup of abandoned uploads; payments (P1).
