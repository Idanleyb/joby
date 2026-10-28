import { budgetText, placeText, TIMELINE_LABEL } from "@/lib/jobs";

export const REQUEST_STATUS: Record<string, string> = { pending: "ממתינה לתשובה", approved: "אושרה ✓", declined: "נדחתה", expired: "פג תוקף" };

export type RequestBrief = {
  title: string; description: string; mode: string; city: string | null; budget_type: string; budget_min: number | null;
  budget_max: number | null; timeline: string;
};

/** The brief of a direct request, as both sides see it. */
export function RequestBriefView({ r }: { r: RequestBrief }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="whitespace-pre-line text-sm leading-relaxed">{r.description}</p>
      <dl className="grid grid-cols-3 gap-2 rounded-xl bg-background p-3 text-xs">
        <div><dt className="text-muted">תקציב</dt><dd className="font-bold">{budgetText(r)}</dd></div>
        <div><dt className="text-muted">איפה</dt><dd className="font-semibold">{placeText(r)}</dd></div>
        <div><dt className="text-muted">מתי</dt><dd className="font-semibold">{TIMELINE_LABEL[r.timeline]}</dd></div>
      </dl>
    </div>
  );
}
