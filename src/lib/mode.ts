import "server-only";
import { cookies } from "next/headers";
import type { Me } from "@/lib/onboarding";

/** Which side of the marketplace the menu shows: offering services ("work") or hiring ("hire"). */
export type Mode = "work" | "hire";
export const MODE_COOKIE = "joby_mode";

export async function getMode(me: Me): Promise<Mode> {
  const saved = (await cookies()).get(MODE_COOKIE)?.value;
  if (saved === "work" && me.isProvider) return "work";
  if (saved === "hire" && me.hasPosterProfile) return "hire";
  return me.isProvider ? "work" : "hire";
}
