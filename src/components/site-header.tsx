import Link from "next/link";
import { getMe, nextStep } from "@/lib/onboarding";
import { getMode } from "@/lib/mode";
import { RoleSwitch } from "@/components/role-switch";

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
    <header className="sticky top-0 z-20 border-b border-border bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-14 items-center justify-between gap-3 px-4">
        <Link href={ready ? "/home" : "/"} className="text-xl font-extrabold tracking-tight">
          Joby<span className="text-accent">.</span>
        </Link>
        {mode ? (
          <RoleSwitch mode={mode} />
        ) : (
          <nav className="flex items-center gap-1 text-sm font-semibold">
            <Link href="/how-it-works" className="hidden rounded-lg px-3 py-2 hover:bg-background sm:inline">איך זה עובד</Link>
            <Link href="/jobs" className="rounded-lg px-3 py-2 hover:bg-background">עבודות</Link>
            <Link href="/providers" className="rounded-lg px-3 py-2 hover:bg-background">נותני שירות</Link>
            <Link href={me ? "/onboarding" : "/login"} className="rounded-lg px-3 py-2 hover:bg-background">{me ? "המשך הרשמה" : "כניסה"}</Link>
          </nav>
        )}
      </div>
    </header>
  );
}
