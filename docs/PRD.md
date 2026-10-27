**PRODUCT REQUIREMENTS DOCUMENT · v1.3**

**Joby — MVP**

The Miluim Marketplace

*Closed beta and public launch scope for a verified, reservist-only
supply marketplace where anyone can hire.*

|              |                                                                            |
|--------------|----------------------------------------------------------------------------|
| **Product**  | Joby (working name) — the Miluim Marketplace                               |
| **Document** | PRD for the MVP: closed beta (January 2027) and public launch (March 2027) |
| **Owner**    | Idan Leibovitch, Founder & Product                                         |
| **Date**     | October 25, 2026                                                           |
| **Status**   | v1.3 — unlimited categories per provider (October 27, 2026) · in build     |
| **Related**  | Joby Business Plan v1.0 (October 22, 2026)                                 |

<table>
<colgroup>
<col style="width: 24%" />
<col style="width: 24%" />
<col style="width: 24%" />
<col style="width: 25%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>30 days</strong></p>
<p>minimum reserve service since Oct 7, 2023</p></td>
<td><p><strong>10 credits</strong></p>
<p>to apply to a job</p></td>
<td><p><strong>2 credits</strong></p>
<p>per approved direct request</p></td>
<td><p><strong>Jan 11, 2027</strong></p>
<p>closed beta opens</p></td>
</tr>
</tbody>
</table>

**CONTENTS**

1\. Overview

2\. Scope

3\. Users & Roles

4\. Decision Log

5\. Functional Requirements

6\. Category Taxonomy

7\. Business Rules & Timers

8\. Notifications Matrix

9\. Data Model

10\. Screens & Information Architecture

11\. Non-Functional Requirements

12\. Analytics & KPIs

13\. Technology & Integrations

14\. Release Plan

15\. Edge Cases

16\. Resolved Questions & Remaining Items

# 1 Overview

## 1.1 Purpose of this document

This PRD specifies the Joby MVP and is the single source of truth for
design, development and QA. Every rule in it was approved by the founder
on October 25, 2026. Changes go through the decision log (section 4),
not through side conversations.

## 1.2 Problem

Since October 7, 2023, reservists have served months of duty.
Self-employed reservists, freelancers and their spouses lost clients,
projects and income. There is strong public will to "hire reservists",
but it is scattered across WhatsApp forwards, Facebook posts and static
directories. Nobody owns the transaction: a verified provider, a real
job, a match, and a rating that compounds over time.

## 1.3 The product in one paragraph

Joby is a two-sided marketplace. On the supply side, only **verified
reservists** (30+ cumulative days of reserve duty since October 7, 2023,
proven by Form 3010) and their **approved spouses** can offer services.
On the demand side, **anyone** can post a job or approach a provider
directly, from a homeowner who needs a plumber to an HR manager hiring a
developer. Providers spend **credits** to apply (10) or to accept a
direct request (2). Posting is free. After every engagement, **both
sides rate each other**, building reputations and the data for better
matching later.

## 1.4 MVP hypothesis

> **Hypothesis** If verified reservists see real, relevant jobs in their
> category and area, they will spend credits to apply; posters will hire
> them; and both sides will rate each other after the work.

The beta must prove three things: **liquidity** (enough real jobs per
provider), **willingness to spend credits** (applications per active
provider), and a working **hire-and-feedback loop**.

## 1.5 Beta success metrics

| **Metric**                | **Definition**                                                                                                                    | **Target by Feb 28, 2027**     |
|---------------------------|-----------------------------------------------------------------------------------------------------------------------------------|--------------------------------|
| **Active users**          | Providers: verified and applied or accepted a request in the last 30 days. Posters: posted or sent a request in the last 60 days. | 120                            |
| **Verification time**     | Median hours from 3010 submission to admin decision                                                                               | \< 24 hours                    |
| **Application open rate** | % of applications opened by the poster within 7 days                                                                              | ≥ 70%                          |
| **Liquidity**             | Open jobs per 100 active providers, per category                                                                                  | ≥ 15                           |
| **Fill rate**             | % of closed jobs that ended with a hire                                                                                           | ≥ 25% (beta), ≥ 35% by Q3 2027 |
| **Feedback completion**   | % of engagements where both sides submitted feedback                                                                              | ≥ 60%                          |
| **Onboarding completion** | % of provider sign-ups that submit a full profile for verification                                                                | ≥ 60%                          |
| **CV autofill quality**   | % of AI-filled fields kept without edits                                                                                          | ≥ 70%                          |

# 2 Scope

## 2.1 Design references: Upwork and Fiverr

Joby borrows the patterns that make Upwork and Fiverr easy to use, and
leaves out their heavy machinery (escrow, contracts, milestones). Upwork
is the reference for the job-board side (Flow A). Fiverr is the
reference for browsing providers (Flow B).

| **Pattern**                                   | **Source**               | **How Joby uses it**                                            |
|-----------------------------------------------|--------------------------|-----------------------------------------------------------------|
| **Step-by-step wizards with a progress bar**  | Upwork                   | Provider onboarding and job posting: one question per screen    |
| **Profile-strength meter**                    | Upwork                   | Shown during onboarding and on the provider dashboard           |
| **Resume-based onboarding**                   | Upwork                   | CV upload with AI autofill; manual fill always available        |
| **Credit cost shown before applying**         | Upwork (Connects)        | "Apply · 10 credits" button and balance-after on confirmation   |
| **Poster trust signals on the job**           | Upwork                   | Phone verified, jobs posted, hire rate, poster rating           |
| **Applicant count as a range**                | Upwork                   | 0–4 · 5–9 · 10–19 · 20+ on every job card                       |
| **Job feed tabs**                             | Upwork                   | Matches · Newest · Saved                                        |
| **Category-first browsing with visual cards** | Fiverr                   | Browse providers: photo, headline, rating, area, starting price |
| **Productized services**                      | Fiverr (simplified gigs) | Up to 3 service cards per provider with a "starting from" price |
| **Two-way blind reviews**                     | Upwork, Airbnb           | Mandatory feedback after every engagement, revealed together    |

## 2.2 In scope

- Sign-up with phone OTP or Google (with phone verification)

- Provider onboarding wizard with Form 3010 verification and CV autofill

- Spouse linking with manual admin approval

- Provider profiles, badges and service cards

- Job posting with category-dependent budget rules

- Job feed and search; browse and search providers

- Flow A: apply to a job (10 credits) · Flow B: direct request (2
  credits on approval)

- Credits wallet with welcome credits, admin grants and automatic
  credit-back

- Mandatory two-way feedback after every engagement

- Ten launch categories and "Suggest a category"

- WhatsApp and email for notifications and support

- Reporting, moderation and an admin console with queues, tools and a
  KPI dashboard

- Credit purchases (public launch, not beta)

## 2.3 Out of scope

