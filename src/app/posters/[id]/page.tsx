import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadPosterView } from "@/lib/poster-view";
import { PosterProfile } from "@/components/poster-profile";
import { Card } from "@/components/ui";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const p = /^[0-9a-f-]{36}$/.test(id) ? await loadPosterView(id) : null;
  return { title: p ? `${p.display_name} · Joby` : "Joby" };
}

export default async function PosterPage({ params }: Props) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const p = await loadPosterView(id);
  if (!p) notFound();
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <Card><PosterProfile p={p} /></Card>
    </main>
  );
}
