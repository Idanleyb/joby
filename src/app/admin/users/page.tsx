import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, VER_LABEL } from "@/lib/admin";
import { formatIlPhone } from "@/lib/phone";
import { Card, DemoBadge, Input } from "@/components/ui";


/** Admin: find an account by name, phone, email or id (founder, 2026-11-02). */
export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { role } = await requireAdmin();
  if (role !== "admin") redirect("/admin");
  const q = ((await searchParams).q ?? "").trim();
  const supabase = await createClient();
  const { data: users } = await supabase.rpc("admin_search_users", { p_query: q, p_limit: 100 });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-[26px] font-bold">משתמשים</h1>
      <form className="flex gap-2" role="search">
        <Input name="q" defaultValue={q} placeholder="שם, טלפון, מייל או מזהה" aria-label="חיפוש משתמש" />
        <button type="submit" className="min-h-12 shrink-0 rounded-xl bg-brand px-5 font-semibold text-brand-contrast">חיפוש</button>
      </form>
      <p className="text-sm text-muted">{q ? `${users?.length ?? 0} תוצאות` : "המשתמשים האחרונים שנרשמו"} (עד 100)</p>
      <ul className="flex flex-col gap-2">
        {(users ?? []).map((u) => (
          <li key={u.id}>
            <Link prefetch={false} href={`/admin/users/${u.id}`}>
              <Card className="flex flex-wrap items-center gap-x-4 gap-y-1 p-4 hover:border-foreground sm:p-4">
                <span className="flex min-w-0 flex-1 items-center gap-2 font-semibold">
                  <bdi>{u.full_name ?? "ללא שם"}</bdi>
                  {u.is_demo ? <DemoBadge /> : null}
                  {u.is_admin ? <span className="rounded-md bg-info px-1.5 text-xs">אדמין</span> : null}
                  {u.status === "suspended" ? <span className="rounded-md bg-danger-bg px-1.5 text-xs text-danger">מושעה</span> : null}
                </span>
                <span dir="ltr" className="text-sm text-muted">{u.phone ? formatIlPhone(u.phone) : "—"}</span>
                <span dir="ltr" className="text-sm text-muted">{u.email ?? "—"}</span>
                <span className="w-full text-xs text-muted">
                  {[u.is_provider ? `נותן/ת שירות${u.verification_status ? ` · ${VER_LABEL[u.verification_status]}` : ""}` : null,
                    u.is_poster ? "מגייס/ת" : null,
                    u.balance != null ? `${u.balance} קרדיטים` : null].filter(Boolean).join(" · ") || "בלי תפקיד"}
                </span>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
