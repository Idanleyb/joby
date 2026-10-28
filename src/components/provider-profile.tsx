import type { ProviderView } from "@/lib/provider-view";
import { DemoBadge, cx } from "@/components/ui";

const UNIT: Record<string, string> = { job: "לעבודה", hour: "לשעה", day: "ליום", project: "לפרויקט" };
const MODE: Record<string, string> = { onsite: "בשטח", remote: "מרחוק", both: "בשטח ומרחוק" };
const BAND: Record<string, string> = { "30-59": "30+", "60-119": "60+", "120+": "120+" };
const year = (d: string | null) => (d ? d.slice(0, 4) : "");
const dmy = (d: string) => d.slice(0, 10).split("-").reverse().join("/");
const MONTHS = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
const since = (iso: string) => `${MONTHS[new Date(iso).getMonth()]} ${new Date(iso).getFullYear()}`;

function Stat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center rounded-xl bg-background px-2 py-3 text-center">
      <span className="text-lg font-bold">{value}</span>
      <span className="text-xs text-muted">{label}</span>
    </div>
  );
}

export function Stars({ n }: { n: number }) {
  return <span aria-label={`${n} מתוך 5`} className="text-foreground">{"★".repeat(Math.round(n))}<span className="text-border">{"★".repeat(5 - Math.round(n))}</span></span>;
}

function Badge({ children, tone = "brand" }: { children: React.ReactNode; tone?: "brand" | "accent" | "muted" }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        tone === "brand" && "bg-brand text-brand-contrast",
        tone === "accent" && "bg-action text-foreground",
        tone === "muted" && "bg-background text-muted",
      )}
    >
      {children}
    </span>
  );
}

