"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getMe } from "@/lib/onboarding";
import { MODE_COOKIE, type Mode } from "@/lib/mode";

/** Switch between offering services and hiring. Sends users without that role to set it up. */
export async function switchMode(mode: Mode) {
  const me = await getMe();
  if (!me) redirect("/login");
  if (mode === "hire" && !me.hasPosterProfile) redirect("/onboarding/poster");
  if (mode === "work" && !me.isProvider) redirect("/account#provider");
  (await cookies()).set(MODE_COOKIE, mode, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", httpOnly: true });
  revalidatePath("/", "layout");
  redirect("/home");
}
