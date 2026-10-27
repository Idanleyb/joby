import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePoster } from "@/lib/poster";
import { PageShell } from "@/components/ui";
import { PosterEditForm } from "./poster-edit-form";

export const metadata: Metadata = { title: "עריכת פרופיל מפרסם · Joby" };

export default async function PosterEditPage() {
  const me = await requirePoster("/profile/edit");
  const supabase = await createClient();
  const { data: p } = await supabase.from("poster_profiles").select("poster_type, company_name, city, website, about").eq("user_id", me.userId).maybeSingle();
  if (!p) redirect("/onboarding/poster");
  return (
    <PageShell title="עריכת פרופיל מפרסם" subtitle="כך נותני השירות רואים אותך כשהם בוחרים אם להגיש מועמדות.">
      <PosterEditForm userId={me.userId} p={p} />
    </PageShell>
  );
}
