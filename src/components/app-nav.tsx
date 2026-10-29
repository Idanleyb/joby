import { createClient } from "@/lib/supabase/server";
import { getMe, nextStep } from "@/lib/onboarding";
import { getMode } from "@/lib/mode";
import { getAdminRole } from "@/lib/admin";
import { NavLinks, type NavItem } from "@/components/nav-links";
import { IdleWatcher } from "@/components/idle-watcher";

/** Signed-in navigation for the current mode. Nothing for visitors or during onboarding. */
export async function AppNav() {
  let me;
  try {
    me = await getMe();
  } catch {
    return null;
  }
  if (!me || nextStep(me) !== "/account") return null;
  const mode = await getMode(me);
  const supabase = await createClient();
  const [{ count }, admin] = await Promise.all([
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", me.userId).eq("in_app", true).is("read_at", null),
    getAdminRole(me.userId),
  ]);

  const items: NavItem[] = mode === "work"
    ? [
        { href: "/home", label: "בית", icon: "home" },
        { href: "/jobs", label: "הזדמנויות", icon: "search", mobile: true },
        { href: "/proposals", label: "הצעות", icon: "inbox", mobile: true },
        { href: "/notifications", label: "התראות", icon: "bell", badge: count ?? 0, mobile: true },
        { href: "/profile", label: "פרופיל", icon: "user", mobile: true },
        { href: "/account", label: "חשבון", icon: "settings", mobile: true },
      ]
    : [
        { href: "/home", label: "בית", icon: "home" },
        { href: "/poster/jobs", label: "העבודות שלי", icon: "briefcase", mobile: true },
        { href: "/providers", label: "נותני שירות", icon: "users", mobile: true },
        { href: "/notifications", label: "התראות", icon: "bell", badge: count ?? 0, mobile: true },
        { href: "/profile", label: "פרופיל", icon: "user", mobile: true },
        { href: "/account", label: "חשבון", icon: "settings", mobile: true },
      ];
  // Admins and reviewers: the admin console in the sidebar (on phones it is in the header).
  if (admin) items.push({ href: "/admin", label: "ניהול", icon: "shield" });
  return (
    <>
      <NavLinks items={items} />
      <IdleWatcher />
    </>
  );
}
