"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { unreadCount } from "@/app/notifications/actions";
import { cx } from "@/components/ui";
import { IconBell, IconBriefcase, IconHome, IconInbox, IconSearch, IconSettings, IconShieldCheck, IconUser, IconUsers } from "@/components/icons";

export type NavItem = { href: string; label: string; icon: "home" | "search" | "inbox" | "bell" | "user" | "settings" | "briefcase" | "users" | "shield"; badge?: number; mobile?: boolean };

const ICONS = { home: IconHome, search: IconSearch, inbox: IconInbox, bell: IconBell, user: IconUser, settings: IconSettings, briefcase: IconBriefcase, users: IconUsers, shield: IconShieldCheck };

function isActive(path: string, href: string) {
  if (href === "/jobs") return path === "/jobs" || (path.startsWith("/jobs/") && path !== "/jobs/new");
  return path === href || path.startsWith(`${href}/`);
}

function Badge({ n }: { n?: number }) {
  if (!n) return null;
  return <span className="absolute -top-1 -end-2 min-w-5 rounded-full bg-danger px-1 text-center text-[11px] font-bold leading-5 text-white">{n > 99 ? "99+" : n}</span>;
}

/** Sidebar (computer) and bottom bar (phone). */
export function NavLinks({ items }: { items: NavItem[] }) {
  const path = usePathname();
  // The layout is not re-rendered on client navigation, so refresh the bell count here.
  const [unread, setUnread] = useState<number | null>(null);
  useEffect(() => {
    let live = true;
    unreadCount().then((n) => live && setUnread(n)).catch(() => {});
    return () => { live = false; };
  }, [path]);
  items = items.map((it) => (it.icon === "bell" && unread != null ? { ...it, badge: unread } : it));
  return (
    <>
      <nav aria-label="תפריט" className="sticky top-0 hidden h-[calc(100dvh-3.5rem)] w-56 shrink-0 flex-col gap-1 border-e border-border bg-surface p-3 md:flex">
        {items.map((it) => {
          const Icon = ICONS[it.icon];
          const on = isActive(path, it.href);
          return (
            <Link prefetch={false} key={it.href} href={it.href} aria-current={on ? "page" : undefined}
              className={cx("flex items-center gap-3 rounded-xl px-3 py-2.5 font-semibold", on ? "bg-brand text-brand-contrast" : "text-muted hover:bg-background")}>
              <span className="relative"><Icon /><Badge n={it.badge} /></span>
              {it.label}
            </Link>
          );
        })}
        <Link prefetch={false} href="/how-it-works" className="mt-auto rounded-xl px-3 py-2.5 text-sm text-muted hover:bg-background">איך Joby עובד?</Link>
      </nav>
      <nav aria-label="תפריט ראשי" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
        {items.filter((it) => it.mobile).map((it) => {
          const Icon = ICONS[it.icon];
          const on = isActive(path, it.href);
          return (
            <Link prefetch={false} key={it.href} href={it.href} aria-current={on ? "page" : undefined}
              className={cx("flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold", on ? "font-bold text-foreground" : "text-muted")}>
              <span className="relative"><Icon /><Badge n={it.badge} /></span>
              {it.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
