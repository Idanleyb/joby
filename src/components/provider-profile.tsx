import type { ProviderView } from "@/lib/provider-view";
import { cx } from "@/components/ui";

const UNIT: Record<string, string> = { job: "לעבודה", hour: "לשעה", day: "ליום", project: "לפרויקט" };
const MODE: Record<string, string> = { onsite: "בשטח", remote: "מרחוק", both: "בשטח ומרחוק" };
const BAND: Record<string, string> = { "30-59": "30+", "60-119": "60+", "120+": "120+" };
const year = (d: string | null) => (d ? d.slice(0, 4) : "");

function Badge({ children, tone = "brand" }: { children: React.ReactNode; tone?: "brand" | "accent" | "muted" }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        tone === "brand" && "bg-brand text-brand-contrast",
        tone === "accent" && "bg-accent/20 text-accent-strong",
        tone === "muted" && "bg-background text-muted",
      )}
    >
      {children}
    </span>
  );
}

export function ProviderProfile({ p, cvHref }: { p: NonNullable<ProviderView>; cvHref?: string | null }) {
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
          <h2 className="text-2xl font-extrabold"><bdi>{p.display_name}</bdi></h2>
          {p.headline ? <p className="font-medium">{p.headline}</p> : null}
          <div className="flex flex-wrap gap-1.5">
            {verified ? <Badge>{p.provider_type === "spouse" ? "בן/בת זוג של מילואימניק" : "מילואימניק מאומת"}</Badge> : <Badge tone="muted">ממתין לאימות</Badge>}
            {verified && p.show_days_band && p.days_band ? <Badge tone="accent">{BAND[p.days_band]} ימי מילואים</Badge> : null}
            {p.rating_count >= 3 && p.rating_avg ? <Badge tone="accent">★ {p.rating_avg} ({p.rating_count})</Badge> : <Badge tone="muted">חדש ב-Joby</Badge>}
          </div>
        </div>
      </header>

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
      {p.portfolio_links?.length ? (
        <section className="flex flex-col gap-1 text-sm">
          <h3 className="font-bold">עבודות</h3>
          {p.portfolio_links.map((l) => <a key={l} href={l} target="_blank" rel="noopener noreferrer nofollow" dir="ltr" className="truncate text-left text-accent-strong underline">{l.replace(/^https?:\/\//, "")}</a>)}
        </section>
      ) : null}
      {cvHref ? <a href={cvHref} target="_blank" rel="noopener noreferrer" className="self-start text-sm font-semibold underline">הורדת קורות חיים</a> : null}
    </article>
  );
}