| **Feature**                                       | **Why not now**                                                                                                           | **Earliest**                     |
|---------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------|----------------------------------|
| **In-app chat**                                   | Contact details are revealed; parties continue on WhatsApp or phone                                                       | Phase 4                          |
| **Payments between users, escrow**                | Joby does not handle money between parties in year 1                                                                      | Year 2                           |
| **Contracts, milestones, user-to-user invoicing** | Adds weight without testing the hypothesis                                                                                | Not planned                      |
| **AI matching and recommendations**               | Needs feedback data collected by the MVP first                                                                            | Phase 4                          |
| **Featured posts, boost, employer packages**      | No poster monetization in year 1                                                                                          | Phase 4 pilot                    |
| **Referral credits and earn-credits loop**        | Growth lever, not needed to validate                                                                                      | Phase 3                          |
| **SEO category × city landing pages**             | Comes after public launch                                                                                                 | Phase 3                          |
| **Native iOS and Android apps**                   | Responsive web covers traffic from WhatsApp links                                                                         | Later                            |
| **License verification (medical, legal)**         | Self-declared license number in the MVP                                                                                   | Later                            |
| **Company accounts with multiple seats**          | Single-user posters are enough for beta                                                                                   | Later                            |
| **English and Arabic interface**                  | Hebrew only at launch; strings built for translation                                                                      | Later                            |
| **"On reserve duty" status**                      | Removed from the MVP by the founder (v1.1)                                                                                | Later                            |
| **Duplicate-identity resolution workflow**        | MVP flags the request in the verification queue and admin approves or rejects; a dedicated end-to-end process comes later | Phase 1–2 (not required for MVP) |

# 3 Users & Roles

## 3.1 Roles

| **Role**                 | **Who**                                                                  | **Can do**                                                              | **Verification**                                             |
|--------------------------|--------------------------------------------------------------------------|-------------------------------------------------------------------------|--------------------------------------------------------------|
| **Provider — reservist** | Served at least 30 cumulative days of reserve duty since October 7, 2023 | Build a profile, apply to jobs, receive direct requests, rate posters   | Form 3010 upload + admin review                              |
| **Provider — spouse**    | Spouse of a verified reservist                                           | Same as a reservist provider                                            | Invite from the reservist + proof of marriage + admin review |
| **Poster**               | Anyone: individuals, businesses, HR teams, municipalities, non-profits   | Post jobs, browse providers, send direct requests, hire, rate providers | Verified phone number only                                   |
| **Admin / Ops**          | Joby team                                                                | Review queues, moderate, adjust credits, post jobs on a poster's behalf | Internal account with mandatory 2FA                          |

## 3.2 Personas

| **Persona**                                          | **Situation**                                                        | **What they need from Joby**                                    |
|------------------------------------------------------|----------------------------------------------------------------------|-----------------------------------------------------------------|
| **Yossi, 34 — electrician, Rishon LeZion**           | Self-employed; served 180+ days; lost regular clients while away     | Local jobs quickly, on his phone, with a badge that earns trust |
| **Noa, 31 — freelance designer, reservist's spouse** | Carried the household during her partner's service; projects stalled | Remote work with flexible timing and her own reputation         |
| **Dana — HR manager, 200-person tech company**       | Wants to hire reservist talent and show visible support              | A verified talent pool and free posting                         |
| **Avi — homeowner**                                  | Needs a plumber this week; wants to support reservists               | A quick post, fast responses, clear ratings                     |

## 3.3 One account, two roles

A single account can hold both roles: a reservist plumber may also hire
a designer. The role switcher sits in the main menu. Poster capabilities
need only a verified phone. Provider capabilities need provider
verification.

# 4 Decision Log

Approved by the founder on October 25, 2026.

| **\#** | **Decision**        | **Approved value**                                                                                                                                                                                                                                       |
|--------|---------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 1      | Eligibility         | 30+ cumulative reserve days on or after October 7, 2023, proven by one cumulative Form 3010 or several per-period forms                                                                                                                                  |
| 2      | Sign-up             | Phone OTP or Google account; Google users must verify a phone number                                                                                                                                                                                     |
| 3      | Welcome credits     | 100 credits on approval (equal to 10 applications), for reservists and spouses                                                                                                                                                                           |
| 4      | Apply cost          | 10 credits, paid by the provider when the application is sent                                                                                                                                                                                            |
| 5      | Direct request cost | 2 credits, paid by the provider, charged only when the provider approves a poster's direct request                                                                                                                                                       |
| 6      | Posting             | Free for all posters                                                                                                                                                                                                                                     |
| 7      | Credit-back         | Unopened for 30 days while the job is still open → refunded. Job ends with a hire → no refund, even for unopened applications. Job closes, expires (after up to 60 days) or is removed without a hire → every application refunded except withdrawn ones |
| 8      | Credit purchases    | Ship at public launch (March 2027). The beta runs on welcome credits plus admin grants                                                                                                                                                                   |
| 9      | Budget              | Mandatory for Programming & Tech, Digital Marketing, Business, Finance and Lawyers, and for any remote job. Optional elsewhere ("Open to quotes")                                                                                                        |
| 10     | Feedback            | Mandatory two-way feedback after every hire and every approved direct request; reminders after 7 and 14 days (the third warns of a block); account blocked after 30 days; blind reveal                                                                   |
| 11     | Spouse              | Added by a verified reservist; proof of marriage or common-law partnership; manual admin approval. Admin decides manually on the spouse's eligibility if the reservist account changes                                                                   |
| 12     | CV                  | Upload with AI autofill; manual fill always available                                                                                                                                                                                                    |
| 13     | Categories          | Ten launch categories (section 6) plus "Missing your occupation? Tell us"                                                                                                                                                                                |
| 14     | Beta coverage       | Nationwide for on-site work, and remote work nationally                                                                                                                                                                                                  |
| 15     | Channels            | WhatsApp and email for notifications and support                                                                                                                                                                                                         |
| 16     | Platform            | Responsive web app, Hebrew, right-to-left, mobile-first                                                                                                                                                                                                  |

## 4.1 Changes in v1.3 (October 27, 2026)

| **Change**                  | **Detail**                                                                                                                                                      |
|-----------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Categories per provider** | Unlimited (was up to 3). Providers choose every subcategory they work in; job alerts match on all of them. Skills stay at up to 15 and service cards at up to 3 |

## 4.2 Changes in v1.2 (October 27, 2026)

| **Change**       | **Detail**                                                                                                                                                                                           |
|------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Job lifetime** | Open 30 days; the poster can approve one extension of 30 more days (60 days maximum)                                                                                                                 |
| **Refunds**      | No refund for unopened applications when the job ends with a hire. Without a hire (closed, expired after up to 60 days, or removed), all applications are refunded except withdrawn ones             |
| **Duplicate ID** | Accounts are unique by user and phone (enforced by the database). The same ID number on a second account goes to admin to approve or reject; a dedicated resolution process is planned for Phase 1–2 |

## 4.3 Changes in v1.1

| **Change**               | **Detail**                                                                                                        |
|--------------------------|-------------------------------------------------------------------------------------------------------------------|
| **Removed**              | "On reserve duty" status, its badge, notification and settings                                                    |
| **Feedback enforcement** | Request at engagement + 3 days; reminders after 7 and 14 days (the third warns of the block); block after 30 days |
| **Spouses**              | Common-law partners accepted; admin decides manually if the reservist account changes                             |
| **Extra hires**          | Poster can request another hire on the same job; admin decides; both sides notified                               |
| **Confirmed**            | Project management under Business; salted ID hash stored; no refund on withdrawal; WhatsApp Business account      |

# 5 Functional Requirements

Priorities: **P0** is required for the closed beta, **P1** is required
for public launch, **P2** is nice to have.

## 5.1 Sign-up and sign-in (AUTH)

