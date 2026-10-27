import { describe, expect, it, vi } from "vitest";
import Anthropic from "@anthropic-ai/sdk";
vi.mock("server-only", () => ({}));
import { aiErrorCode, AiError } from "@/lib/ai/client";

describe("aiErrorCode", () => {
  it("maps failures to short codes", () => {
    expect(aiErrorCode(new AiError("AI-NOKEY"))).toBe("AI-NOKEY");
    expect(aiErrorCode(Anthropic.APIError.generate(401, { type: "error", error: { type: "authentication_error", message: "x" } }, "x", new Headers()))).toBe("AI-401-authentication_error");
    expect(aiErrorCode(Anthropic.APIError.generate(404, { type: "error", error: { type: "not_found_error", message: "model" } }, "x", new Headers()))).toBe("AI-404-not_found_error");
    expect(aiErrorCode(new Error("SUPABASE_SECRET_KEY is not set"))).toBe("AI-NOSVC");
    expect(aiErrorCode(new Error("boom"))).toBe("AI-ERR");
  });
});
