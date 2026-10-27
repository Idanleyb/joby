"use server";

import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { aiAvailable, aiErrorCode, AiError, type DocInput } from "@/lib/ai/client";
import { isValidIsraeliId, readForm3010 } from "@/lib/ai/form3010";
import { countReserveDays, type Period } from "@/lib/reserve-days";
import { hashIdNumber, sign, verify } from "@/lib/signing";
import { appErrorMessage } from "@/lib/errors";
import { advanceFrom } from "../actions";

const BUCKET = "verification-docs";

async function currentUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user.id;
}

function checkPaths(userId: string, paths: string[]) {
  if (!Array.isArray(paths) || paths.length < 1 || paths.length > 15) throw new Error("invalid_file_count");
  for (const p of paths) if (typeof p !== "string" || !p.startsWith(`${userId}/`) || p.includes("..")) throw new Error("bad_path");
}

export type FileReading = { name: string; ok: boolean; kind: string; fullName: string | null; periods: Period[]; reportedDays: number | null; note: string };
export type Analysis =
  | { mode: "ai"; token: string; days: number; files: FileReading[]; warnings: string[]; idFound: boolean; multipleIds: boolean }
  | { mode: "manual"; reason: "ai_unavailable" | "ai_failed"; code: string };

type Signed = { userId: string; paths: string[]; days: number; idHash: string | null; files: FileReading[]; warnings: string[] };

/** Reads the uploaded Form 3010 files with AI and returns a signed summary for confirmation. */
export async function analyzeForms(paths: string[]): Promise<Analysis> {
  const userId = await currentUserId();
  checkPaths(userId, paths);
  if (!aiAvailable()) return { mode: "manual", reason: "ai_unavailable", code: "AI-NOKEY" };

  const admin = createServiceClient();
  try {
    const docs: DocInput[] = await Promise.all(
      paths.map(async (path) => {
        const { data, error } = await admin.storage.from(BUCKET).download(path);
        if (error || !data) throw new AiError("AI-DL", error?.message);
        return { bytes: Buffer.from(await data.arrayBuffer()), mediaType: data.type || "application/pdf", name: path.split("/").pop()! };
      }),
    );
    const readings = [];
    for (let i = 0; i < docs.length; i += 3) readings.push(...(await Promise.all(docs.slice(i, i + 3).map(readForm3010))));

    const files: FileReading[] = readings.map((r, i) => ({
      name: docs[i].name.replace(/^\d+-\d+-/, ""),
      ok: r.readable && r.document_kind !== "other",
      kind: r.document_kind,
      fullName: r.full_name,
      periods: r.periods,
      reportedDays: r.reported_total_days,
      note: r.notes,
    }));
    const valid = readings.filter((r) => r.readable && r.document_kind !== "other");
    const counted = countReserveDays(valid.flatMap((r) => r.periods));
    // A cumulative confirmation may print only a total: use it when no periods were readable.
    const reportedOnly = valid.filter((r) => r.periods.length === 0 && r.reported_total_days).reduce((s, r) => s + r.reported_total_days!, 0);
    const days = counted.days + reportedOnly;
    const warnings = [...counted.warnings, ...(reportedOnly ? ["used_reported_total"] : [])];

    const ids = [...new Set(valid.map((r) => r.id_number).filter((x): x is string => Boolean(x && isValidIsraeliId(x))))];
    const idHash = ids.length === 1 ? hashIdNumber(ids[0]) : null;

    const token = sign<Signed>({ userId, paths, days, idHash, files, warnings });
    return { mode: "ai", token, days, files, warnings, idFound: ids.length === 1, multipleIds: ids.length > 1 };
  } catch (e) {
    const code = aiErrorCode(e);
    console.error("analyzeForms failed", code, e);
    return { mode: "manual", reason: "ai_failed", code };
  }
}

export type SubmitState = { error?: string };

async function submit(userId: string, kind: "form_3010" | "spouse", paths: string[], extracted: object, days: number | null, idHash: string | null, note: string) {
  const { error } = await createServiceClient().rpc("submit_verification", {
    p_user: userId,
    p_kind: kind,
    p_file_paths: paths,
    p_extracted: extracted as never,
    p_days_total: days as never,
    p_id_hash: idHash as never,
    p_note: note || undefined,
  });
  return error ? appErrorMessage(error) : null;
}

/** Confirm the AI summary and send it to the admin queue. */
export async function submitAnalyzed(token: string, note: string): Promise<SubmitState> {
  const userId = await currentUserId();
  const p = verify<Signed>(token);
  if (!p || p.userId !== userId) return { error: "פג תוקף הבדיקה. העלו את הקבצים שוב." };
  const error = await submit(userId, "form_3010", p.paths, { source: "ai", files: p.files, warnings: p.warnings }, p.days, p.idHash, note.slice(0, 500));
  if (error) return { error };
  await advanceFrom(1);
  return {};
}

/** No AI (or it failed): the provider types the total; the reviewer checks the documents. */
export async function submitManual(paths: string[], days: number, note: string): Promise<SubmitState> {
  const userId = await currentUserId();
  checkPaths(userId, paths);
  if (!Number.isInteger(days) || days < 1 || days > 2000) return { error: "יש להזין את מספר הימים (מספר שלם)." };
  const error = await submit(userId, "form_3010", paths, { source: "manual", stated_days: days }, days, null, note.slice(0, 500));
  if (error) return { error };
  await advanceFrom(1);
  return {};
}

/** Spouse: proof of marriage or partnership, reviewed by admin (no AI). */
export async function submitSpouseProof(paths: string[], note: string): Promise<SubmitState> {
  const userId = await currentUserId();
  checkPaths(userId, paths);
  const error = await submit(userId, "spouse", paths, { source: "spouse_proof" }, null, null, note.slice(0, 500));
  if (error) return { error };
  await advanceFrom(1);
  return {};
}
