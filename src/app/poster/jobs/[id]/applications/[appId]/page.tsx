import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePoster } from "@/lib/poster";
import { formatIlPhone } from "@/lib/phone";
import { APP_STATUS_LABEL } from "@/lib/jobs";
import { ActionButton } from "@/components/action-button";
import { Card, PageShell } from "@/components/ui";
import { contactApp, declineApp, hireApp, requestExtraHire, shortlistApp } from "../../../actions";
import { MarkViewed } from "./mark-viewed";

export const metadata: Metadata = { title: "מועמד/ת · Joby" };

const linkBtn = "inline-flex min-h-12 items-center justify-center rounded-xl border border-border bg-surface px-4 font-semibold hover:bg-background";
const UNIT: Record<string, string> = { job: "לעבודה", hour: "לשעה", day: "ליום", project: "לפרויקט" };

export default async function ApplicationPage({ params }: { params: Promise<{ id: string; appId: string }> }) {
  const { id, appId } = await params;
  const me = await requirePoster(`/poster/jobs/${id}/applications/${appId}`);
  const supabase = await createClient();
  const { data: job } = await supabase.from("jobs").select("id, title, status").eq("id", id).eq("poster_id", me.userId).maybeSingle();
  if (!job) notFound();
  const { data: a } = await supabase
    .from("applications")
    .select("id, status, pitch, proposed_price, available_from, sent_at, provider_id, service_card:service_cards(title, price_from, unit), provider:provider_profiles(display_name, headline, provider_type, rating_avg, rating_count, jobs_done, city, years_experience)")
    .eq("id", appId).eq("job_id", id).maybeSingle();
  if (!a || a.status === "withdrawn") notFound();

  const { data: extra } = await supabase.from("extra_hire_requests").select("status").eq("application_id", a.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const revealed = a.status === "contacted" || a.status === "hired";
  const { data: contact } = revealed ? await supabase.rpc("get_contact", { p_other: a.provider_id }).maybeSingle() : { data: null };
  const inPlay = ["sent", "viewed", "shortlisted", "contacted"].includes(a.status);
  const p = a.provider;
  const waNumber = contact?.phone?.replace(/^\+/, "");

  return (
    <PageShell title={<bdi>{p?.display_name ?? ""}</bdi>} subtitle={<>על העבודה: <Link href={`/poster/jobs/${job.id}`} className="underline underline-offset-4">{job.title}</Link></>}>
      <MarkViewed jobId={job.id} appId={a.id} />
      {a.status === "hired" ? (
        <p role="status" className="rounded-xl bg-info px-4 py-3 text-sm">
          בחרת בנותן/ת השירות הזה/ו ✓ שאר המועמדים קיבלו עדכון. בעוד 3 ימים נבקש משניכם משוב קצר.
        </p>
      ) : null}
      <Card className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-lg bg-brand px-2 py-0.5 font-semibold text-brand-contrast">
            ✓ {p?.provider_type === "spouse" ? "בן/בת זוג של מילואימניק מאומת" : "מילואימניק מאומת"}
          </span>
          <span className="text-muted">{APP_STATUS_LABEL[a.status] === "נבחרת! 🎉" ? "נבחר/ה" : APP_STATUS_LABEL[a.status]}</span>
        </div>
        {p?.headline ? <p className="font-semibold">{p.headline}</p> : null}
        <p className="text-sm text-muted">
          {[p?.city, p?.years_experience != null ? `${p.years_experience} שנות ניסיון` : null, p?.jobs_done ? `${p.jobs_done} עבודות דרך Joby` : null,
            p && p.rating_count >= 3 && p.rating_avg ? `★ ${p.rating_avg} (${p.rating_count})` : null].filter(Boolean).join(" · ")}
        </p>
        <Link href={`/providers/${a.provider_id}`} className="text-sm font-semibold underline underline-offset-4">לפרופיל המלא</Link>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="font-bold">הפנייה</h2>
        <p className="whitespace-pre-line leading-relaxed">{a.pitch}</p>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div><dt className="text-muted">הצעת מחיר</dt><dd className="font-bold">{a.proposed_price ? `₪${a.proposed_price.toLocaleString("he-IL")}` : "לא צוינה"}</dd></div>
          <div><dt className="text-muted">זמינות</dt><dd className="font-semibold">{a.available_from ? `מ-${a.available_from.split("-").reverse().join("/")}` : "לא צוינה"}</dd></div>
        </dl>
        {a.service_card ? (
          <p className="rounded-xl bg-background p-3 text-sm">שירות: <b>{a.service_card.title}</b>{a.service_card.price_from ? ` · החל מ-₪${a.service_card.price_from} ${UNIT[a.service_card.unit] ?? ""}` : ""}</p>
        ) : null}
      </Card>

      {contact ? (
        <Card className="flex flex-col gap-3">
          <h2 className="font-bold">פרטי קשר</h2>
          <p className="text-sm"><bdi>{contact.full_name}</bdi> · <span dir="ltr">{formatIlPhone(contact.phone)}</span>{contact.email ? <> · <span dir="ltr">{contact.email}</span></> : null}</p>
          <div className="grid grid-cols-2 gap-2">
            <a href={`tel:${contact.phone}`} className={linkBtn}>📞 התקשרות</a>
            <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer" className={linkBtn}>WhatsApp</a>
          </div>
        </Card>
      ) : null}

      {inPlay && job.status === "open" ? (
        <div className="flex flex-col gap-2">
          <ActionButton variant="primary" action={hireApp.bind(null, job.id, a.id)} label="בחירה בנותן/ת השירות"
            confirm="לבחור בנותן/ת השירות הזה/ו? העבודה תיסגר, ושאר המועמדים יקבלו הודעה שלא נבחרו. אחרי 3 ימים נבקש משניכם משוב." confirmLabel="כן, בחירה" />
          {a.status !== "contacted" ? (
            <ActionButton action={contactApp.bind(null, job.id, a.id)} label="יצירת קשר (חשיפת טלפון)" confirm="ייחשפו פרטי הקשר של שניכם — לך ולנותן/ת השירות." confirmLabel="חשיפה" />
          ) : null}
          {a.status !== "contacted" ? (
            <ActionButton action={shortlistApp.bind(null, job.id, a.id, a.status !== "shortlisted")} label={a.status === "shortlisted" ? "הסרה מהרשימה הקצרה" : "לרשימה הקצרה ★"} />
          ) : null}
          <ActionButton variant="ghost" action={declineApp.bind(null, job.id, a.id)} label="לא מתאים" confirm="לסמן כלא מתאים? נשלח הודעה מנומסת." confirmLabel="סימון" />
        </div>
      ) : null}

      {job.status === "hired" && a.status !== "hired" && ["sent", "viewed", "shortlisted", "contacted", "not_selected"].includes(a.status) ? (
        extra?.status === "open" ? (
          <p className="rounded-xl bg-background p-3 text-sm">ביקשת לגייס גם את נותן/ת השירות הזה/ו. הצוות יחליט ויעדכן אתכם.</p>
        ) : extra?.status === "declined" ? (
          <p className="rounded-xl bg-background p-3 text-sm">הבקשה לגיוס נוסף לא אושרה.</p>
        ) : (
          <ActionButton action={requestExtraHire.bind(null, job.id, a.id)} label="בקשה לגייס גם אותו/ה"
            confirm="כבר בחרת נותן/ת שירות לעבודה הזו. צוות Joby יבדוק את הבקשה לגיוס נוסף ויעדכן את שניכם." confirmLabel="שליחת בקשה" />
        )
      ) : null}
    </PageShell>
  );
}
