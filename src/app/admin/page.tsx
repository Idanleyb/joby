import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { hoursSince } from "@/lib/admin";
import { Card } from "@/components/ui";

export default async function AdminHome() {
  const supabase = await createClient();
  const [{ data: queue }, { count: providers }, { count: posters }, { count: held }, { count: extras }, { count: openJobs }] = await Promise.all([
    supabase.from("verification_requests").select("submitted_at, kind").eq("status", "pending").order("submitted_at"),
    supabase.from("provider_profiles").select("*", { count: "exact", head: true }).eq("verification_status", "approved"),
    supabase.from("poster_profiles").select("*", { count: "exact", head: true }),
    supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "held"),
    supabase.from("extra_hire_requests").select("*", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "open"),
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
    </div>
  );
}
