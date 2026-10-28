import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { IDLE_MS, LAST_ACTIVE_COOKIE } from "@/lib/idle";

/**
 * Refreshes the Supabase session cookie on every request (called from src/proxy.ts),
 * and signs the user out after IDLE_MS without activity (see src/lib/idle.ts).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  // Missing configuration must never take the whole site down: pages show the problem instead.
  if (!url || !key) return response;

  try {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
        },
      },
    });

    // Do not add code between client creation and getClaims(): it refreshes the token.
    const { data } = await supabase.auth.getClaims();
    const signedIn = Boolean(data?.claims?.sub);
    const now = Date.now();
    const last = Number(request.cookies.get(LAST_ACTIVE_COOKIE)?.value);
    const prefetch = request.headers.get("next-router-prefetch") === "1" || request.headers.get("purpose") === "prefetch";

    if (signedIn && Number.isFinite(last) && last > 0 && now - last > IDLE_MS) {
      await supabase.auth.signOut({ scope: "local" }); // clears the session cookies via setAll
      response.cookies.delete(LAST_ACTIVE_COOKIE);
      const isPage = request.method === "GET" && !request.headers.get("next-action") && !request.nextUrl.pathname.startsWith("/auth/");
      if (isPage) {
        const to = request.nextUrl.clone();
        to.pathname = "/login";
        to.search = "";
        to.searchParams.set("reason", "idle");
        const path = request.nextUrl.pathname + request.nextUrl.search;
        if (path !== "/" && !path.startsWith("/login")) to.searchParams.set("next", path);
        const redirect = NextResponse.redirect(to);
        response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
        return redirect;
      }
    } else if (signedIn && !prefetch) {
      response.cookies.set(LAST_ACTIVE_COOKIE, String(now), { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 30 });
    } else if (!signedIn && request.cookies.has(LAST_ACTIVE_COOKIE)) {
      response.cookies.delete(LAST_ACTIVE_COOKIE);
    }
  } catch (error) {
    console.error("Session refresh failed", error);
  }
  return response;
}
