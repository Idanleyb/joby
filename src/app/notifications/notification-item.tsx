"use client";

import Link from "next/link";
import { useTransition } from "react";
import { markRead } from "./actions";
import { cx } from "@/components/ui";

export function NotificationItem({ id, icon, text, href, when, unread }: { id: number; icon: string; text: string; href?: string; when: string; unread: boolean }) {
  const [, start] = useTransition();
  const body = (
    <div className={cx("flex items-start gap-3 p-4", unread && "bg-accent/10")}>
      <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-background">{icon}</span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className={cx("text-sm", unread && "font-bold")}>{text}</span>
        <span className="text-xs text-muted">{when}</span>
      </div>
      {unread ? <span className="mt-2 size-2 shrink-0 rounded-full bg-accent" aria-label="לא נקרא" /> : null}
    </div>
  );
  const onOpen = () => unread && start(() => markRead(id));
  return href ? <Link href={href} onClick={onOpen} className="block hover:bg-background">{body}</Link> : <div onClick={onOpen}>{body}</div>;
}
