import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/ai/client", () => ({
  aiFakeEnabled: () => false,
  extractWithTool: vi.fn(async () => ({
    readable: true,
    document_kind: "form_3010",
    full_name: "ישראל ישראלי",
    id_number: "12345678-2",
    periods: [{ from: "2024-01-01T00:00", to: "2024-01-31" }, { bogus: true }],
    reported_total_days: 99999,
    notes: "x".repeat(1000),
  })),
}));

import { isValidIsraeliId, readForm3010 } from "@/lib/ai/form3010";

describe("readForm3010 normalizes untrusted model output", () => {
  it("cleans fields", async () => {
    const r = await readForm3010({ bytes: Buffer.from(""), mediaType: "application/pdf", name: "a.pdf" });
    expect(r.id_number).toBe("123456782");
    expect(r.periods).toEqual([{ from: "2024-01-01", to: "2024-01-31" }]);
    expect(r.reported_total_days).toBeNull();
    expect(r.notes.length).toBe(300);
  });
});

describe("isValidIsraeliId", () => {
  it("checks the control digit", () => {
    expect(isValidIsraeliId("123456782")).toBe(true);
    expect(isValidIsraeliId("123456789")).toBe(false);
    expect(isValidIsraeliId("12345")).toBe(false);
  });
});
