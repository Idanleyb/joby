import type { PosterView } from "@/lib/poster-view";
import { JobCard } from "@/components/job-view";
import { Stars } from "@/components/provider-profile";
import { DemoBadge } from "@/components/ui";

const TYPE: Record<string, string> = { private: "אדם פרטי", business: "עסק", hr: "מגייס/ת", public_body: "גוף ציבורי או עמותה" };
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

/** Poster profile, modelled on Upwork's client profile. */
export function PosterProfile({ p, actions }: { p: PosterView; actions?: React.ReactNode }) {
  const hireRate = p.jobs_closed > 0 ? `${Math.round((p.hires / p.jobs_closed) * 100)}%` : "—";
  return (
    <article className="flex flex-col gap-6">
      <header className="flex items-start gap-4">
        {p.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.logoUrl} alt="" className="size-20 shrink-0 rounded-2xl border border-border object-cover" />
        ) : (
          <div aria-hidden="true" className="flex size-20 shrink-0 items-center justify-center rounded-2xl bg-brand text-2xl font-bold text-brand-contrast">
            {p.display_name[0]}
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <h2 className="flex items-center gap-2 text-[22px] font-bold"><bdi>{p.display_name}</bdi>{p.is_demo ? <DemoBadge /> : null}</h2>
          <p className="text-sm text-muted">{TYPE[p.poster_type]} · 📍 {p.city} · ב-Joby מאז {since(p.created_at)}</p>
          <div className="flex flex-wrap gap-1.5 text-xs font-semibold">
            <span className="rounded-full bg-brand px-2.5 py-1 text-brand-contrast">✓ חשבון מאומת</span>
            {p.rating_count >= 3 && p.rating_avg ? <span className="rounded-full bg-action px-2.5 py-1 text-foreground">★ {p.rating_avg} ({p.rating_count})</span> : null}
          </div>
          {p.website ? <a href={p.website} target="_blank" rel="noopener noreferrer nofollow" dir="ltr" className="text-sm text-foreground underline">{p.website.replace(/^https?:\/\//, "")}</a> : null}
        </div>
      </header>

      <div className="grid grid-cols-4 gap-2">
        <Stat value={p.jobs_posted} label="עבודות פורסמו" />
        <Stat value={hireRate} label="שיעור גיוס" />
        <Stat value={p.openJobs.length} label="פתוחות עכשיו" />
        <Stat value={p.rating_count >= 3 && p.rating_avg ? `★ ${p.rating_avg}` : "—"} label="דירוג" />
      </div>
      {actions}

      {p.about ? <p className="whitespace-pre-line leading-relaxed">{p.about}</p> : null}

      {p.openJobs.length ? (
        <section className="flex flex-col gap-3">
          <h3 className="font-bold">עבודות פתוחות</h3>
          {p.openJobs.map((j) => <JobCard key={j.id} job={{ ...j, subName: j.sub?.name_he ?? "" }} />)}
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <h3 className="font-bold">חוות דעת מנותני שירות{p.reviews.length ? ` (${p.reviews.length})` : ""}</h3>
        {p.reviews.length ? (
          <ul className="flex flex-col gap-3">
            {p.reviews.map((r) => (
              <li key={r.id} className="flex flex-col gap-1 border-b border-border pb-3 last:border-0">
                <span className="text-sm font-semibold"><bdi>{r.author_name}</bdi>{r.engagement_title ? <span className="font-normal text-muted"> · {r.engagement_title}</span> : null}</span>
                {r.overall ? <Stars n={r.overall} /> : null}
                {r.comment ? <p className="text-sm">{r.comment}</p> : null}
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted">עוד אין חוות דעת.</p>}
      </section>
    </article>
  );
}
