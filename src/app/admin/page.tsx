import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { hoursSince } from "@/lib/admin";
import { Card, DemoBadge } from "@/components/ui";
import { ActionButton } from "@/components/action-button";
import { requireAdmin } from "@/lib/admin";
import { purgeDemo } from "./demo-actions";

export default async function AdminHome() {
  const supabase = await createClient();
  const { role } = await requireAdmin();
  const [{ data: queue }, { count: providers }, { count: posters }, { count: held }, { count: extras }, { count: openJobs }, { count: demoUsers }, { count: demoJobs }] = await Promise.all([
    supabase.from("verification_requests").select("submitted_at, kind").eq("status", "pending").order("submitted_at"),
    supabase.from("provider_profiles").select("*", { count: "exact", head: true }).eq("verification_status", "approved"),
    supabase.from("poster_profiles").select("*", { count: "exact", head: true }),
    supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "held"),
    supabase.from("extra_hire_requests").select("*", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_demo", true),
    supabase.from("jobs").select("*", { count: "exact", head: true }).eq("is_demo", true),
  ]);
  const oldest = queue?.[0] ? hoursSince(queue[0].submitted_at) : null;
  const tiles = [
    { label: "אימותים ממתינים", value: queue?.length ?? 0, sub: oldest != null ? `הוותיק: ${oldest} שעות` : "התור ריק", warn: (oldest ?? 0) >= 20, href: "/admin/verifications" },
    { label: "נותני שירות מאומתים", value: providers ?? 0 },
    { label: "מפרסמים", value: posters ?? 0 },
    { label: "עבודות בבדיקה", value: held ?? 0, warn: (held ?? 0) > 0, href: "/admin/jobs" },
    { label: "בקשות לגיוס נוסף", value: extras ?? 0, warn: (extras ?? 0) > 0, href: "/admin/extra-hires" },
    { label: "עבודות פתוחות", value: openJobs ?? 0 },
  ];
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-[26px] font-bold">לוח בקרה</h1>
      <div className="grid gap-3 sm:grid-cols-3">
        {tiles.map((t) => {
          const body = (
            <Card className={t.warn ? "border-foreground" : ""}>
              <p className="text-sm text-muted">{t.label}</p>
              <p className="text-2xl font-bold">{t.value}</p>
              {t.sub ? <p className={t.warn ? "text-sm font-semibold text-danger" : "text-sm text-muted"}>{t.sub}</p> : null}
            </Card>
          );
          return t.href ? <Link key={t.label} href={t.href}>{body}</Link> : <div key={t.label}>{body}</div>;
        })}
      </div>
      {demoUsers ? (
        <Card className="flex flex-col gap-3 border-dashed border-foreground/40">
          <div className="flex items-center gap-2"><DemoBadge /><h2 className="font-bold">נתוני דמו טעונים</h2></div>
          <p className="text-sm text-muted">{demoUsers} חשבונות דמו ו-{demoJobs ?? 0} עבודות דמו, כולל מועמדויות, פניות, משובים וקרדיטים. הם מסומנים ״דמו״ בכל מקום ולא מתערבבים עם משתמשים אמיתיים. לפני ההשקה מסירים אותם.</p>
          {role === "admin" ? (
            <ActionButton action={purgeDemo} label="הסרת כל נתוני הדמו" pendingLabel="מסירים…"
              confirm="להסיר את כל חשבונות הדמו וכל מה שקשור אליהם? אי אפשר לבטל. (אפשר לטעון מחדש מהקובץ load_demo.sql)" confirmLabel="הסרה" />
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}
