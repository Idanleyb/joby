import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import { mailConfigured } from "@/lib/mail";
import { sendTracked } from "./send";
import { renderEmail, type EmailContent, type Footer } from "./layout";
import { applicantsDigest, contentFor, jobAlertDigest, NO_EMAIL, templateId, type Contact, type Ctx, type Eng, type Job, type Req } from "./templates";
import { isQuiet, israelClock } from "./quiet";

/**
 * Email worker (PRD v1.7). Called every 5 minutes by pg_cron (see migration
 * 20261101000100) through /api/notifications/dispatch.
 *
 * Reads outbox rows with email_status = 'pending', claims them (pending → sending),
 * renders the Hebrew template and sends over SMTP (Resend). Rules:
 *   - quiet hours 22:00–08:00 and the Shabbat window: nothing is sent, rows wait;
 *   - job alerts → one morning digest (from 08:30); further applications → one
 *     evening digest (from 18:00); the first application on a job is sent at once;
 *   - users without an email wait up to 2 days, then the row is skipped;
 *   - 3 failed attempts → failed.
 */

const MAX_PER_RUN = 60;
const STALE_CLAIM_MIN = 15;

type Row = { id: number; user_id: string | null; event: string; payload: Record<string, unknown>; created_at: string; email_attempts: number };
type Result = { sent: number; skipped: number; failed: number; waiting: number; quiet?: boolean };

export async function dispatchEmails(now = new Date()): Promise<Result> {
  const result: Result = { sent: 0, skipped: 0, failed: 0, waiting: 0 };
  if (!mailConfigured()) return result;
  const db = createServiceClient();
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  if (!site) throw new Error("NEXT_PUBLIC_SITE_URL is not set");

  // Release claims left by a run that crashed.
  await db.from("notifications").update({ email_status: "pending", email_claimed_at: null })
    .eq("email_status", "sending").lt("email_claimed_at", new Date(now.getTime() - STALE_CLAIM_MIN * 60_000).toISOString());

  const settings = await loadSettings(db);
  if (isQuiet(now, settings.quiet)) return { ...result, quiet: true };

  const { data: rows } = await db.from("notifications")
    .select("id, user_id, event, payload, created_at, email_attempts")
    .eq("email_status", "pending").lte("send_after", now.toISOString()).not("user_id", "is", null)
    .order("id").limit(400);
  if (!rows?.length) return result;

  // Rows that never email are closed at once.
  const silent = rows.filter((r) => NO_EMAIL.has(r.event)).map((r) => r.id);
  if (silent.length) await db.from("notifications").update({ email_status: "skipped" }).in("id", silent);
  result.skipped += silent.length;

  const live = (rows as Row[]).filter((r) => !NO_EMAIL.has(r.event));
  const clock = israelClock(now);
  const morning = clock.minutes >= 8 * 60 + 30;
  const evening = clock.minutes >= 18 * 60;

  // Who is getting what.
  const userIds = [...new Set(live.map((r) => r.user_id!))];
  const people = await loadPeople(db, userIds);
  const recentDigests = await lastDigests(db, userIds, now);

  type Unit = { user: string; rows: Row[]; kind: "single" | "jobs" | "applicants" };
  const units: Unit[] = [];
  const byUser = new Map<string, Row[]>();
  for (const r of live) byUser.set(r.user_id!, [...(byUser.get(r.user_id!) ?? []), r]);
  for (const [user, list] of byUser) {
    const alerts = list.filter((r) => r.event === "job_alert");
    const later = list.filter((r) => r.event === "new_application" && Number(r.payload.count ?? 1) > 1);
    const singles = list.filter((r) => !alerts.includes(r) && !later.includes(r));
    if (alerts.length) {
      if (people.get(user)?.digestOff) { await close(db, alerts.map((r) => r.id), "skipped"); result.skipped += alerts.length; }
      else if (morning && !recentDigests.jobs.has(user)) units.push({ user, rows: alerts, kind: "jobs" });
      else result.waiting += alerts.length;
    }
    if (later.length) {
      if (evening && !recentDigests.applicants.has(user)) units.push({ user, rows: later, kind: "applicants" });
      else result.waiting += later.length;
    }
    for (const r of singles) units.push({ user, rows: [r], kind: "single" });
  }

  let budget = MAX_PER_RUN;
  const footerBase = { site, supportWhatsapp: settings.supportWhatsapp, settingsHref: `${site}/account` };
  for (const unit of units) {
    if (budget <= 0) break;
    const person = people.get(unit.user);
    const ids = unit.rows.map((r) => r.id);
    if (!person || person.isDemo || person.status !== "active") { await close(db, ids, "skipped"); result.skipped += ids.length; continue; }
    if (!person.email) {
      const old = unit.rows.every((r) => now.getTime() - new Date(r.created_at).getTime() > 2 * 86_400_000);
      if (old) { await close(db, ids, "skipped"); result.skipped += ids.length; } else result.waiting += ids.length;
      continue;
    }

    // Claim: only rows still pending move to sending (another run may have taken them).
    const { data: claimed } = await db.from("notifications")
      .update({ email_status: "sending", email_claimed_at: now.toISOString() })
      .in("id", ids).eq("email_status", "pending").select("id");
    if (!claimed?.length || claimed.length !== ids.length) {
      if (claimed?.length) await db.from("notifications").update({ email_status: "pending", email_claimed_at: null }).in("id", claimed.map((c) => c.id));
      continue;
    }

    try {
      const ctx = await buildCtx(db, unit.rows, person, site, settings);
      let content: EmailContent | null;
      if (unit.kind === "jobs") content = jobAlertDigest(unit.rows.map((r) => ctx.jobs.get(String(r.payload.job_id))).filter(Boolean) as Job[], ctx);
      else if (unit.kind === "applicants") {
        const counts = new Map<string, number>();
        for (const r of unit.rows) counts.set(String(r.payload.job_id), (counts.get(String(r.payload.job_id)) ?? 0) + 1);
        content = applicantsDigest([...counts].map(([id, count]) => ({ job: ctx.jobs.get(id)!, count })).filter((g) => g.job), ctx);
      } else content = contentFor(unit.rows[0].event, unit.rows[0].payload, ctx);

      if (!content) { await close(db, ids, "skipped"); result.skipped += ids.length; continue; }
      const template = unit.kind === "jobs" ? "P3_1" : unit.kind === "applicants" ? "H3_2b" : templateId(unit.rows[0].event, unit.rows[0].payload, ctx);
      const mail = renderEmail(content, footerBase as Footer);
      const sent = await sendTracked({ to: person.email, ...mail, tags: { template, event: unit.rows[0].event } });
      if (sent.ok) {
        await db.from("notifications").update({
          email_status: "sent", email_sent_at: new Date().toISOString(), email_claimed_at: null,
          email_template: template, email_provider_id: sent.id,
        }).in("id", ids);
        result.sent += 1; budget -= 1;
      } else await retry(db, unit.rows, sent.error ?? "send failed", result);
    } catch (e) {
      await retry(db, unit.rows, e instanceof Error ? e.message : String(e), result);
    }
  }
  return result;
}

