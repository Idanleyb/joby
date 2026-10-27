/**
 * Reserve-days counting for Form 3010 (PRD 5.3).
 * Only days on or after 7 Oct 2023 count; overlapping periods across forms count once.
 * Dates are ISO "YYYY-MM-DD", both ends inclusive.
 */
export const ELIGIBILITY_START = "2023-10-07";

export type Period = { from: string; to: string };
export type DaysResult = {
  days: number;
  merged: Period[];
  warnings: ("invalid_period" | "future_date" | "before_start_ignored")[];
};

const DAY = 86_400_000;
const toDay = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return NaN;
  const t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
  const d = new Date(t);
  return d.getUTCDate() === +m[3] ? t / DAY : NaN; // rejects 2024-02-31
};
const toIso = (day: number) => new Date(day * DAY).toISOString().slice(0, 10);

export function countReserveDays(periods: Period[], today: Date = new Date(), start = ELIGIBILITY_START): DaysResult {
  const warnings = new Set<DaysResult["warnings"][number]>();
  const startDay = toDay(start);
  const todayDay = Math.floor(today.getTime() / DAY);

  const ranges: [number, number][] = [];
  for (const p of periods) {
    let a = toDay(p.from);
    let b = toDay(p.to);
    if (Number.isNaN(a) || Number.isNaN(b) || b < a) {
      warnings.add("invalid_period");
      continue;
    }
    if (b > todayDay) {
      warnings.add("future_date");
      b = todayDay;
      if (b < a) continue;
    }
    if (a < startDay) {
      warnings.add("before_start_ignored");
      if (b < startDay) continue;
      a = startDay;
    }
    ranges.push([a, b]);
  }

  ranges.sort((x, y) => x[0] - y[0]);
  const merged: [number, number][] = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1] + 1) last[1] = Math.max(last[1], r[1]);
    else merged.push([r[0], r[1]]);
  }

  return {
    days: merged.reduce((sum, [a, b]) => sum + (b - a + 1), 0),
    merged: merged.map(([a, b]) => ({ from: toIso(a), to: toIso(b) })),
    warnings: [...warnings],
  };
}
