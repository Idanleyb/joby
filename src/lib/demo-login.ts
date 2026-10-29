import "server-only";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * One-click sign-in to the four demo accounts (founder, 2026-10-29), so anyone can see the
 * product from the inside without an SMS. Shown only while demo data is loaded, and can be
 * switched off with DEMO_LOGIN=off. Demo accounts can never reach real users (database rules).
 */
export const DEMO_HEROES = [
  { phone: "+972500000101", key: "yossi", role: "מילואימניק, חשמלאי", sees: "הצעות, פנייה ישירה שממתינה לו, משובים, קרדיטים" },
  { phone: "+972500000102", key: "noa", role: "בת זוג של מילואימניק, מאיירת", sees: "פרופיל בת זוג, הזדמנויות והצעות" },
  { phone: "+972500000103", key: "avi", role: "מפרסם פרטי", sees: "עבודה עם 4 מועמדים, גיוס, פניות שנשלחו" },
  { phone: "+972500000104", key: "lumen", role: "מגייסת (HR)", sees: "עבודות של חברה, משוב שממתין" },
] as const;

export type DemoAccount = { key: string; name: string; role: string; sees: string };

export function demoLoginEnabled() {
  return process.env.DEMO_LOGIN !== "off" && Boolean(process.env.SUPABASE_SECRET_KEY);
}

/** The demo sign-in accounts that exist right now (empty when no demo data is loaded). */
export async function listDemoAccounts(): Promise<DemoAccount[]> {
  if (!demoLoginEnabled()) return [];
  try {
    const { data } = await createServiceClient().from("profiles").select("phone, full_name")
      .eq("is_demo", true).in("phone", DEMO_HEROES.map((h) => h.phone));
    return DEMO_HEROES.flatMap((h) => {
      const row = data?.find((d) => d.phone === h.phone);
      return row ? [{ key: h.key, name: row.full_name ?? h.key, role: h.role, sees: h.sees }] : [];
    });
  } catch {
    return [];
  }
}

/**
 * A one-time sign-in token for that demo account (no email or SMS is sent): the demo account
 * gets a placeholder confirmed email, and the server asks the auth service for a magic-link token.
 */
export async function demoSignInToken(key: string): Promise<string | null> {
  const hero = DEMO_HEROES.find((h) => h.key === key);
  if (!hero || !demoLoginEnabled()) return null;
  const admin = createServiceClient();
  const { data: profile } = await admin.from("profiles").select("id, is_demo").eq("phone", hero.phone).maybeSingle();
  if (!profile?.is_demo) return null;
  const email = `demo-${hero.key}@demo.joby.invalid`;
  const { data: user } = await admin.auth.admin.getUserById(profile.id);
  if (!user.user) return null;
  if (user.user.email !== email) {
    const { error } = await admin.auth.admin.updateUserById(profile.id, { email, email_confirm: true });
    if (error) return null;
  }
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error) return null;
  return data.properties?.hashed_token ?? null;
}
