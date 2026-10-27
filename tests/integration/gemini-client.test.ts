// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
const { generateContent, clientOptions } = vi.hoisted(() => ({
  generateContent: vi.fn(),
  clientOptions: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@google/genai", () => ({
  ThinkingLevel: { LOW: "LOW" },
  GoogleGenAI: class {
    constructor(options: unknown) {
      clientOptions(options);
    }
    models = { generateContent };
  },
}));
import { geminiProvider } from "@/lib/ai/client";
import { proposal } from "../fixtures/planning";
import { geminiResponseSchema } from "@/lib/ai/response-schema";
import { proposalSchema } from "@/lib/schemas/plan";

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
    expect(args.config.responseJsonSchema).toBe(geminiResponseSchema);
    expect(args.config.abortSignal).toBe(signal);
    expect(args.config.maxOutputTokens).toBe(6000);
    expect(args.config.systemInstruction).toContain("untrusted user data");
  });

  it("sends only the provider subset at every nested schema node", () => {
    const allowed = new Set([
      "type",
      "properties",
      "required",
      "additionalProperties",
      "items",
      "enum",
      "description",
    ]);
    function check(node: typeof geminiResponseSchema) {
      expect(Object.keys(node).every((key) => allowed.has(key))).toBe(true);
      if (node.properties) Object.values(node.properties).forEach(check);
      if (node.items) check(node.items);
    }
    check(geminiResponseSchema);
    expect(geminiResponseSchema.required).toEqual(Object.keys(proposal));
    expect(
      geminiResponseSchema.properties!.tasks.items!.properties!.key.type,
    ).toBe("string");
    expect(
      geminiResponseSchema.properties!.tasks.items!.properties!.key.description,
    ).toContain("^[a-z]");
    expect(
      geminiResponseSchema.properties!.tasks.items!.properties!.dependsOn.items!
        .type,
    ).toBe("string");
    expect(
      geminiResponseSchema.properties!.priorities.items!.properties!.category
        .enum,
    ).toContain("catering");
    expect(geminiResponseSchema.properties!.vendors.items!.required).toEqual([
      "category",
      "essential",
      "rationale",
    ]);
  });

  it("keeps strict application validation after simplifying the provider schema", () => {
    expect(proposalSchema.safeParse(proposal).success).toBe(true);
    for (const invalid of [
      { ...proposal, overview: "x".repeat(1201) },
      { ...proposal, ideas: [] },
      {
        ...proposal,
        recommendations: Array(9).fill(proposal.recommendations[0]),
      },
      { ...proposal, priorities: [{ ...proposal.priorities[0], weight: 101 }] },
      { ...proposal, tasks: [{ ...proposal.tasks[0], key: "INVALID KEY" }] },
      {
        ...proposal,
        tasks: [{ ...proposal.tasks[0], dependsOn: ["missing"] }],
      },
      { ...proposal, tasks: [{ ...proposal.tasks[0], leadDays: 3651 }] },
      {
        ...proposal,
        tasks: [
          proposal.tasks[0],
          {
            ...proposal.tasks[1],
            dependsOn: Array(9).fill(proposal.tasks[0].key),
          },
        ],
      },
      { ...proposal, extra: "unsupported field" },
    ])
      expect(proposalSchema.safeParse(invalid).success).toBe(false);
  });

  it("preserves the requested Flash-Lite model and single-attempt SDK configuration", async () => {
    generateContent.mockClear();
    generateContent.mockResolvedValue({ text: JSON.stringify(proposal) });
    await geminiProvider("test-placeholder", "gemini-3.5-flash-lite")(
      "test brief",
      new AbortController().signal,
    );
    expect(generateContent).toHaveBeenCalledOnce();
    expect(clientOptions).toHaveBeenLastCalledWith({
      apiKey: "test-placeholder",
      vertexai: false,
      httpOptions: { timeout: 20_000, retryOptions: { attempts: 1 } },
    });
    expect(generateContent.mock.calls[0][0]).toMatchObject({
      model: "gemini-3.5-flash-lite",
      config: {
        thinkingConfig: { thinkingLevel: "LOW" },
        responseJsonSchema: geminiResponseSchema,
      },
    });
  });
});
