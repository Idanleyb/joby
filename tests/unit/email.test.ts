import { describe, expect, it } from "vitest";
import { isQuiet, israelClock } from "@/lib/email/quiet";
import { renderEmail } from "@/lib/email/layout";
import { applicantsDigest, budget, contentFor, FREE_LINE, jobAlertDigest, NO_EMAIL, type Ctx, type Job } from "@/lib/email/templates";

const job: Job = {
  id: "j1", title: "תיקון נזילה", city: "ראש העין", mode: "onsite", budget_type: "fixed", budget_min: 500, budget_max: 800,
  expires_at: "2026-12-01T10:00:00Z", application_count: 3, poster_id: "poster", extended: false,
};

function ctx(over: Partial<Ctx> = {}): Ctx {
  return {
    site: "https://www.joby-ai.com",
    support: "https://wa.me/972500000000",
    settings: { applyCost: 10, requestCost: 2, welcomeCredits: 100 },
    user: { id: "me", firstName: "יוסי", providerType: "reservist", balance: 90 },
    jobs: new Map([[job.id, job]]),
    requests: new Map(),
    engagements: new Map([["e1", { id: "e1", title: "תיקון נזילה", poster_id: "poster", provider_id: "me", job_id: "j1" }]]),
    names: new Map([["poster", "אבי ל."]]),
    contacts: new Map([["poster", { name: "אבי ל.", phone: "+972501234567", email: "avi@example.com" }]]),
    stats: { openJobs: 42, verifiedProviders: 120 },
    ...over,
  };
}
const RULES = { start: 22, end: 8, shabbat: true };

describe("quiet hours (Israel time)", () => {
  it("reads the Israel clock", () => {
    expect(israelClock(new Date("2026-11-02T08:30:00Z"))).toEqual({ day: 1, minutes: 10 * 60 + 30 }); // Monday 10:30 IST
  });
  it("blocks nights and Shabbat, allows working hours", () => {
    expect(isQuiet(new Date("2026-11-02T08:30:00Z"), RULES)).toBe(false); // Mon 10:30
    expect(isQuiet(new Date("2026-11-02T21:00:00Z"), RULES)).toBe(true);  // Mon 23:00
    expect(isQuiet(new Date("2026-11-03T05:30:00Z"), RULES)).toBe(true);  // Tue 07:30
    expect(isQuiet(new Date("2026-11-06T15:00:00Z"), RULES)).toBe(true);  // Fri 17:00
    expect(isQuiet(new Date("2026-11-07T10:00:00Z"), RULES)).toBe(true);  // Sat 12:00
    expect(isQuiet(new Date("2026-11-07T19:00:00Z"), RULES)).toBe(false); // Sat 21:00
    expect(isQuiet(new Date("2026-11-06T15:00:00Z"), { ...RULES, shabbat: false })).toBe(false);
  });
});

describe("templates", () => {
  it("welcome says the service is free and links to onboarding", () => {
    const c = contentFor("welcome_provider", {}, ctx())!;
    expect(c.subject).toContain("יוסי");
    expect(JSON.stringify(c.blocks)).toContain(FREE_LINE);
    expect(c.button?.href).toBe("https://www.joby-ai.com/provider/onboarding");
  });
  it("spouse gets the spouse welcome", () => {
    const c = contentFor("welcome_provider", {}, ctx({ user: { id: "me", firstName: "נועה", providerType: "spouse", balance: null } }))!;
    expect(JSON.stringify(c.blocks)).toContain("תעודת נישואין");
  });
  it("credits used up offers a free top-up", () => {
    const c = contentFor("credits_used_up", { balance: 4 }, ctx())!;
    expect(c.subject).toContain("בחינם");
    expect(c.button?.href).toContain("wa.me");
  });
  it("hired email reveals the poster's contact and links to WhatsApp", () => {
    const c = contentFor("you_were_hired", { job_id: "j1", engagement_id: "e1" }, ctx())!;
    expect(JSON.stringify(c.blocks)).toContain("+972501234567");
    expect(c.button?.href).toBe("https://wa.me/972501234567");
  });
  it("last feedback reminder carries no block warning (v1.7)", () => {
    const c = contentFor("feedback_reminder", { engagement_id: "e1", final: true }, ctx())!;
    const all = c.subject + JSON.stringify(c.blocks);
    expect(all).toContain("התזכורת האחרונה");
    expect(all).not.toMatch(/חסם|חסום|יוגבל/);
  });
  it("nudges follow the day: 3010 guide on day 3 when proof is missing", () => {
    expect(contentFor("provider_nudge", { day: 3, proof_sent: false }, ctx())!.subject).toContain("3010");
    expect(contentFor("provider_nudge", { day: 3, proof_sent: true }, ctx())!.subject).toContain("קורות חיים");
    expect(contentFor("provider_nudge", { day: 14 }, ctx())!.blocks.join(" ")).toContain("התזכורת האחרונה");
  });
  it("events without email return null; unknown events too", () => {
    expect(NO_EMAIL.has("application_viewed")).toBe(true);
    expect(contentFor("application_viewed", {}, ctx())).toBeNull();
    expect(contentFor("beta_survey", { day: 7, url: "" }, ctx())).toBeNull();
  });
  it("digests group several items", () => {
    expect(jobAlertDigest([job, { ...job, id: "j2", title: "צביעת דירה" }], ctx())!.subject).toBe("2 משרות חדשות שמתאימות לך");
    expect(applicantsDigest([{ job, count: 3 }], ctx())!.subject).toBe("3 מגישים חדשים ל-תיקון נזילה");
  });
  it("formats budgets", () => {
    expect(budget(job)).toBe("₪500–₪800");
    expect(budget({ budget_type: "hourly", budget_min: 120, budget_max: 120 })).toBe("₪120 לשעה");
    expect(budget({ budget_type: "open_to_quotes", budget_min: null, budget_max: null })).toBe("פתוח להצעות");
  });
});

