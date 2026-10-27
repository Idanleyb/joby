"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { appErrorMessage } from "@/lib/errors";
import { advanceFrom } from "../actions";

export type CardState = { error?: string; ok?: number };

export async function addServiceCard(prev: CardState, form: FormData): Promise<CardState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const title = String(form.get("title") ?? "").trim();
  const sub = Number(form.get("sub"));
  const description = String(form.get("description") ?? "").trim().slice(0, 300);
  const quote = form.get("quote") === "on";
  const price = Number(String(form.get("price") ?? "").replace(/\D/g, ""));
  const unit = String(form.get("unit") ?? "job");
  const mode = String(form.get("mode") ?? "onsite");
  if (title.length < 2 || title.length > 60) return { error: "שם שירות של 2 עד 60 תווים." };
  if (!Number.isInteger(sub) || sub <= 0) return { error: "יש לבחור תחום." };
  if (!quote && (!price || price > 1_000_000)) return { error: "יש להזין מחיר התחלתי או לבחור ״הצעת מחיר״." };
  if (!["job", "hour", "day", "project"].includes(unit) || !["onsite", "remote", "both"].includes(mode)) return { error: "ערך לא תקין." };
  const { error } = await supabase.from("service_cards").insert({
    provider_id: user.id,
    title,
    subcategory_id: sub,
    description: description || null,
    price_from: quote ? null : price,
    unit: unit as "job",
    mode: mode as "onsite",
  });
  if (error) return { error: appErrorMessage(error) };
  revalidatePath("/provider/onboarding/services");
  return { ok: (prev.ok ?? 0) + 1 };
}

export async function deleteServiceCard(id: string) {
  const supabase = await createClient();
  await supabase.from("service_cards").delete().eq("id", id);
  revalidatePath("/provider/onboarding/services");
}

export async function finishServices() {
  await advanceFrom(6);
}
