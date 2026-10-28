import Link from "next/link";
import { getMe, nextStep } from "@/lib/onboarding";
import { getMode } from "@/lib/mode";
import { RoleSwitch } from "@/components/role-switch";
import { DemoBadge } from "@/components/ui";

export async function SiteHeader() {
  let me = null;
  try {
    me = await getMe();
  } catch {
    // Supabase not configured: render the header as signed out.
  }
  const ready = me && nextStep(me) === "/account";
  const mode = ready ? await getMode(me!) : null;

  return (
    <header className="sticky top-0 z-20 bg-brand text-brand-contrast">
      <div className="mx-auto flex h-14 items-center justify-between gap-3 px-4">
        <div className="flex items-center gap-2">
          <Link href={ready ? "/home" : "/"} className="flex items-center gap-2 font-display text-xl font-bold">
            <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-lg bg-surface text-lg text-foreground">J</span>
            Joby
          </Link>
          {me?.isDemo ? <span className="flex items-center gap-1 text-xs"><DemoBadge />חשבון דמו</span> : null}
        </div>
        {mode ? (
          <RoleSwitch mode={mode} />
        ) : (
          <nav className="flex items-center gap-1 text-sm font-semibold">
            <Link href="/how-it-works" className="hidden rounded-lg px-3 py-2 hover:bg-white/10 sm:inline">איך זה עובד</Link>
            <Link href="/jobs" className="rounded-lg px-3 py-2 hover:bg-white/10">עבודות</Link>
            <Link href="/providers" className="rounded-lg px-3 py-2 hover:bg-white/10">נותני שירות</Link>
            <Link href={me ? "/onboarding" : "/login"} className="rounded-lg px-3 py-2 hover:bg-white/10">{me ? "המשך הרשמה" : "כניסה"}</Link>
          </nav>
        )}
      </div>
    </header>
  );
}
