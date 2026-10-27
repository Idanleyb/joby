import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadProviderView } from "@/lib/provider-view";
import { ProviderProfile } from "@/components/provider-profile";
import { Card } from "@/components/ui";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const p = /^[0-9a-f-]{36}$/.test(id) ? await loadProviderView(id) : null;
  return { title: p ? `${p.display_name} · Joby` : "Joby" };
}

export default async function ProviderPage({ params }: Props) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const p = await loadProviderView(id);
  if (!p) notFound();

  // CV: signed-in viewers only, when the provider allows it (storage policy enforces the same).
  let cvHref: string | null = null;
  if (p.cv_path && p.cv_visible) {
    const supabase = await createClient();
    const { data: claims } = await supabase.auth.getClaims();
    if (claims?.claims?.sub) {
      const { data } = await supabase.storage.from("cvs").createSignedUrl(p.cv_path, 300);
      cvHref = data?.signedUrl ?? null;
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <Card><ProviderProfile p={p} cvHref={cvHref} /></Card>
    </main>
  );
}