export function ProviderProfile({ p, cvHref, actions }: { p: NonNullable<ProviderView>; cvHref?: string | null; actions?: React.ReactNode }) {
  const verified = p.verification_status === "approved";
  const area = [p.works_onsite ? `${p.city ?? ""}${p.radius_km ? ` · עד ${p.radius_km} ק״מ` : " · כל הארץ"}` : null, p.works_remote ? "עבודה מרחוק" : null]
    .filter(Boolean)
    .join(" · ");
  return (
    <article className="flex flex-col gap-6">
      <header className="flex items-start gap-4">
        {p.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.photoUrl} alt="" className="size-20 shrink-0 rounded-full border border-border object-cover" />
        ) : (
          <div aria-hidden="true" className="flex size-20 shrink-0 items-center justify-center rounded-full bg-brand text-2xl font-bold text-brand-contrast">
            {p.display_name?.[0] ?? "?"}
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <h2 className="flex items-center gap-2 text-[22px] font-bold"><bdi>{p.display_name}</bdi>{p.is_demo ? <DemoBadge /> : null}</h2>
          {p.headline ? <p className="font-medium">{p.headline}</p> : null}
          <div className="flex flex-wrap gap-1.5">
            {verified ? <Badge>{p.provider_type === "spouse" ? "בן/בת זוג של מילואימניק" : "מילואימניק מאומת"}</Badge> : <Badge tone="muted">ממתין לאימות</Badge>}
            {verified && p.show_days_band && p.days_band ? <Badge tone="accent">{BAND[p.days_band]} ימי מילואים</Badge> : null}
            {p.busyNow ? <Badge tone="muted">עסוק/ה{p.busy_until ? ` עד ${dmy(p.busy_until)}` : ""}</Badge> : <Badge tone="accent">● זמין/ה עכשיו</Badge>}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-4 gap-2">
        <Stat value={p.rating_count >= 3 && p.rating_avg ? `★ ${p.rating_avg}` : "חדש"} label={p.rating_count ? `${p.rating_count} חוות דעת` : "דירוג"} />
        <Stat value={p.jobs_done} label="עבודות ב-Joby" />
        <Stat value={p.avg_response_hours != null ? `${Math.max(1, Math.round(p.avg_response_hours))} ש׳` : "—"} label="זמן תגובה" />
        <Stat value={<span className="text-sm">{since(p.created_at)}</span>} label="ב-Joby מאז" />
      </div>
      {actions}

      {area ? <p className="text-sm text-muted">📍 {area}{p.years_experience != null ? ` · ${p.years_experience} שנות ניסיון` : ""}</p> : null}

      {p.subcategories.length || p.other_title ? (
        <div className="flex flex-wrap gap-2">
          {p.subcategories.map((s) => <span key={s} className="rounded-full border border-border px-3 py-1 text-sm">{s}</span>)}
          {p.other_title ? <span className="rounded-full border border-border px-3 py-1 text-sm">{p.other_title}</span> : null}
        </div>
      ) : null}

      {p.bio ? <p className="whitespace-pre-line leading-relaxed">{p.bio}</p> : null}

      {p.services.length ? (
        <section className="flex flex-col gap-3">
          <h3 className="font-bold">שירותים</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {p.services.map((s) => (
              <div key={s.id} className="flex flex-col gap-1 rounded-2xl border border-border bg-surface p-4">
                <p className="font-semibold">{s.title}</p>
                <p className="text-xs text-muted">{s.sub} · {MODE[s.mode]}</p>
                {s.description ? <p className="text-sm">{s.description}</p> : null}
                <p className="mt-auto pt-1 text-sm font-bold">{s.price_from ? `החל מ-₪${s.price_from.toLocaleString("he-IL")} ${UNIT[s.unit]}` : "הצעת מחיר לפי בקשה"}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {p.skills.length ? (
        <section className="flex flex-col gap-2">
          <h3 className="font-bold">מיומנויות</h3>
          <div className="flex flex-wrap gap-1.5">{p.skills.map((s) => <span key={s} className="rounded-lg bg-background px-2 py-1 text-sm">{s}</span>)}</div>
        </section>
      ) : null}

      {p.experience.length ? (
        <section className="flex flex-col gap-2">
          <h3 className="font-bold">ניסיון</h3>
          <ul className="flex flex-col gap-1 text-sm">
            {p.experience.map((e, i) => (
              <li key={i}>{e.title}{e.organization ? `, ${e.organization}` : ""} {e.start_date ? <span className="text-muted">({year(e.start_date)}–{year(e.end_date) || "היום"})</span> : null}</li>
            ))}
          </ul>
        </section>
      ) : null}
      {p.education.length ? (
        <section className="flex flex-col gap-2">
          <h3 className="font-bold">השכלה והסמכות</h3>
          <ul className="flex flex-col gap-1 text-sm">
            {p.education.map((e, i) => <li key={i}>{e.degree}{e.institution ? `, ${e.institution}` : ""} {e.end_date ? <span className="text-muted">({year(e.end_date)})</span> : null}</li>)}
          </ul>
        </section>
      ) : null}

      {p.languages?.length ? <p className="text-sm"><span className="font-semibold">שפות:</span> {p.languages.join(", ")}</p> : null}
      {p.license_number && p.hasLicensed ? (
        <p className="text-sm"><span className="font-semibold">מספר רישיון:</span> <span dir="ltr">{p.license_number}</span> <span className="text-muted">(הצהרה של נותן השירות, לא אומת על ידי Joby)</span></p>
      ) : null}
      {p.gallery.length ? (
        <section className="flex flex-col gap-2">
          <h3 className="font-bold">תמונות מעבודות</h3>
          <div className="grid grid-cols-3 gap-2">
            {p.gallery.map((g) => (
              <a key={g.path} href={g.url} target="_blank" rel="noopener noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.url} alt="" loading="lazy" className="aspect-square w-full rounded-xl border border-border object-cover" />
              </a>
            ))}
          </div>
        </section>
      ) : null}
      {p.portfolio_links?.length ? (
        <section className="flex flex-col gap-1 text-sm">
          <h3 className="font-bold">עבודות</h3>
          {p.portfolio_links.map((l) => <a key={l} href={l} target="_blank" rel="noopener noreferrer nofollow" dir="ltr" className="truncate text-left text-foreground underline">{l.replace(/^https?:\/\//, "")}</a>)}
        </section>
      ) : null}
      <section className="flex flex-col gap-3">
        <h3 className="font-bold">חוות דעת{p.reviews.length ? ` (${p.reviews.length})` : ""}</h3>
        {p.reviews.length ? (
          <ul className="flex flex-col gap-3">
            {p.reviews.map((r) => (
              <li key={r.id} className="flex flex-col gap-1 border-b border-border pb-3 last:border-0">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-semibold"><bdi>{r.author_name}</bdi></span>
                  <span className="text-xs text-muted">{r.submitted_at ? dmy(r.submitted_at) : ""}</span>
                </div>
                {r.engagement_title ? <span className="text-sm font-semibold">{r.engagement_title}</span> : null}
                {r.overall ? <Stars n={r.overall} /> : null}
                {r.comment ? <p className="text-sm">{r.comment}</p> : null}
                {r.would_again ? <span className="text-xs text-foreground">✓ יעסיק/ה שוב</span> : null}
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted">עוד אין חוות דעת. הן מופיעות אחרי עבודה שהושלמה דרך Joby.</p>}
      </section>
      {cvHref ? <a href={cvHref} target="_blank" rel="noopener noreferrer" className="self-start text-sm font-semibold underline">הורדת קורות חיים</a> : null}
    </article>
  );
}
