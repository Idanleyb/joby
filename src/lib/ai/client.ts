import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import mammoth from "mammoth";

/** Model used for document reading. Override with ANTHROPIC_MODEL. */
export const AI_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5-5";

export type DocInput = { bytes: Buffer; mediaType: string; name: string };

/** A failure with a short code that is safe to show on screen and helps support diagnose. */
export class AiError extends Error {
  constructor(public code: string, message?: string) {
    super(message ?? code);
  }
}

/** Maps any failure while reading a document to a short diagnostic code. */
export function aiErrorCode(e: unknown): string {
  if (e instanceof AiError) return e.code;
  if (e instanceof Anthropic.APIConnectionTimeoutError) return "AI-TIMEOUT";
  if (e instanceof Anthropic.APIConnectionError) return "AI-NET";
  if (e instanceof Anthropic.APIError) {
    const type = (e.error as { error?: { type?: string } } | undefined)?.error?.type;
    return `AI-${e.status ?? "ERR"}${type ? `-${type}` : ""}`;
  }
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes("SUPABASE_SECRET_KEY")) return "AI-NOSVC";
  if (msg.startsWith("unsupported_media_type")) return "AI-TYPE";
  return "AI-ERR";
}

/**
 * Test hook: JOBY_AI_FAKE=1 returns canned results (e2e tests without an API key).
 * Refused on Vercel production so it can never be switched on for real users.
 */
export function aiFakeEnabled() {
  return process.env.JOBY_AI_FAKE === "1" && process.env.VERCEL_ENV !== "production";
}

export function aiAvailable() {
  return aiFakeEnabled() || Boolean(process.env.ANTHROPIC_API_KEY);
}

let client: Anthropic | null = null;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 2, timeout: 60_000 });
  return client;
}

const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** PDF → document block, image → image block, DOCX → extracted text (Claude does not read .docx directly). */
async function toContent(doc: DocInput): Promise<Anthropic.ContentBlockParam> {
  const data = doc.bytes.toString("base64");
  if (doc.mediaType === "application/pdf") {
    return { type: "document", source: { type: "base64", media_type: "application/pdf", data } };
  }
  if (doc.mediaType === "image/jpeg" || doc.mediaType === "image/png" || doc.mediaType === "image/webp") {
    return { type: "image", source: { type: "base64", media_type: doc.mediaType, data } };
  }
  if (doc.mediaType === DOCX) {
    const { value } = await mammoth.extractRawText({ buffer: doc.bytes });
    return { type: "text", text: `<document name="${doc.name}">\n${value.slice(0, 60_000)}\n</document>` };
  }
  throw new Error(`unsupported_media_type:${doc.mediaType}`);
}

/**
 * Ask Claude to fill a JSON schema by forcing a single tool call. The document is
 * untrusted input: we only ever read the structured result, never act on its text.
 */
export async function extractWithTool<T>(opts: {
  doc: DocInput;
  system: string;
  instruction: string;
  tool: { name: string; description: string; input_schema: Anthropic.Tool.InputSchema };
  maxTokens?: number;
}): Promise<T> {
  const anthropic = getClient();
  if (!anthropic) throw new AiError("AI-NOKEY");
  const response = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: opts.maxTokens ?? 2000,
    system: opts.system,
    tools: [opts.tool],
    tool_choice: { type: "tool", name: opts.tool.name },
    messages: [{ role: "user", content: [await toContent(opts.doc), { type: "text", text: opts.instruction }] }],
  });
  const block = response.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") throw new AiError(`AI-NORESULT-${response.stop_reason}`);
  return block.input as T;
}