type DB = ReturnType<typeof createServiceClient>;
type Settings = {
  quiet: { start: number; end: number; shabbat: boolean };
  supportWhatsapp: string | null; supportHref: string;
  applyCost: number; requestCost: number; welcomeCredits: number;
};
type Person = { id: string; email: string | null; firstName: string; isDemo: boolean; status: string; digestOff: boolean };

async function close(db: DB, ids: number[], status: "skipped" | "failed") {
  await db.from("notifications").update({ email_status: status, email_claimed_at: null }).in("id", ids);
}

async function retry(db: DB, rows: Row[], error: string, result: Result) {
  for (const r of rows) {
    const attempts = r.email_attempts + 1;
    await db.from("notifications").update({
      email_status: attempts >= 3 ? "failed" : "pending", email_attempts: attempts, email_error: error.slice(0, 500), email_claimed_at: null,
    }).eq("id", r.id);
  }
  result.failed += 1;
  console.error("[email] send failed", rows.map((r) => r.id), error);
}

async function loadSettings(db: DB): Promise<Settings> {
  const { data } = await db.from("app_settings").select("key, value")
    .in("key", ["email_quiet_start_hour", "email_quiet_end_hour", "email_shabbat_quiet", "apply_cost", "request_cost", "welcome_credits"]);
  const v = new Map((data ?? []).map((r) => [r.key, r.value as unknown]));
  const n = (k: string, d: number) => (v.has(k) ? Number(v.get(k)) : d);
  const phone = (process.env.SUPPORT_WHATSAPP ?? "").replace(/\D/g, "");
  const supportWhatsapp = phone ? `https://wa.me/${phone}` : null;
  const supportEmail = process.env.SUPPORT_EMAIL ?? "";
  return {
    quiet: { start: n("email_quiet_start_hour", 22), end: n("email_quiet_end_hour", 8), shabbat: v.get("email_shabbat_quiet") !== false },
    supportWhatsapp,
    supportHref: supportWhatsapp ?? (supportEmail ? `mailto:${supportEmail}` : ""),
    applyCost: n("apply_cost", 10), requestCost: n("request_cost", 2), welcomeCredits: n("welcome_credits", 100),
  };
}

async function loadPeople(db: DB, ids: string[]) {
  const map = new Map<string, Person>();
  if (!ids.length) return map;
  const { data } = await db.from("profiles").select("id, email, first_name, full_name, is_demo, status, notification_prefs").in("id", ids);
  for (const p of data ?? []) {
    const prefs = (p.notification_prefs ?? {}) as Record<string, unknown>;
    map.set(p.id, {
      id: p.id, email: p.email, isDemo: p.is_demo, status: p.status,
      firstName: p.first_name ?? (p.full_name ?? "").split(" ")[0] ?? "",
      digestOff: prefs.email_digest === false,
    });
  }
  return map;
}

