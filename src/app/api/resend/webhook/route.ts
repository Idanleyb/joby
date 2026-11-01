import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyResendWebhook } from "@/lib/email/webhook";

/**
 * Resend → Joby email events (delivered, opened, clicked, bounced, complained).
 * Set up in Resend → Webhooks with this URL; its signing secret goes in RESEND_WEBHOOK_SECRET.
 */
export const dynamic = "force-dynamic";

const TRACKED = new Set(["email.delivered", "email.opened", "email.clicked", "email.bounced", "email.complained"]);

export async function POST(req: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const body = await req.text();
  const ok = verifyResendWebhook(body, {
    id: req.headers.get("svix-id"), timestamp: req.headers.get("svix-timestamp"), signature: req.headers.get("svix-signature"),
  }, secret);
  if (!ok) return NextResponse.json({ error: "bad_signature" }, { status: 401 });

  const event = JSON.parse(body) as { type?: string; created_at?: string; data?: { email_id?: string } };
  if (!event.type || !TRACKED.has(event.type) || !event.data?.email_id) return NextResponse.json({ ignored: true });
  const { error } = await createServiceClient().rpc("record_email_event", {
    p_provider_id: event.data.email_id, p_type: event.type, p_at: event.created_at ?? new Date().toISOString(),
  });
  if (error) {
    console.error("[resend webhook]", error.message);
    return NextResponse.json({ error: "db" }, { status: 500 }); // Resend retries
  }
  return NextResponse.json({ ok: true });
}
