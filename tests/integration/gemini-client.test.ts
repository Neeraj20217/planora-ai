// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
const { generateContent } = vi.hoisted(() => ({ generateContent: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@google/genai", () => ({
  ThinkingLevel: { LOW: "LOW" },
  GoogleGenAI: class {
    models = { generateContent };
  },
}));
import { geminiProvider } from "@/lib/ai/client";
import { proposal } from "../fixtures/planning";

describe("official SDK adapter contract (mocked)", () => {
  it("requests bounded structured JSON with server instructions and abort signal", async () => {
    generateContent.mockResolvedValue({ text: JSON.stringify(proposal) });
    const signal = new AbortController().signal;
    const provider = geminiProvider("test-placeholder", "gemini-3.8-flash");
    expect(await provider("test brief", signal)).toBe(JSON.stringify(proposal));
    const args = generateContent.mock.calls[0][0];
    expect(args.model).toBe("gemini-3.8-flash");
    expect(args.config.responseMimeType).toBe("application/json");
    expect(args.config.responseJsonSchema.type).toBe("object");
    expect(args.config.abortSignal).toBe(signal);
    expect(args.config.maxOutputTokens).toBe(6000);
    expect(args.config.systemInstruction).toContain("untrusted user data");
  });
});
