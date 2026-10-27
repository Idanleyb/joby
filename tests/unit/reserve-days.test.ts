import { describe, expect, it } from "vitest";
import { countReserveDays } from "@/lib/reserve-days";

const today = new Date("2026-10-27T12:00:00Z");

describe("countReserveDays", () => {
  it("counts inclusive days", () => {
    expect(countReserveDays([{ from: "2024-01-01", to: "2024-01-30" }], today).days).toBe(30);
  });

  it("ignores days before 7 Oct 2023", () => {
    const r = countReserveDays([{ from: "2023-10-01", to: "2023-10-10" }], today);
    expect(r.days).toBe(4); // 7, 8, 9, 10
    expect(r.warnings).toContain("before_start_ignored");
  });

  it("drops periods entirely before the start", () => {
    expect(countReserveDays([{ from: "2022-05-01", to: "2022-06-01" }], today).days).toBe(0);
  });

  it("counts overlapping forms once", () => {
    const r = countReserveDays(
      [
        { from: "2024-01-01", to: "2024-01-20" },
        { from: "2024-01-15", to: "2024-02-04" },
        { from: "2024-03-01", to: "2024-03-10" },
      ],
      today,
    );
    expect(r.days).toBe(35 + 10);
    expect(r.merged).toEqual([
      { from: "2024-01-01", to: "2024-02-04" },
      { from: "2024-03-01", to: "2024-03-10" },
    ]);
  });

  it("merges back-to-back periods", () => {
    const r = countReserveDays([{ from: "2024-01-01", to: "2024-01-10" }, { from: "2024-01-11", to: "2024-01-20" }], today);
    expect(r.days).toBe(20);
    expect(r.merged).toHaveLength(1);
  });

  it("rejects invalid dates and reversed periods", () => {
    const r = countReserveDays([{ from: "2024-02-31", to: "2024-03-02" }, { from: "2024-05-10", to: "2024-05-01" }], today);
    expect(r.days).toBe(0);
    expect(r.warnings).toContain("invalid_period");
  });

  it("caps future end dates at today", () => {
    const r = countReserveDays([{ from: "2026-10-20", to: "2026-12-31" }], today);
    expect(r.days).toBe(8);
    expect(r.warnings).toContain("future_date");
  });

  it("handles the 30-day threshold edge", () => {
    expect(countReserveDays([{ from: "2023-10-07", to: "2023-11-05" }], today).days).toBe(30);
  });
});

describe("real Form 3010 layout (multi-row table)", () => {
  it("sums the table rows; adjacent rows merge without changing the total", () => {
    // Rows from a cumulative 3010 for Apr–Jul 2026 (dates only).
    const r = countReserveDays(
      [
        { from: "2026-07-27", to: "2026-07-29" },
        { from: "2026-07-20", to: "2026-07-22" },
        { from: "2026-07-12", to: "2026-07-14" },
        { from: "2026-06-21", to: "2026-07-09" },
        { from: "2026-04-09", to: "2026-06-16" },
        { from: "2026-04-05", to: "2026-04-08" },
      ],
      today,
    );
    expect(r.days).toBe(3 + 3 + 3 + 19 + 69 + 4);
  });
});
