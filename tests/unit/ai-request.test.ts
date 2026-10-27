import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import http from "node:http";
import type { AddressInfo } from "node:net";

vi.mock("server-only", () => ({}));

// A stand-in Anthropic API that records requests and answers like the real one.
const seen: Record<string, unknown>[] = [];
let replies: object[] = [];
const server = http.createServer((req, res) => {
  let body = "";
  req.on("data", (d) => (body += d));
  req.on("end", () => {
    const json = JSON.parse(body);
    seen.push({ ...json, headers: req.headers });
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ id: "m", type: "message", role: "assistant", model: json.model, usage: { input_tokens: 1, output_tokens: 1 }, ...replies.shift() }));
  });
});

beforeAll(async () => {
  await new Promise<void>((ok) => server.listen(0, "127.0.0.1", ok));
  process.env.ANTHROPIC_API_KEY = "test-key";
  process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => server.close());

const toolReply = { stop_reason: "tool_use", content: [{ type: "tool_use", id: "t", name: "record_reserve_confirmation", input: { readable: true, document_kind: "form_3010", full_name: null, id_number: null, periods: [{ from: "2026-04-05", to: "2026-04-08" }], reported_total_days: null, notes: "" } }] };

describe("Anthropic request", () => {
  it("never forces a tool (Sonnet/Opus 5.5 reject forced tool use) and uses standard auth", async () => {
    replies = [toolReply];
    const { readForm3010 } = await import("@/lib/ai/form3010");
    const r = await readForm3010({ bytes: Buffer.from("%PDF-1.4"), mediaType: "application/pdf", name: "f.pdf" });
    expect(r.periods).toHaveLength(1);
    const req = seen.at(-1)!;
    expect(req.tool_choice).toEqual({ type: "auto" });
    expect((req.headers as Record<string, string>)["x-api-key"]).toBe("test-key");
    expect((req.messages as { content: { type: string }[] }[])[0].content[0].type).toBe("document");
  });

  it("retries once when Claude answers in text instead of calling the tool", async () => {
    replies = [{ stop_reason: "end_turn", content: [{ type: "text", text: "Here is what I found…" }] }, toolReply];
    const { readForm3010 } = await import("@/lib/ai/form3010");
    const before = seen.length;
    const r = await readForm3010({ bytes: Buffer.from("%PDF-1.4"), mediaType: "application/pdf", name: "f.pdf" });
    expect(seen.length - before).toBe(2);
    expect(r.readable).toBe(true);
  });
});