describe("layout", () => {
  it("renders RTL HTML, escapes input, and a plain-text part", () => {
    const m = renderEmail(
      { subject: "נושא", preheader: "טקסט", greeting: "היי <b>x</b>,", blocks: ["**מודגש** רגיל", { bullets: ["א", "ב"] }], button: { label: "לחצו", href: "https://a.b/c?d=1&e=2" } },
      { site: "https://a.b", supportWhatsapp: null, settingsHref: "https://a.b/account" },
    );
    expect(m.html).toContain('dir="rtl"');
    expect(m.html).toContain("&lt;b&gt;x&lt;/b&gt;");
    expect(m.html).toContain("<b>מודגש</b>");
    expect(m.html).toContain("d=1&amp;e=2");
    expect(m.text).toContain("• א");
    expect(m.text).toContain("לחצו: https://a.b/c?d=1&e=2");
  });
});

describe("left-to-right values", () => {
  it("wraps phone numbers in an LTR span", () => {
    const m = renderEmail({ subject: "s", preheader: "p", blocks: ["טלפון: **⁦+972501234567⁩**"] },
      { site: "https://a.b", supportWhatsapp: null, settingsHref: "https://a.b/account" });
    expect(m.html).toContain('<b><span dir="ltr" style="unicode-bidi:isolate">+972501234567</span></b>');
  });
});

import { createHmac } from "node:crypto";
import { verifyResendWebhook } from "@/lib/email/webhook";
import { templateId } from "@/lib/email/templates";

describe("tracking", () => {
  it("maps events to the content doc's template IDs", () => {
    expect(templateId("provider_nudge", { day: 3, proof_sent: false })).toBe("P2_2a");
    expect(templateId("feedback_reminder", { final: true })).toBe("P4_3");
    expect(templateId("new_application", { count: 1 })).toBe("H3_2");
    expect(templateId("welcome_provider", {}, { user: { id: "x", firstName: "", providerType: "spouse", balance: null }, jobs: new Map() })).toBe("P1_4");
  });
  it("feedback emails carry yes / not yet / no buttons that preselect the answer", () => {
    const c = contentFor("feedback_request", { engagement_id: "e1" }, ctx())!;
    expect(c.answers?.map((a) => a.href.split("?")[1])).toEqual(["answer=yes", "answer=not_yet", "answer=no"]);
    expect(contentFor("feedback_reminder", { engagement_id: "e1", final: true }, ctx())!.answers).toHaveLength(2);
  });
  it("verifies Resend (Svix) webhook signatures", () => {
    const secret = "whsec_" + Buffer.from("test-secret-key-123").toString("base64");
    const body = '{"type":"email.opened","data":{"email_id":"abc"}}';
    const ts = String(Math.floor(Date.now() / 1000));
    const sig = createHmac("sha256", Buffer.from("test-secret-key-123")).update(`msg_1.${ts}.${body}`).digest("base64");
    expect(verifyResendWebhook(body, { id: "msg_1", timestamp: ts, signature: `v1,${sig}` }, secret)).toBe(true);
    expect(verifyResendWebhook(body + " ", { id: "msg_1", timestamp: ts, signature: `v1,${sig}` }, secret)).toBe(false);
    expect(verifyResendWebhook(body, { id: "msg_1", timestamp: String(Number(ts) - 3600), signature: `v1,${sig}` }, secret)).toBe(false);
  });
});
