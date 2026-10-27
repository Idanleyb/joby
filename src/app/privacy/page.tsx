import type { Metadata } from "next";
import { PageShell } from "@/components/ui";

export const metadata: Metadata = { title: "מדיניות פרטיות · Joby" };

// Placeholder: the final text is written with a lawyer before the beta (PRD §11).
export default function Page() {
  return (
    <PageShell title="מדיניות פרטיות" subtitle="טיוטה — הנוסח המלא יפורסם לפני פתיחת הבטא.">
      <p className="text-muted">לשאלות בינתיים אפשר לפנות לתמיכה ב-WhatsApp או במייל.</p>
    </PageShell>
  );
}
