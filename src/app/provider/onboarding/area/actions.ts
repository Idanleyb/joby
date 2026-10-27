"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { advanceFrom } from "../actions";

export type AreaState = { error?: string; values?: { onsite: boolean; remote: boolean; city: string; radius: string } };

export async function saveArea(_prev: AreaState, form: FormData): Promise<AreaState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const onsite = form.get("onsite") === "on";
  const remote = form.get("remote") === "on";
  const city = String(form.get("city") ?? "").trim().slice(0, 80);
  const radius = String(form.get("radius") ?? "25");
  const values = { onsite, remote, city, radius };
  if (!onsite && !remote) return { error: "יש לבחור לפחות אחת מהאפשרויות.", values };
  if (onsite && city.length < 2) return { error: "יש להזין עיר.", values };
  await supabase
    .from("provider_profiles")
    .update({
      works_onsite: onsite,
      works_remote: remote,
      city: onsite ? city : city || null,
      radius_km: onsite && ["10", "25", "50"].includes(radius) ? Number(radius) : null,
    })
    .eq("user_id", user.id);
  await advanceFrom(4);
  return {};
}
