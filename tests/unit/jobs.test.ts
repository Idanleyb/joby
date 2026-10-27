import { describe, expect, it } from "vitest";
import { applicantRange, budgetText, timeAgo } from "@/lib/jobs";
// Matching by distance is tested in the database tests (supabase/tests, section 13c).

describe("job helpers", () => {
  it("formats budgets", () => {
    expect(budgetText({ budget_type: "open_to_quotes", budget_min: null, budget_max: null })).toBe("פתוח להצעות מחיר");
    expect(budgetText({ budget_type: "fixed", budget_min: 4000, budget_max: 7000 })).toBe("\u2066₪4,000–₪7,000\u2069");
    expect(budgetText({ budget_type: "hourly", budget_min: 150, budget_max: 150 })).toBe("₪150 לשעה");
  });
  it("shows applicants as a range", () => {
    expect([0, 4, 5, 12, 25].map(applicantRange)).toEqual(["0–4 מועמדים", "0–4 מועמדים", "5–9 מועמדים", "10–19 מועמדים", "20+ מועמדים"]);
  });
  it("formats relative time", () => {
    const now = Date.parse("2026-10-27T12:00:00Z");
    expect(timeAgo("2026-10-27T09:00:00Z", now)).toBe("לפני 3 שעות");
    expect(timeAgo("2026-10-25T12:00:00Z", now)).toBe("לפני 2 ימים");
  });
  it("ships the full locality list with the largest towns first", async () => {
    const { IL_CITIES } = await import("@/lib/cities");
    expect(IL_CITIES[0]).toBe("תל אביב-יפו");
    expect(IL_CITIES.length).toBeGreaterThan(1200);
    expect(new Set(IL_CITIES).size).toBe(IL_CITIES.length);
    expect(IL_CITIES).toContain("קריית שמונה");
  });
});
