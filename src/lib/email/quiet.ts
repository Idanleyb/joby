/** Israel-time quiet hours for lifecycle emails (PRD §8 rules). Pure, unit-tested. */

export type QuietRules = { start: number; end: number; shabbat: boolean };

/** Day of week (0 = Sunday) and minutes since midnight, in Israel time. */
export function israelClock(now: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jerusalem", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { day, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

/** True between `start` and `end` o'clock (overnight), and on Shabbat (Fri 16:00 – Sat 20:00) when enabled. */
export function isQuiet(now: Date, rules: QuietRules) {
  const { day, minutes } = israelClock(now);
  const h = minutes / 60;
  const night = rules.start > rules.end ? h >= rules.start || h < rules.end : h >= rules.start && h < rules.end;
  const shabbat = rules.shabbat && ((day === 5 && h >= 16) || (day === 6 && h < 20));
  return night || shabbat;
}
