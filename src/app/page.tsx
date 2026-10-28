import Link from "next/link";
import { redirect } from "next/navigation";
import { getMe, nextStep } from "@/lib/onboarding";
import { createClient } from "@/lib/supabase/server";

// Temporary home page: proves the app is live and connected to the database.
// Replaced by the real landing page in a later step.
export const dynamic = "force-dynamic";

async function getCategories() {
  const missing = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"].filter((k) => !process.env[k]);
  if (missing.length) return { ok: false as const, error: `missing environment variables: ${missing.join(", ")}` };
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("categories")
      .select("slug, name_he")
      .eq("active", true)
      .order("sort_order");
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, categories: data };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "unknown" };
  }
}

export default async function Home() {
  const result = await getCategories();
  if (result.ok) {
    const me = await getMe().catch(() => null);
    if (me && nextStep(me) === "/account") redirect("/home");
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-10 px-4 py-12 sm:px-6">
      <header className="flex flex-col gap-4">
        <span className="text-sm font-semibold tracking-wide text-accent-strong">בטא סגורה · ינואר 2027</span>
        <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">המרקטפלייס של המילואים</h1>
        <p className="text-lg text-muted">
          מילואימניקים מאומתים ובני ובנות הזוג שלהם מציעים שירותים — מאינסטלציה ועד פיתוח תוכנה. כל אחד יכול
          לפרסם עבודה.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/jobs" className="rounded-lg bg-brand px-5 py-3 font-semibold text-brand-contrast">מצאו עבודה</Link>
          <Link href="/providers" className="rounded-lg border border-border bg-surface px-5 py-3 font-semibold">גייסו מילואימניק</Link>
          <Link href="/how-it-works" className="rounded-lg px-5 py-3 font-semibold underline underline-offset-4">איך זה עובד?</Link>
        </div>
      </header>

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold text-muted">חיבור למסד הנתונים</h2>
        {result.ok ? (
          <ul className="flex flex-wrap gap-2">
            {result.categories.map((c) => (
              <li key={c.slug} className="rounded-full bg-background px-3 py-1 text-sm">
                {c.name_he}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted" dir="ltr">
            Not connected: {result.error}. Check .env.local (see README).
          </p>
        )}
      </section>
    </main>
  );
}