| **ID**     | **User story**                                                                                               | **Priority** |
|------------|--------------------------------------------------------------------------------------------------------------|--------------|
| **AUTH-1** | As a visitor, I want to sign up with my phone number and a one-time code, so I can start without a password. | P0           |
| **AUTH-2** | As a visitor, I want to sign up with my Google account.                                                      | P0           |
| **AUTH-3** | As a Google user, I verify my phone number before continuing, so Joby can reach me on WhatsApp.              | P0           |
| **AUTH-4** | As a new user, I choose "I offer services" or "I want to hire", and I can add the other role later.          | P0           |

**RULES**

- OTP is 6 digits, valid for 5 minutes, maximum 5 attempts; resend
  allowed after 30 seconds; maximum 5 codes per number per hour.

- Israeli mobile numbers only at launch (+972 5X).

- One phone number equals one account. If a Google sign-up uses a phone
  that already exists, the user signs in to that account and Google is
  linked to it.

- Terms and privacy policy are accepted at sign-up. Marketing messages
  on WhatsApp or email need a separate, unticked opt-in; service
  messages do not.

- Sessions last 30 days per device; "Sign out of all devices" is
  available in settings.

**ACCEPTANCE CRITERIA**

- A user completes phone sign-up in under 60 seconds on a mobile device.

- A Google user without a verified phone cannot reach any role screen.

- Entering an existing number signs the user in; no duplicate account is
  created.

## 5.2 Provider onboarding wizard (ONB)

Upwork-style wizard: one topic per screen, progress bar, saved after
every step, resumable from any device.

| **Step** | **Screen**       | **Required** | **Content**                                                                                               |
|----------|------------------|--------------|-----------------------------------------------------------------------------------------------------------|
| **1**    | Proof of service | Yes          | Form 3010 upload (section 5.3). Spouses see the proof-of-marriage step instead (section 5.6)              |
| **2**    | Your CV          | No           | Upload a CV for AI autofill (section 5.4), or "Fill manually instead"                                     |
| **3**    | What you do      | Yes          | One or more subcategories (no limit) and up to 15 skills; "Missing your occupation? Tell us"              |
| **4**    | Where you work   | Yes          | On-site (city + radius: 10 / 25 / 50 km / nationwide) and/or remote                                       |
| **5**    | About you        | Yes          | Headline (≤ 70 chars), bio (≤ 1,000), years of experience. Optional: portfolio links (up to 5), languages |
| **6**    | Your services    | No           | Up to 3 service cards (section 5.5)                                                                       |
| **7**    | Photo & preview  | No           | Profile photo, profile-strength meter, preview, Submit                                                    |

**RULES**

- After submission the profile is "Pending verification": the provider
  can browse jobs and finish the profile, but cannot apply, receive
  requests, or appear in search.

- Profile-strength weights: verification 25, headline and bio 20,
  categories and skills 15, photo 10, CV 10, services 10, portfolio 10.

- Name fields are locked after verification; changes go through support.

**ACCEPTANCE CRITERIA**

- Closing the browser at any step and returning resumes at the same step
  with data intact.

- With CV autofill, a provider completes all required steps in under 7
  minutes in usability tests.

## 5.3 Reservist verification — Form 3010 (VER)

Form 3010 is the IDF confirmation of completed reserve service. Each
call-up usually produces its own form; reservists can also generate a
confirmation, including a cumulative one for a period, from the personal
area of the reserves website. Joby accepts both.

| **Step** | **Actor**   | **What happens**                                                                                                                                                        |
|----------|-------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **1**    | Provider    | Uploads one cumulative 3010 or several per-period forms (PDF, JPG or PNG; ≤ 10 MB each; up to 15 files).                                                                |
| **2**    | System (AI) | Reads each file: full name, ID number (for matching only), service dates and days. Flags unreadable files or files that are not a 3010.                                 |
| **3**    | System      | Counts only days on or after October 7, 2023. Overlapping periods across forms are counted once.                                                                        |
| **4**    | Provider    | Sees "We counted 112 days across 4 forms", then confirms, or flags a mistake with a note.                                                                               |
| **5**    | Admin       | Reviews in the verification queue: documents side by side with extracted data; checks the name matches the account, the document looks authentic, and the total is 30+. |
| **6**    | Admin       | Decides: Approve, Reject (with a reason), or Request more information.                                                                                                  |
| **7**    | System      | Stores the result, deletes documents and raw extracted data within 24 hours, grants 100 welcome credits on approval, and notifies the provider on WhatsApp and email.   |

**RULES**

- Eligibility threshold: 30 cumulative days on or after October 7, 2023.
  Days before that date never count, even when a form spans it.

- Stored after the decision: status, decision date, reviewer, days band
  (30–59 / 60–119 / 120+), and a salted hash of the ID number. Nothing
  else is kept.

- Duplicates: a user account can never be duplicated (unique user and
  phone number, enforced by the database). If the same ID number appears
  on a second account, the request enters the queue flagged "Possible
  duplicate identity" and admin approves or rejects it. A dedicated
  resolution process is planned for Phase 1–2.

