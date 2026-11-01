import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { dispatchEmails } from "@/lib/email/dispatch";

/**
 * Sends queued notification emails. Called every 5 minutes by pg_cron
 * (private.call_email_worker) with "Authorization: Bearer <CRON_SECRET>".
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await dispatchEmails());
  } catch (e) {
    console.error("[email] dispatch failed", e);
    return NextResponse.json({ error: "dispatch_failed" }, { status: 500 });
  }
}
