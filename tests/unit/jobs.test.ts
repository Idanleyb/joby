import { describe, expect, it } from "vitest";
import { applicantRange, budgetText, jobMatchesProvider, timeAgo } from "@/lib/jobs";

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
  it("matches jobs to providers by category and area", () => {
    const p = { works_onsite: true, works_remote: false, city: "ראשון לציון", radius_km: 25, subs: [7] };
    expect(jobMatchesProvider({ mode: "onsite", city: "חולון", subcategory_id: 7 }, p)).toBe(true); // same region
    expect(jobMatchesProvider({ mode: "onsite", city: "חיפה", subcategory_id: 7 }, p)).toBe(false);
    expect(jobMatchesProvider({ mode: "remote", city: null, subcategory_id: 7 }, p)).toBe(false);
    expect(jobMatchesProvider({ mode: "onsite", city: "חולון", subcategory_id: 8 }, p)).toBe(false);
    expect(jobMatchesProvider({ mode: "onsite", city: "חולון", subcategory_id: 7 }, { ...p, radius_km: 10 })).toBe(false);
    expect(jobMatchesProvider({ mode: "onsite", city: "אילת", subcategory_id: 7 }, { ...p, radius_km: null })).toBe(true);
    expect(jobMatchesProvider({ mode: "both", city: "אילת", subcategory_id: 7 }, { ...p, works_remote: true })).toBe(true);
  });
});
