import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { APP_STATUS_LABEL, JOB_STATUS_LABEL } from "@/lib/jobs";
import { ApplyCostNote, JobDetails } from "@/components/job-view";
import { Card } from "@/components/ui";
import { ApplyForm } from "./apply-form";
import { SaveButton } from "../save-button";

export const metadata: Metadata = { title: "עבודה · Joby" };

const linkBtn = "inline-flex min-h-12 items-center justify-center rounded-xl bg-brand px-5 font-semibold text-brand-contrast";
const note = "rounded-xl bg-background p-4 text-sm";

export default async function JobPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ applied?: string }> }) {
  const { id } = await params;
  const { applied } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: job } = await supabase
    .from("jobs")
    .select("id, poster_id, title, description, skills, mode, city, budget_type, budget_min, budget_max, timeline, start_date, published_at, expires_at, application_count, status, attachment_paths, on_behalf_name, sub:subcategories(name_he), poster:poster_profiles(display_name, poster_type, jobs_posted, jobs_closed, hires, rating_avg, rating_count)")
    .eq("id", id).maybeSingle();
  if (!job) notFound();

  const uid = user?.id;
  const [{ data: provider }, { data: myApp }, { data: wallet }, { data: cards }, { data: cost }, { data: saved }] = await Promise.all([
    uid ? supabase.from("provider_profiles").select("verification_status").eq("user_id", uid).maybeSingle() : Promise.resolve({ data: null }),
    uid ? supabase.from("applications").select("status, sent_at").eq("job_id", id).eq("provider_id", uid).maybeSingle() : Promise.resolve({ data: null }),
    uid ? supabase.from("provider_wallets").select("balance").eq("provider_id", uid).maybeSingle() : Promise.resolve({ data: null }),
    uid ? supabase.from("service_cards").select("id, title").eq("provider_id", uid) : Promise.resolve({ data: [] as { id: string; title: string }[] }),
    supabase.from("app_settings").select("value").eq("key", "apply_cost").maybeSingle(),
    uid ? supabase.from("job_saves").select("job_id").eq("user_id", uid).eq("job_id", id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const applyCost = Number(cost?.value ?? 10);
  const balance = wallet?.balance ?? 0;
  const open = job.status === "open" && new Date(job.expires_at) > new Date();

  const attachments = uid && job.attachment_paths.length
    ? (await supabase.storage.from("job-attachments").createSignedUrls(job.attachment_paths, 3600)).data ?? []
    : [];

  let cta: React.ReactNode;
  if (!uid) cta = <Link href={`/login?next=/jobs/${id}`} className={linkBtn}>כניסה כדי להגיש מועמדות</Link>;
  else if (job.poster_id === uid) cta = <Link href={`/poster/jobs/${id}`} className={linkBtn}>זו העבודה שלך · למועמדים</Link>;
  else if (myApp) cta = (
    <p className={note}>{applied ? "המועמדות נשלחה ✓ נעדכן אותך כשהמפרסם יגיב. " : ""}סטטוס המועמדות שלך: <b>{APP_STATUS_LABEL[myApp.status]}</b> · <Link href="/proposals" className="underline">ההצעות שלי</Link></p>
  );
  else if (!open) cta = <p className={note}>העבודה כבר לא פתוחה להגשות ({JOB_STATUS_LABEL[job.status] ?? "נסגרה"}).</p>;
  else if (!provider) cta = <p className={note}>רק מילואימניקים מאומתים ובני/בנות זוגם יכולים להגיש מועמדות. <Link href="/account" className="underline">הצטרפות כנותן/ת שירות</Link></p>;
  else if (provider.verification_status !== "approved") cta = <p className={note}>אפשר להגיש מועמדות אחרי שהאימות יאושר. <Link href="/account" className="underline">מצב האימות</Link></p>;
  else if (balance < applyCost) cta = <p className={note}>אין מספיק קרדיטים להגשה (צריך {applyCost}, יש {balance}). <Link href="/provider/credits" className="underline">הקרדיטים שלי</Link></p>;
  else cta = <ApplyForm jobId={id} cost={applyCost} balance={balance} cards={cards ?? []} />;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-8">
      <div className="flex items-center justify-between">
        <Link href="/jobs" className="text-sm text-muted hover:underline">→ לכל העבודות</Link>
        {uid && job.poster_id !== uid ? <SaveButton jobId={id} saved={Boolean(saved)} /> : null}
      </div>
      <Card>
        <JobDetails job={{ ...job, subName: job.sub?.name_he ?? "", onBehalfName: job.on_behalf_name }} />
        {job.poster_id && job.poster ? <Link href={`/posters/${job.poster_id}`} className="mt-3 inline-block text-sm underline underline-offset-4">לפרופיל המפרסם</Link> : null}
        {attachments.length ? (
          <div className="mt-4 flex flex-col gap-1">
            <h2 className="text-sm font-semibold">קבצים מצורפים</h2>
            {attachments.map((a, i) => a.signedUrl ? (
              <a key={a.path ?? i} href={a.signedUrl} target="_blank" rel="noopener noreferrer" className="text-sm underline underline-offset-4">קובץ {i + 1}</a>
            ) : null)}
          </div>
        ) : uid ? null : job.attachment_paths.length ? <p className="mt-3 text-sm text-muted">יש קבצים מצורפים — גלויים למשתמשים מחוברים.</p> : null}
      </Card>
      {cta}
      {job.poster_id !== uid && open ? <ApplyCostNote cost={applyCost} className="text-center" /> : null}
    </main>
  );
}
