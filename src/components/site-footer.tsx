import Link from "next/link";

/** Small footer on every page: legal and help links (PRD §10 public pages). */
export function SiteFooter() {
  const links: [string, string][] = [["/how-it-works", "איך Joby עובד"], ["/terms", "תנאי שימוש"], ["/privacy", "מדיניות פרטיות"]];
  return (
    <footer className="border-t border-border px-4 py-6 text-sm text-muted">
      <nav aria-label="קישורים כלליים" className="mx-auto flex max-w-2xl flex-wrap items-center justify-center gap-x-4 gap-y-2">
        {links.map(([href, label]) => (
          <Link key={href} prefetch={false} href={href} className="underline-offset-4 hover:underline">{label}</Link>
        ))}
        <span>© {new Date().getFullYear()} Joby</span>
      </nav>
    </footer>
  );
}
