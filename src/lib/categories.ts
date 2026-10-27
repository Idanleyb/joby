import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Active categories with their subcategories, in display order. */
export async function loadCategoryTree() {
  const supabase = await createClient();
  const [{ data: cats }, { data: subs }] = await Promise.all([
    supabase.from("categories").select("id, name_he").eq("active", true).order("sort_order"),
    supabase.from("subcategories").select("id, category_id, name_he").eq("active", true).order("sort_order"),
  ]);
  return (cats ?? []).map((c) => ({ ...c, subs: (subs ?? []).filter((s) => s.category_id === c.id) }));
}