- The provider may choose to show the days band on the profile ("Served
  120+ days"). Default: off.

- Rejection reasons: unreadable, name mismatch, under 30 days, not a
  3010, suspected tampering, other. Resubmission is unlimited; a second
  "suspected tampering" rejection suspends the account for review.

- SLA: decision within 24 hours. Items older than 20 hours are
  highlighted in the queue.

- No re-verification is required in the MVP.

**ACCEPTANCE CRITERIA**

- AI prefills days for at least 90% of readable 3010 documents.

- After a decision, document files return "not found" from storage and
  are absent from backups older than the retention window.

- A second account producing the same ID hash is blocked from submission
  and routed to admin.

## 5.4 CV upload and AI autofill (CV)

| **ID**   | **User story**                                                                               | **Priority** |
|----------|----------------------------------------------------------------------------------------------|--------------|
| **CV-1** | As a provider, I upload my CV and Joby fills my profile for me, so onboarding takes minutes. | P0           |
| **CV-2** | As a provider without a CV, I fill my profile manually without being blocked.                | P0           |
| **CV-3** | As a provider, I control whether posters can download my CV.                                 | P0           |

**RULES**

- Formats: PDF or DOCX, ≤ 5 MB, Hebrew or English.

- AI extracts: headline suggestion, bio draft, skills (mapped to the
  skills list, plus free text), top 3 suggested subcategories, work
  experience (title, company, dates), education, languages, years of
  experience.

- "Here's what we found" review screen: every field prefilled, editable
  and tagged "AI suggested". Nothing is saved to the profile until the
  provider taps Confirm.

- "Fill manually instead" is visible on step 2 and on the review screen.

- The CV file stays on the profile. "Let posters download my CV"
  defaults to on and can be switched off. The file can be replaced or
  deleted at any time.

- Uploading a new CV later fills only empty fields, unless the provider
  chooses "Replace my profile details".

- CVs are processed by the AI provider under zero-retention terms and
  never used for training.

**ACCEPTANCE CRITERIA**

- Autofill results appear in under 20 seconds for 90% of files.

- A failed extraction shows a friendly message and the manual path; no
  partial data is saved.

- Confirmed manual edits are never overwritten silently.

## 5.5 Provider profile, badges and service cards (PRO)

The public profile shows: photo, first name and last initial, badges,
headline, area or remote, subcategories, skills, bio, experience,
education, languages, portfolio links, service cards, rating and reviews
(after 3 reviews), member since, and typical response time to direct
requests. Full name, phone and email are hidden until contact is
revealed (sections 5.10 and 5.11).

| **Badge**                        | **Shown when**                          |
|----------------------------------|-----------------------------------------|
| **Verified reservist**           | Form 3010 approved                      |
| **Reservist's spouse**           | Spouse link approved                    |
| **New on Joby**                  | Fewer than 3 revealed reviews           |
| **Served 30+ / 60+ / 120+ days** | Provider opted in to show the days band |

**SERVICE CARDS (UP TO 3)**

Title (≤ 60 chars), subcategory, description (≤ 300), starting price in
₪ or "Quote on request", unit (per job / hour / day / project), and mode
(on-site / remote / both). Cards appear on the profile and on provider
cards in browse, and can be attached to an application.

## 5.6 Spouse linking (SPO)

| **Step** | **Actor** | **What happens**                                                                                                                                                                                                           |
|----------|-----------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **1**    | Reservist | Verified reservist opens Settings → "Add spouse" and enters the spouse's name and phone number.                                                                                                                            |
| **2**    | System    | Sends an invite on WhatsApp (SMS fallback), valid for 14 days. The reservist can cancel a pending invite.                                                                                                                  |
| **3**    | Spouse    | Opens the link and signs up (phone OTP or Google). The account is linked as "pending spouse".                                                                                                                              |
| **4**    | Spouse    | Uploads proof of partnership: marriage certificate, the ID appendix (sefach) listing the spouse, or, for common-law partners (yeduim batzibur), a notarized affidavit or an official document recognizing the partnership. |
| **5**    | Spouse    | Completes onboarding steps 2–7. No Form 3010 is needed.                                                                                                                                                                    |
| **6**    | Admin     | Reviews in the spouse queue: names on the document match both accounts, and the reservist is verified.                                                                                                                     |
| **7**    | System    | On approval: "Reservist's spouse" badge, 100 welcome credits, profile goes live, document deleted within 24 hours. Both partners are notified.                                                                             |

**RULES**

- One active spouse link per reservist. A spouse cannot invite further
  spouses.

- The spouse has a separate account, wallet, profile and reputation.

- If the reservist account is deleted, loses verification, or the link
  is removed through support, admin decides manually whether the spouse
  stays eligible. The spouse is notified of the decision.

- P1: a spouse can start from "Invite your reservist partner" when the
  reservist is not yet on Joby. The spouse's approval waits for the
  reservist's verification.

## 5.7 Poster onboarding (POS)

One screen after phone verification: name, poster type (private person /
business / HR or recruiter / public body or non-profit), company name
(businesses), city. Optional: logo and website. No document
verification.

Poster trust signals are computed automatically and shown on every job
and direct request: **phone verified**, **member since**, **jobs
posted**, **hire rate** (hires ÷ closed jobs) and **poster rating**
(after 3 reviews).

## 5.8 Job posting (JOB)

| **Step** | **Screen**  | **Content**                                                                                              |
|----------|-------------|----------------------------------------------------------------------------------------------------------|
| **1**    | Category    | Category and subcategory; "Missing a category? Tell us"                                                  |
| **2**    | The job     | Title (≤ 80 chars), description (50–3,000 chars), up to 5 required skills                                |
| **3**    | Where       | On-site (city or area), Remote, or Both                                                                  |
| **4**    | Budget      | Fixed range or hourly range in ₪ (min ≤ max, min ≥ ₪50), or "Open to quotes" where allowed (table below) |
| **5**    | Timeline    | ASAP / within a week / within a month / flexible; optional start date                                    |
| **6**    | Attachments | Up to 3 images or PDFs (optional)                                                                        |
| **7**    | Preview     | Preview as providers will see it, then Publish                                                           |

**BUDGET RULE**

| **Condition**                                                                       | **Budget field**                                              |
|-------------------------------------------------------------------------------------|---------------------------------------------------------------|
| **Category is Programming & Tech, Digital Marketing, Business, Finance or Lawyers** | Mandatory                                                     |
| **Work mode is Remote or Both, in any category**                                    | Mandatory                                                     |
| **Any other case: Design, Music & Audio, Consulting, Household or Others, on-site** | Optional — "Open to quotes" allowed and shown on the job card |

**RULES**

- Lifecycle: Open (30 days) → one optional extension of 30 days,
  approved by the poster (60 days maximum) → Expired. Other end states:
  Hired, Closed without hire, Removed by admin. The "expires in 2 days"
  notice offers the extension.

- Category and budget are locked after the first application; the
  description can still be edited.

- Applicant cap: 30 applications per job, after which the job shows "Not
  accepting applications".

- Limits: maximum 10 open jobs per poster.

- Prohibited jobs: illegal services, adult content, weapons, multi-level
  marketing, unpaid work, jobs that charge the provider, and
  discriminatory requirements. An automatic keyword check holds
  suspicious posts for moderation before they go live.

- Post on behalf: admin can publish a job for a poster with their
  consent (used to hand-seed the first 150 jobs). The poster receives a
  link to claim and manage the job.

## 5.9 Job discovery (FEED)

- Tabs: **Matches** (provider's subcategories plus area or remote),
  **Newest**, **Saved**.

- Filters: category, subcategory, area and radius, remote only, budget
  range, budget stated, posted within. Sort: newest, highest budget.

- Job card: title, subcategory, location or Remote, budget or "Open to
  quotes", posted time, applicant range (0–4 / 5–9 / 10–19 / 20+),
  poster trust signals, and the button "Apply · 10 credits".

- Logged-out visitors can browse jobs, which shows the marketplace is
  alive. Applying requires sign-up and verification.

## 5.10 Flow A — Provider applies to a job (APP)

| **ID**    | **User story**                                                                                                                   | **Priority** |
|-----------|----------------------------------------------------------------------------------------------------------------------------------|--------------|
| **APP-1** | As a verified provider, I apply with a short pitch and see the credit cost and my balance before I confirm.                      | P0           |
| **APP-2** | As a poster, I review applicants with their badges, rating, distance, pitch and price, then shortlist, contact, decline or hire. | P0           |
| **APP-3** | As a provider, I get my credits back automatically if my application is ignored or the job closes without a hire.                | P0           |

**APPLICATION FORM**

Pitch (50–1,000 chars), optional proposed price in ₪, optional
availability date, optional attached service card. Confirmation sheet:
"10 credits will be deducted. Balance after: X".

**APPLICATION STATES**

| **State**         | **Meaning**                                                                                                                              |
|-------------------|------------------------------------------------------------------------------------------------------------------------------------------|
| **Sent**          | Application submitted; 10 credits deducted                                                                                               |
| **Viewed**        | Poster opened the application detail (opening the list does not count). This is the event that stops the 30-day credit-back timer        |
| **Shortlisted**   | Poster shortlisted the applicant                                                                                                         |
| **Contacted**     | Poster tapped Contact: the provider's phone and email are revealed to the poster, and the provider is notified with the poster's details |
| **Hired**         | Poster marked this applicant as hired; an engagement is created (section 5.12)                                                           |
| **Not selected**  | Poster declined, or hired someone else                                                                                                   |
| **Credited back** | Credits refunded under the credit-back rule                                                                                              |
| **Withdrawn**     | Provider withdrew; no refund                                                                                                             |

**RULES**

- One application per provider per job. Requires verified status and at
  least 10 credits. No editing after sending.

- **Credit-back while the job is open:** refunded automatically if the
  poster has not opened the application 30 days after it was sent.

- **Job ends with a hire:** no refund, including applications the poster
  never opened.

- **Job ends without a hire** (Closed without hire, Expired after up to
  60 days, or Removed by admin): every application of that job is
  refunded, except withdrawn ones.

## 5.11 Flow B — Poster approaches a provider directly (REQ)

| **Step** | **Actor** | **What happens**                                                                                                                                                              |
|----------|-----------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **1**    | Poster    | On a provider's profile, taps "Send request" and fills a brief: title, description (≤ 1,000), area or remote, budget (same rule as jobs), timeline. Can link an existing job. |
| **2**    | System    | Notifies the provider on WhatsApp and email with the brief and the poster's trust signals. Contact details stay hidden.                                                       |
| **3**    | Provider  | Approves or declines (optional reason).                                                                                                                                       |
| **4**    | System    | On approval: deducts 2 credits from the provider, reveals both sides' phone and email, and creates an engagement. On decline: notifies the poster; no charge.                 |

**RULES**

- Approval requires at least 2 credits. In beta, a provider without
  credits sees "Contact support for more credits"; after public launch,
  "Buy credits".

- A request expires after 7 days without a response, with no charge; the
  poster is notified.

- One open request per poster–provider pair; maximum 20 requests per
  poster per day.

## 5.12 Engagements and hiring (ENG)

An **engagement** is the record that two sides agreed to work together.
It is created when a poster marks an applicant as Hired (Flow A) or when
a provider approves a direct request (Flow B). Feedback (section 5.14)
attaches to the engagement.

- One hire per job by default. Hiring moves the job to Hired and
  notifies the other applicants "Not selected".

- Extra hires: the poster can tap "Hire another applicant" on a hired
  job. The request goes to the admin extra-hire queue; admin approves or
  declines, and the poster and the applicant are both notified on
  WhatsApp, email and in the app. An approved extra hire creates its own
  engagement and feedback cycle.

- A mistaken hire can be reversed through support within 48 hours; the
  engagement is cancelled and no feedback is requested.

## 5.13 Credits wallet (CRD)

| **Event**                        | **Credits** | **When**                                                           |
|----------------------------------|-------------|--------------------------------------------------------------------|
| **Welcome credits**              | +100        | On verification approval (reservist or spouse)                     |
| **Apply to a job**               | −10         | When the application is sent                                       |
| **Approve a direct request**     | −2          | When the provider approves                                         |
| **Credit-back**                  | +10         | Automatically, under the rule in section 5.10                      |
| **Admin grant or adjustment**    | ±           | With a mandatory reason; logged in the audit log                   |
| **Purchase (P1, public launch)** | \+ bundle   | After successful payment, with an automatic tax invoice or receipt |

**RULES**

- Wallet screen: balance plus a ledger (date, type, amount, reference,
  balance after).

- Credits do not expire, have no cash value and cannot be transferred.

- All deductions are atomic; the balance can never go negative.

- Low-balance nudge below 20 credits.

- Purchase bundles at public launch: 50 / 120 / 300 credits, around ₪1
  per credit with a bundle discount; final pricing decided before
  launch.

## 5.14 Two-way feedback and ratings (FBK)

Every engagement must end in feedback from both sides. The data builds
reputations now and powers matching later.

| **When**                | **What happens**                                                                                                                                                                                                          |
|-------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Engagement + 3 days** | Feedback request 1: both sides get it on WhatsApp, email and in the app                                                                                                                                                   |
| **First question**      | "Did you work together?" — Yes / Not yet / No                                                                                                                                                                             |
| **Yes**                 | Rating form (below)                                                                                                                                                                                                       |
| **Not yet**             | Keeps the reminder schedule running; the question is asked again in the next reminder. From reminder 3, only Yes / No                                                                                                     |
| **No**                  | Reason picker: the other side didn't respond / price / availability / not a fit / other. Stored for matching; not shown publicly and not counted in the score                                                             |
| **Request + 7 days**    | Reminder 2 on WhatsApp, email and in the app                                                                                                                                                                              |
| **Request + 14 days**   | Reminder 3 with a clear warning: "Leave your feedback by \[date\] or your account will be blocked." An in-app banner shows the countdown until feedback is submitted                                                      |
| **Request + 30 days**   | Account blocked: a provider cannot apply or approve requests; a poster cannot post jobs or send requests. Sign-in still works, and submitting the feedback lifts the block immediately. The user is notified of the block |
| **Reveal**              | Both reviews become visible when both are submitted, or 14 days after the first submission                                                                                                                                |

| **Poster rates the provider**          | **Provider rates the poster**          |
|----------------------------------------|----------------------------------------|
| Overall, 1–5 (required)                | Overall, 1–5 (required)                |
| Quality of work, 1–5                   | Clarity of the brief, 1–5              |
| Communication, 1–5                     | Communication, 1–5                     |
| Reliability and punctuality, 1–5       | Fair payment and terms, 1–5            |
| Value for money, 1–5                   | Would work with them again? Yes / No   |
| Would hire again? Yes / No             | Public comment (optional, ≤ 500 chars) |
| Public comment (optional, ≤ 500 chars) | Private note to Joby (optional)        |
| Private note to Joby (optional)        |                                        |

**RULES**

- Provider score = average overall rating of revealed reviews, shown
  with one decimal and the review count after 3 reviews. Poster rating
  follows the same rule.

- Reviews cannot be edited after submission. A review can be reported;
  admin can hide an abusive comment but never change stars.

- All structured answers, including "No" outcomes and reasons, are
  stored for future matching.

## 5.15 Categories and suggestions (CAT)

The ten launch categories are listed in section 6. "Missing your
occupation? Tell us" appears in onboarding step 3, on the browse page
and in job posting step 1. Suggestions go to the admin queue, where
admin approves (adds a subcategory and notifies the suggester), merges
or rejects them. Meanwhile the provider can register under Others →
"Other (describe)" with a free-text title, so nobody is blocked.

## 5.16 Support (SUP)

- "Contact support" in the menu and footer opens a WhatsApp chat with
  Joby's business number, prefilled with the user's reference, or sends
  to the support email address.

- WhatsApp and email land in one shared inbox for the ops team.

- A FAQ page with 10–15 questions: verification, credits, credit-back,
  spouses, feedback, account blocks.

- Support hours Sunday–Thursday, 09:00–18:00. Target first response
  under 4 business hours.

## 5.17 Trust and safety (TNS)

- Report a profile, job or review, with a reason. A job reported by 3
  different users is hidden pending review.

- Users can block each other; a blocked poster cannot send requests to
  that provider and the provider no longer sees their jobs.

- Admin can suspend accounts. A removed job refunds all of its
  applications.

## 5.18 Admin console (ADM)

| **Area**      | **Capabilities**                                                                                                       |
|---------------|------------------------------------------------------------------------------------------------------------------------|
| **Queues**    | Verification (3010) · Spouse · Extra hires · Reports · Held jobs · Category suggestions. Each shows age and SLA status |
| **Users**     | Search and view; suspend or reinstate; view verification result (never documents after the decision)                   |
| **Jobs**      | Post on a poster's behalf; edit or remove; extend                                                                      |
| **Credits**   | Grant or adjust with a mandatory reason                                                                                |
| **Reviews**   | Hide an abusive comment (stars are never changed)                                                                      |
| **Dashboard** | KPIs in section 12                                                                                                     |
| **Audit log** | Every admin action with who, what, when, and before/after values                                                       |
| **Access**    | Roles: Admin (all) and Reviewer (queues only). 2FA is mandatory                                                        |

# 6 Category Taxonomy

Providers choose as many subcategories as they work in (no limit). Job
alerts match on subcategory plus area or remote.

| **Category**           | **Launch subcategories**                                                                                                                             | **Budget** |
|------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------|------------|
| **Design**             | Art & illustration · Video · Animation                                                                                                               | Optional\* |
| **Programming & Tech** | Development · Data engineering · AI implementation                                                                                                   | Mandatory  |
| **Digital Marketing**  | Content · Strategy · Social media · Campaigns · SEO · AI marketing                                                                                   | Mandatory  |
| **Music & Audio**      | Music & audio                                                                                                                                        | Optional\* |
| **Business**           | Sales · Strategy · Project management                                                                                                                | Mandatory  |
| **Finance**            | Accounting services                                                                                                                                  | Mandatory  |
| **Consulting**         | Coaching                                                                                                                                             | Optional\* |
| **Lawyers**            | Legal services‡                                                                                                                                      | Mandatory  |
| **Household**          | Construction · Plumbing · Painting · Carpentry · Repairs & handyman · Car services · Electricity · Mobile phone repair · Gardening · Home decoration | Optional\* |
| **Others**             | Medical services‡ · Sport & fitness · Pets · Transportation (taxi, bus) · Travel · Food & catering · Makeup & hair · Other (describe)                | Optional\* |

\* Mandatory when the job is remote. ‡ Licensed professions: the
provider enters a self-declared license number, shown with a disclaimer
that Joby has not verified it.

# 7 Business Rules & Timers

All values are configurable by admin without a code release.

| **Rule**                                       | **Value**                                                                                   |
|------------------------------------------------|---------------------------------------------------------------------------------------------|
| **Eligibility threshold**                      | 30 cumulative reserve days on or after October 7, 2023                                      |
| **Verification decision SLA**                  | 24 hours (queue alert at 20 hours)                                                          |
| **Document deletion after decision**           | Within 24 hours                                                                             |
| **Spouse invite validity**                     | 14 days                                                                                     |
| **Welcome credits**                            | 100                                                                                         |
| **Apply cost · direct request cost**           | 10 credits · 2 credits                                                                      |
| **Credit-back for unopened application**       | 30 days after sending, only while the job is open (no refund once the job ends with a hire) |
| **Job open period**                            | 30 days, plus one 30-day extension approved by the poster (60 days maximum)                 |
| **Applicant cap per job**                      | 30                                                                                          |
| **Maximum open jobs per poster**               | 10                                                                                          |
| **Direct request expiry**                      | 7 days                                                                                      |
| **Maximum direct requests per poster per day** | 20                                                                                          |
| **Feedback request**                           | 3 days after the engagement                                                                 |
| **Feedback reminders**                         | 7 and 14 days after the request (the third carries the block warning)                       |
| **Feedback block**                             | 30 days after the request; lifted as soon as feedback is submitted                          |
| **Blind reveal**                               | When both submit, or 14 days after the first submission                                     |
| **Score visible after**                        | 3 revealed reviews                                                                          |
| **Subcategories per provider · service cards** | Unlimited · 3                                                                               |
| **Low-balance nudge**                          | Below 20 credits                                                                            |
| **Mistaken-hire reversal window**              | 48 hours, through support                                                                   |
| **Hires per job**                              | One by default; extra hires need admin approval                                             |

# 8 Notifications Matrix

| **Event**                                                    | **Recipient**      | **WhatsApp**                      | **Email**    | **In-app** |
|--------------------------------------------------------------|--------------------|-----------------------------------|--------------|------------|
| **Sign-in code**                                             | User               | SMS                               | —            | —          |
| **Verification submitted / approved / rejected / more info** | Provider           | ✓                                 | ✓            | ✓          |
| **Spouse invite**                                            | Spouse             | ✓ (SMS fallback)                  | —            | —          |
| **Spouse approved / rejected**                               | Spouse + reservist | ✓                                 | ✓            | ✓          |
| **New matching job**                                         | Provider           | Instant or daily digest (setting) | Daily digest | ✓          |
| **New application**                                          | Poster             | First per job, then digest        | ✓            | ✓          |
| **Applicant contacted you**                                  | Provider           | ✓                                 | ✓            | ✓          |
| **Not selected**                                             | Provider           | —                                 | ✓            | ✓          |
| **Credit-back issued**                                       | Provider           | ✓                                 | —            | ✓          |
| **Direct request received**                                  | Provider           | ✓                                 | ✓            | ✓          |
| **Request approved (contacts revealed)**                     | Poster + provider  | ✓                                 | ✓            | ✓          |
| **Request declined / expired**                               | Poster             | —                                 | ✓            | ✓          |
| **You were hired**                                           | Provider           | ✓                                 | ✓            | ✓          |
| **Job expires in 2 days (with Extend button)**               | Poster             | ✓                                 | ✓            | ✓          |
| **Feedback request / reminders (request, +7, +14 days)**     | Both               | ✓                                 | ✓            | ✓          |
| **Account blocked / unblocked for missing feedback**         | Blocked user       | ✓                                 | ✓            | ✓          |
| **Extra hire approved / declined**                           | Poster + applicant | ✓                                 | ✓            | ✓          |
| **Feedback revealed**                                        | Both               | —                                 | ✓            | ✓          |
| **Low credit balance**                                       | Provider           | —                                 | ✓            | ✓          |

**RULES**

- WhatsApp messages use pre-approved templates (utility category).
  Template approval starts in Phase 0.

- Quiet hours 22:00–08:00, plus an optional Shabbat quiet window (Friday
  afternoon to Saturday night); messages queue until the window ends.
  Sign-in codes are exempt.

- Per-user settings: WhatsApp on/off, job alerts instant / daily digest
  / off, email digest on/off.

# 9 Data Model

Logical entities for the MVP. Field lists are indicative; the developer
finalizes types and indexes.

| **Entity**                              | **Key fields**                                                                                                                                                                                                                      | **Notes**                                    |
|-----------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------|
| **User**                                | id, phone (unique, verified), email, google_id, full_name, roles\[\], status, consents, notification_prefs, created_at                                                                                                              | One account can hold both roles              |
| **ProviderProfile**                     | user_id, type (reservist / spouse), verification_status, headline, bio, photo, city, radius, remote, years_exp, languages, portfolio_links, cv_file, cv_visible, days_band, show_days_band, rating_avg, rating_count, response_time |                                              |
| **PosterProfile**                       | user_id, poster_type, company_name, logo, website, city, jobs_posted, hire_rate, rating_avg, rating_count                                                                                                                           |                                              |
| **VerificationRequest**                 | id, user_id, kind (3010 / spouse), status, days_total, days_band, id_hash, reviewer_id, decision, reason, submitted_at, decided_at, documents_deleted_at                                                                            | Files live in temporary private storage only |
| **SpouseLink**                          | reservist_id, spouse_user_id, invite_phone, status, created_at                                                                                                                                                                      | One active link per reservist                |
| **Category / Subcategory**              | id, name_he, name_en, budget_mandatory, licensed, active                                                                                                                                                                            | Admin-managed                                |
| **ProviderSubcategory · ProviderSkill** | provider_id, subcategory_id / skill                                                                                                                                                                                                 | Unlimited subcategories, max 15 skills       |
| **ServiceCard**                         | provider_id, title, subcategory_id, description, price_from, unit, mode                                                                                                                                                             | Max 3                                        |
| **Experience · Education**              | provider_id, title / degree, organization, start, end                                                                                                                                                                               | From CV or manual                            |
| **Job**                                 | id, poster_id, subcategory_id, title, description, mode, city, budget_type, budget_min, budget_max, open_to_quotes, timeline, start_date, skills, attachments, status, expires_at, extended, application_count, created_by_admin    |                                              |
| **Application**                         | id, job_id, provider_id, pitch, price, available_from, service_card_id, status, viewed_at, contacted_at, credited_back_at                                                                                                           | Unique (job, provider)                       |
| **DirectRequest**                       | id, poster_id, provider_id, job_id, brief fields, status, responded_at, expires_at                                                                                                                                                  |                                              |
| **Engagement**                          | id, source (application / request), source_id, poster_id, provider_id, created_at, cancelled_at, outcome                                                                                                                            | Feedback attaches here                       |
| **Feedback**                            | id, engagement_id, author_id, subject_id, direction, worked_together, no_reason, overall, sub_scores, would_again, comment, private_note, submitted_at, revealed_at, comment_hidden                                                 | Immutable after submit                       |
| **CreditTransaction**                   | id, provider_id, amount, type, reference_type, reference_id, balance_after, admin_id, reason, created_at                                                                                                                            | Append-only ledger                           |
| **Notification**                        | id, user_id, event, channel, template, status, sent_at                                                                                                                                                                              |                                              |
| **Report**                              | id, reporter_id, target_type, target_id, reason, status, handled_by                                                                                                                                                                 |                                              |
| **ExtraHireRequest**                    | id, job_id, application_id, poster_id, status, decided_by, decided_at                                                                                                                                                               | Admin queue                                  |
| **CategorySuggestion**                  | id, user_id, text, context, status                                                                                                                                                                                                  |                                              |
| **AdminAuditLog**                       | id, admin_id, action, target, before, after, created_at                                                                                                                                                                             | Append-only                                  |

# 10 Screens & Information Architecture

<table>
<colgroup>
<col style="width: 19%" />
<col style="width: 80%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Area</strong></th>
<th><strong>Screens</strong></th>
</tr>
</thead>
<tbody>
<tr class="odd">
<td><strong>Public</strong></td>
<td><p>Landing page with two calls to action ("Find work" / "Hire a
reservist")</p>
<p>Browse jobs · Job page</p>
<p>Browse providers (category-first) · Provider profile</p>
<p>FAQ · Terms · Privacy policy · Accessibility statement</p></td>
</tr>
<tr class="even">
<td><strong>Authentication</strong></td>
<td><p>Sign up / sign in (phone or Google)</p>
<p>Code entry · Phone verification for Google users</p>
<p>Role choice</p></td>
</tr>
<tr class="odd">
<td><strong>Provider</strong></td>
<td><p>Onboarding wizard (7 steps) · Verification status</p>
<p>Home: job feed (Matches / Newest / Saved)</p>
<p>Job detail with apply sheet · My applications</p>
<p>Requests inbox · Engagements and feedback · Wallet</p>
<p>Profile editor · Settings (notifications, spouse, CV
visibility)</p></td>
</tr>
<tr class="even">
<td><strong>Spouse</strong></td>
<td><p>Invite landing page · Proof of marriage upload</p>
<p>Then the provider screens</p></td>
</tr>
<tr class="odd">
<td><strong>Poster</strong></td>
<td><p>Onboarding (one screen)</p>
<p>Post a job wizard · My jobs</p>
<p>Applicants list · Applicant detail</p>
<p>Send request sheet · My requests</p>
<p>Engagements and feedback · Settings</p></td>
</tr>
<tr class="even">
<td><strong>Admin</strong></td>
<td><p>Dashboard</p>
<p>Queues: verification, spouse, extra hires, reports, held jobs,
category suggestions</p>
<p>Users · Jobs · Credits · Audit log</p></td>
</tr>
</tbody>
</table>

# 11 Non-Functional Requirements

<table>
<colgroup>
<col style="width: 21%" />
<col style="width: 78%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Area</strong></th>
<th><strong>Requirement</strong></th>
</tr>
</thead>
<tbody>
<tr class="odd">
<td><strong>Language &amp; layout</strong></td>
<td>Hebrew, right-to-left; ₪ and DD/MM/YYYY formats; all strings in
translation files so English and Arabic can be added later</td>
</tr>
<tr class="even">
<td><strong>Mobile-first</strong></td>
<td>Designed at 375 px width first; deep links from WhatsApp open the
exact job, request or feedback form</td>
</tr>
<tr class="odd">
<td><strong>Performance</strong></td>
<td>Largest Contentful Paint under 2.5 s on 4G; API p95 under 500
ms</td>
</tr>
<tr class="even">
<td><strong>Accessibility</strong></td>
<td>Israeli Standard 5568 (WCAG 2.1 AA level) and a published
accessibility statement, as Israeli accessibility regulations
require</td>
</tr>
<tr class="odd">
<td><strong>Privacy</strong></td>
<td><p>Compliance with the Privacy Protection Law, including Amendment
13; legal review before beta</p>
<p>Data minimization: verification documents deleted within 24 hours
after the decision; only the result and a salted ID hash are kept</p>
<p>User data export and account deletion on request</p></td>
</tr>
<tr class="even">
<td><strong>Security</strong></td>
<td><p>Row-level security on every table; private storage with signed
URLs that expire within 5 minutes</p>
<p>Rate limits on sign-in codes, applications and requests</p>
<p>Upload validation (type, size) and malware scanning</p>
<p>Admin 2FA, audit log, daily backups</p></td>
</tr>
<tr class="odd">
<td><strong>AI use</strong></td>
<td>Vision-capable LLM for 3010 and CV extraction under zero-retention
terms; every AI output is confirmed by a person (the provider for the
CV, admin for the 3010)</td>
</tr>
<tr class="even">
<td><strong>Reliability</strong></td>
<td>99.5% uptime target; error monitoring and alerts; scheduled jobs are
idempotent and retried</td>
</tr>
</tbody>
</table>

# 12 Analytics & KPIs

## 12.1 Events

| **Event**                                            | **Key properties**                                 |
|------------------------------------------------------|----------------------------------------------------|
| **sign_up_started / sign_up_completed**              | method (phone / Google), role                      |
| **onboarding_step_completed**                        | step, provider type                                |
| **verification_submitted / verification_decided**    | file count, days total, outcome, hours to decision |
| **cv_uploaded / cv_autofill_confirmed**              | fields filled, fields kept, fields edited          |
| **profile_published**                                | profile strength, subcategories                    |
| **job_posted**                                       | category, mode, budget type, posted by admin       |
| **job_viewed / application_sent**                    | job id, category, credits balance                  |
| **application_viewed / applicant_contacted / hired** | hours since application                            |
| **direct_request_sent / direct_request_responded**   | outcome, hours to response                         |
| **credit_back_issued**                               | reason (unopened / job ended)                      |
| **feedback_submitted**                               | direction, worked together, overall score          |
| **category_suggested · support_contacted**           | context, channel                                   |
| **feedback_block_applied / feedback_block_lifted**   | role, days since request                           |
| **extra_hire_requested / extra_hire_decided**        | job id, outcome, hours to decision                 |

## 12.2 Admin KPI dashboard

- Active users, using the definitions in section 1.5

- Funnel: sign-up → profile submitted → verified → first application →
  first engagement

- Liquidity per category and region · application open rate · fill rate

- Verification SLA and queue size · feedback completion rate

- Credits: granted, spent, credited back

# 13 Technology & Integrations

| **Component**                      | **Recommended choice**                                                            | **Notes**                                                                                                                      |
|------------------------------------|-----------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------|
| **Front end & hosting**            | Next.js on Vercel                                                                 | Server-rendered public pages, ready for SEO in Phase 3                                                                         |
| **Back end & database**            | Supabase: Postgres, Auth, Storage, Edge Functions                                 | Row-level security on every table                                                                                              |
| **Authentication**                 | Supabase Auth: phone OTP and Google OAuth                                         | Phone verification step for Google users                                                                                       |
| **SMS**                            | SMS provider with Israeli delivery                                                | Sign-in codes and invite fallback                                                                                              |
| **WhatsApp**                       | Joby WhatsApp Business account, connected to the WhatsApp Business Platform (API) | The API is needed for automated templated messages; business verification and template approval follow the brand-name decision |
| **Email**                          | Transactional email service plus a support address                                | Digests and notifications                                                                                                      |
| **Support inbox**                  | Shared inbox covering WhatsApp and email                                          | One queue for the ops lead                                                                                                     |
| **AI extraction**                  | Vision-capable LLM API                                                            | 3010 and CV parsing; zero data retention                                                                                       |
| **Payments (P1)**                  | Israeli card processor with automatic invoices and receipts                       | Selected before public launch                                                                                                  |
| **Product analytics · monitoring** | Product analytics tool · error tracking                                           | Events in section 12                                                                                                           |
| **Scheduled jobs**                 | Database cron or edge functions                                                   | Job expiry, credit-back, request expiry, feedback reminders and blocks, document deletion                                      |

# 14 Release Plan

| **Release**        | **Dates**                 | **Scope**                                                                                                                                                                                                         |
|--------------------|---------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Design**         | Oct 26 – Nov 30, 2026     | Clickable prototype of all P0 flows; tested with 10 reservists                                                                                                                                                    |
| **Build**          | Nov 9, 2026 – Jan 3, 2027 | All P0 requirements                                                                                                                                                                                               |
| **QA & hardening** | Jan 4 – Jan 10, 2027      | End-to-end tests, security review, legal sign-off on privacy                                                                                                                                                      |
| **Closed beta**    | Jan 11 – Feb 28, 2027     | All P0: sign-up, onboarding, 3010 verification, CV autofill, spouses, jobs, Flows A and B, credits (welcome + admin grants), credit-back, feedback, notifications, support, admin. Nationwide on-site plus remote |
| **Public launch**  | March 2027                | P1: credit purchases with invoices, spouse-initiated invite, basic SEO for job and profile pages                                                                                                                  |
| **Later phases**   | From May 2027             | Referral loop, category × city pages, AI matching, chat, employer packages pilot                                                                                                                                  |

# 15 Edge Cases

| **Case**                                                  | **Behavior**                                                                                             |
|-----------------------------------------------------------|----------------------------------------------------------------------------------------------------------|
| **Forms total 29 days**                                   | Rejected as "under 30 days"; the provider can resubmit after more service                                |
| **A form spans October 7, 2023**                          | Only days on or after October 7 count                                                                    |
| **Two forms overlap**                                     | Overlapping days counted once                                                                            |
| **Name on 3010 differs from the account name**            | Admin requests clarification; account name corrected through support                                     |
| **Same ID number on another account**                     | Request flagged "Possible duplicate identity" in the queue; admin approves or rejects                    |
| **Provider runs out of credits during beta**              | "Contact support for more credits"; admin grants with a reason                                           |
| **Poster deletes a job with applicants**                  | Treated as Closed without hire: all applications refunded                                                |
| **Poster hires the wrong person**                         | Reversed through support within 48 hours; engagement cancelled                                           |
| **Poster hires without opening every application**        | No refund for the unopened applications                                                                  |
| **No hire after 60 days**                                 | Job expires; all applications refunded except withdrawn ones                                             |
| **Poster wants a second provider for the same job**       | "Hire another applicant" request; admin decides; both sides notified                                     |
| **Provider is called up for reserve duty mid-engagement** | No special status in the MVP; support can extend the feedback deadline on request                        |
| **Only one side submits feedback**                        | Revealed 14 days after submission; the other side is blocked 30 days after the request until they submit |
| **Retaliation rating**                                    | Prevented by the blind reveal; abusive comments can be reported and hidden                               |
| **Reservist account deleted or verification revoked**     | Admin decides manually whether the linked spouse stays eligible; the spouse is notified                  |
| **Spouse invite sent to a number already registered**     | Link created when the existing user accepts and uploads proof                                            |
| **Double-tap on Apply**                                   | One application created, one charge                                                                      |
| **Job removed by admin**                                  | All applications refunded                                                                                |

# 16 Resolved Questions & Remaining Items

## 16.1 Resolved in founder review (October 25, 2026)

| **\#** | **Question**                                                        | **Decision**                                                                                        | **Where in the PRD** |
|--------|---------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------|----------------------|
| 1      | Accept common-law partners as spouses?                              | Yes: notarized affidavit or an official recognition document                                        | 5.6                  |
| 2      | Spouse status if the reservist account is deleted or unlinked       | Admin decides manually; spouse notified                                                             | 5.6, 15              |
| 3      | Add "Project management" under Business?                            | Yes                                                                                                 | 6                    |
| 4      | Store a salted hash of the ID number to prevent duplicate accounts? | Yes, store it                                                                                       | 5.3                  |
| 6      | WhatsApp channel                                                    | Joby WhatsApp Business account                                                                      | 13                   |
| 8      | Refund when a provider withdraws an application?                    | No refund                                                                                           | 5.10                 |
| 9      | More than one hire per job?                                         | Admin decides per request; poster and applicant notified                                            | 5.12                 |
| —      | "On reserve duty" status                                            | Removed from the MVP                                                                                | 2.3                  |
| —      | Feedback enforcement                                                | Reminders after 7 and 14 days, block after 30 days with a clear warning                             | 5.14                 |
| —      | Job lifetime and refunds (v1.2)                                     | 30 + 30 days maximum; refunds only when the job ends without a hire, or unopened 30 days while open | 5.8, 5.10            |
| —      | Duplicate ID (v1.2)                                                 | Admin approves or rejects; resolution process in Phase 1–2                                          | 5.3                  |

## 16.2 Still open

| **\#** | **Item**                                 | **Status**                                                                   | **Owner · when**               |
|--------|------------------------------------------|------------------------------------------------------------------------------|--------------------------------|
| 5      | Payment processor and invoicing provider | To choose later                                                              | Founder · before public launch |
| 7      | Credit bundle prices                     | To finalize                                                                  | Founder · before public launch |
| 10     | Final brand name and domain              | To decide later; WhatsApp business verification and email setup depend on it | Founder                        |
