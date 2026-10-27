import Link from "next/link";
import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/admin";

export const metadata = { title: "ניהול · Joby", robots: { index: false } };

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { role } = await requireAdmin();
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6">
      <nav className="flex flex-wrap items-center gap-4 border-b border-border pb-3 text-sm font-semibold">
        <Link href="/admin">לוח בקרה</Link>
        <Link href="/admin/verifications">אימותים</Link>
        <Link href="/admin/jobs">עבודות בבדיקה</Link>
        <Link href="/admin/extra-hires">גיוס נוסף</Link>
        <span className="ms-auto text-xs font-normal text-muted">{role === "admin" ? "Admin" : "Reviewer"}</span>
      </nav>
      {children}
    </div>
  );
}