/** Users who already got a digest in the last 20 hours. */
async function lastDigests(db: DB, ids: string[], now: Date) {
  const since = new Date(now.getTime() - 20 * 3_600_000).toISOString();
  const recent = async (event: string) => {
    const { data } = await db.from("notifications").select("user_id").in("user_id", ids)
      .eq("event", event).eq("email_status", "sent").gte("email_sent_at", since);
    return new Set((data ?? []).map((r) => r.user_id!));
  };
  return { jobs: await recent("job_alert"), applicants: await recent("new_application") };
}

/** Everything the templates of these rows need, fetched with the service key. */
async function buildCtx(db: DB, rows: Row[], person: Person, site: string, s: Settings): Promise<Ctx> {
  const ids = (k: string) => [...new Set(rows.map((r) => r.payload[k]).filter((x): x is string => typeof x === "string"))];
  const reqIds = ids("request_id"), engIds = ids("engagement_id");

  const [reqs, engs] = await Promise.all([
    reqIds.length ? db.from("direct_requests").select("id, title, city, mode, budget_type, budget_min, budget_max, timeline, description, poster_id, provider_id, expires_at, decline_reason").in("id", reqIds) : null,
    engIds.length ? db.from("engagements").select("id, title, poster_id, provider_id, job_id").in("id", engIds) : null,
  ]);
  const requests = new Map((reqs?.data ?? []).map((r) => [r.id, r as Req]));
  const engagements = new Map((engs?.data ?? []).map((e) => [e.id, e as Eng]));
  const jobIds = [...new Set([...ids("job_id"), ...[...engagements.values()].map((e) => e.job_id).filter(Boolean) as string[]])];
  const jobsRes = jobIds.length
    ? await db.from("jobs").select("id, title, city, mode, budget_type, budget_min, budget_max, expires_at, application_count, poster_id, extended").in("id", jobIds)
    : null;
  const jobs = new Map((jobsRes?.data ?? []).map((j) => [j.id, j as Job]));

  // Public names of the other parties.
  const others = new Set<string>();
  for (const j of jobs.values()) if (j.poster_id) others.add(j.poster_id);
  for (const r of requests.values()) { others.add(r.poster_id); others.add(r.provider_id); }
  for (const e of engagements.values()) { others.add(e.poster_id); others.add(e.provider_id); }
  for (const r of rows) for (const k of ["poster_id", "provider_id"]) if (typeof r.payload[k] === "string") others.add(r.payload[k] as string);
  others.delete(person.id);
  const otherIds = [...others];
  const [posters, providers] = await Promise.all([
    otherIds.length ? db.from("poster_profiles").select("user_id, display_name, company_name, poster_type").in("user_id", otherIds) : null,
    otherIds.length ? db.from("provider_profiles").select("user_id, display_name").in("user_id", otherIds) : null,
  ]);
  const names = new Map<string, string>();
  for (const p of providers?.data ?? []) if (p.display_name) names.set(p.user_id, p.display_name);
  for (const p of posters?.data ?? []) names.set(p.user_id, p.poster_type === "private" ? p.display_name : p.company_name || p.display_name);

  // Contact details: only for events that reveal them (contacted, hired, request approved, hire confirmed).
  const REVEAL = new Set(["applicant_contacted", "you_were_hired", "request_approved", "hire_confirmed"]);
  const contactIds = new Set<string>();
  for (const r of rows) {
    if (!REVEAL.has(r.event)) continue;
    if (r.event === "applicant_contacted") contactIds.add(String(r.payload.poster_id));
    if (r.event === "hire_confirmed") contactIds.add(String(r.payload.provider_id));
    if (r.event === "request_approved") { const q = requests.get(String(r.payload.request_id)); if (q) contactIds.add(q.provider_id); }
    if (r.event === "you_were_hired") {
      const e = engagements.get(String(r.payload.engagement_id)); const j = jobs.get(String(r.payload.job_id));
      const pid = e?.poster_id ?? j?.poster_id; if (pid) contactIds.add(pid);
    }
  }
  const contacts = new Map<string, Contact>();
  if (contactIds.size) {
    const { data } = await db.from("profiles").select("id, phone, email, full_name").in("id", [...contactIds]);
    for (const c of data ?? []) contacts.set(c.id, { name: names.get(c.id) ?? c.full_name ?? "", phone: c.phone, email: c.email });
  }

  const [{ data: pp }, { data: wallet }, open, verified] = await Promise.all([
    db.from("provider_profiles").select("provider_type").eq("user_id", person.id).maybeSingle(),
    db.from("provider_wallets").select("balance").eq("provider_id", person.id).maybeSingle(),
    db.from("jobs").select("id", { count: "exact", head: true }).eq("status", "open"),
    db.from("provider_profiles").select("user_id", { count: "exact", head: true }).eq("verification_status", "approved"),
  ]);

  return {
    site,
    support: s.supportHref || `${site}/account`,
    settings: { applyCost: s.applyCost, requestCost: s.requestCost, welcomeCredits: s.welcomeCredits },
    user: { id: person.id, firstName: person.firstName, providerType: (pp?.provider_type as Ctx["user"]["providerType"]) ?? null, balance: wallet?.balance ?? null },
    jobs, requests, engagements, names, contacts,
    stats: { openJobs: open.count ?? 0, verifiedProviders: verified.count ?? 0 },
  };
}
