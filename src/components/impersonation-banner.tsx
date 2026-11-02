import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";
import { IMPERSONATION_COOKIE, parseImpersonation } from "@/lib/impersonation-cookie";
import { endImpersonation } from "@/app/impersonation-actions";

/** Red bar on every page while an admin is signed in as a user. */
export async function ImpersonationBanner() {
  const imp = parseImpersonation((await cookies()).get(IMPERSONATION_COOKIE)?.value);
  if (!imp) return null;
  let who = "משתמש";
  let by = "";
  try {
    const db = createServiceClient();
    const { data: log } = await db.from("admin_impersonations").select("admin_id, user_id").eq("id", imp.id).maybeSingle();
    if (log) {
      const { data: people } = await db.from("profiles").select("id, full_name").in("id", [log.admin_id, log.user_id]);
      who = people?.find((p) => p.id === log.user_id)?.full_name ?? who;
      by = people?.find((p) => p.id === log.admin_id)?.full_name ?? "";
    }
  } catch {
    // Banner still shows without names.
  }
  const until = new Date(imp.expires).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" });
  return (
    <div role="alert" className="sticky top-14 z-20 bg-danger text-white">
      <form action={endImpersonation} className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
        <span>
          <b>מצב ניהול:</b> את/ה מחובר/ת לחשבון של <bdi className="font-bold">{who}</bdi>{by ? <> (אדמין: <bdi>{by}</bdi>)</> : null}. כל פעולה נעשית בשמו/ה. מסתיים ב-{until}.
        </span>
        <button type="submit" className="rounded-lg bg-white px-3 py-1 font-semibold text-foreground">יציאה מהחשבון</button>
      </form>
    </div>
  );
}
