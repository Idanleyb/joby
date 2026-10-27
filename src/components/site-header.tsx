import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export async function SiteHeader() {
  let signedIn = false;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    signedIn = Boolean(data?.claims?.sub);
  } catch {
    // Supabase not configured: render the header as signed out.
  }

  return (
    <header className="border-b border-border bg-surface/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="text-xl font-extrabold tracking-tight">
          Joby<span className="text-accent">.</span>
        </Link>
        <Link
          href={signedIn ? "/account" : "/login"}
          className="rounded-lg px-3 py-2 text-sm font-semibold hover:bg-background"
        >
          {signedIn ? "החשבון שלי" : "כניסה"}
        </Link>
      </div>
    </header>
  );
}
