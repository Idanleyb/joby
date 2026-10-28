import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getMe, nextStep } from "@/lib/onboarding";
import { loadFeedbackDue } from "@/lib/feedback";
import { PageShell } from "@/components/ui";
import { FeedbackForm } from "./feedback-form";

export const metadata: Metadata = { title: "משוב · Joby" };

export default async function FeedbackFormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getMe();
  if (!me) redirect(`/login?next=/feedback/${id}`);
  if (nextStep(me) !== "/account") redirect(nextStep(me));
  const items = await loadFeedbackDue(me.userId);
  const item = items.find((i) => i.engagementId === id);
  if (!item) {
    if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
    return (
      <PageShell title="משוב">
        <p className="rounded-2xl bg-background p-5 text-sm">המשוב על העבודה הזו כבר נשלח, או שהעבודה בוטלה. <Link href="/feedback" className="underline">לכל המשובים</Link></p>
      </PageShell>
    );
  }
  return (
    <PageShell title={item.title} subtitle={<>משוב על <Link href={item.iAmPoster ? `/providers/${item.otherId}` : `/posters/${item.otherId}`} className="underline"><bdi>{item.otherName}</bdi></Link></>}>
      <FeedbackForm engagementId={id} iAmPoster={item.iAmPoster} otherName={item.otherName} allowNotYet={item.remindersSent < 2} />
    </PageShell>
  );
}
