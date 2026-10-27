// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { generatePlan } from "@/lib/ai/generate";
import { createPlanHandler } from "@/lib/server/handler";
import { createGenerationLimiter } from "@/lib/server/rate-limit";
import { brief, NOW, proposal } from "../fixtures/planning";

describe("provider orchestration", () => {
  it("sends event context and accepts a valid response", async () => {
    const provider = vi.fn().mockResolvedValue(JSON.stringify(proposal));
    const plan = await generatePlan(brief, {
      provider,
      model: "test-model",
      now: NOW,
    });
    expect(plan.model).toBe("test-model");
    expect(provider).toHaveBeenCalledTimes(1);
    expect(provider.mock.calls[0][0]).toContain("Hyderabad");
    expect(provider.mock.calls[0][0]).toContain("Step-free access");
  });
  it("repairs invalid JSON once, sharing a two-call budget", async () => {
    const provider = vi
      .fn()
      .mockResolvedValueOnce("bad JSON")
      .mockResolvedValueOnce(JSON.stringify(proposal));
    await expect(
      generatePlan(brief, { provider, model: "test", now: NOW }),
    ).resolves.toBeTruthy();
    expect(provider).toHaveBeenCalledTimes(2);
    expect(provider.mock.calls[1][0]).toContain("correction");
  });
  it("rejects repeated invalid output without more than two calls", async () => {
    const provider = vi.fn().mockResolvedValue("{}");
    await expect(
      generatePlan(brief, { provider, model: "test", now: NOW }),
    ).rejects.toMatchObject({ status: 502, code: "INVALID_PLAN" });
    expect(provider).toHaveBeenCalledTimes(2);
  });
  it("retries one transient provider error", async () => {
    const provider = vi
      .fn()
      .mockRejectedValueOnce({ status: 503 })
      .mockResolvedValueOnce(JSON.stringify(proposal));
    await expect(
      generatePlan(brief, { provider, model: "test", now: NOW }),
    ).resolves.toBeTruthy();
    expect(provider).toHaveBeenCalledTimes(2);
  });
  it("returns 429 without retry storms", async () => {
    const provider = vi.fn().mockRejectedValue({ status: 429 });
    await expect(
      generatePlan(brief, { provider, model: "test" }),
    ).rejects.toMatchObject({ status: 429, retryAfter: 60 });
    expect(provider).toHaveBeenCalledTimes(1);
  });
  it("bounds hung providers and aborts the signal", async () => {
    const provider = vi.fn().mockImplementation(() => new Promise(() => {}));
    await expect(
      generatePlan(brief, { provider, model: "test", timeoutMs: 20 }),
    ).rejects.toMatchObject({ status: 504 });
    expect(provider.mock.calls[0][1].aborted).toBe(true);
    expect(provider).toHaveBeenCalledTimes(1);
  });
  it("does not reveal authentication errors or retry them", async () => {
    const provider = vi
      .fn()
      .mockRejectedValue({ status: 401, message: "sensitive-provider-detail" });
    await expect(
      generatePlan(brief, { provider, model: "test" }),
    ).rejects.toMatchObject({
      status: 503,
      message: expect.not.stringContaining("sensitive-provider-detail"),
    });
    expect(provider).toHaveBeenCalledTimes(1);
  });
});

const request = (
  body: unknown = { brief },
  headers: Record<string, string> = {},
) =>
  new Request("http://localhost:3000/api/plans/generate", {
    method: "POST",
    headers: {
      origin: "http://localhost:3000",
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
function harness(
  config = {
    apiKey: "unit-test-placeholder",
    model: "test-model",
    localEnabled: true,
    hosted: false,
  },
) {
  const provider = vi.fn().mockResolvedValue(JSON.stringify(proposal));
  const release = vi.fn();
  const acquire = vi.fn(() => release);
  return {
    provider,
    acquire,
    release,
    handler: createPlanHandler({
      config: () => config,
      provider: () => provider,
      acquire,
      now: () => NOW,
    }),
  };
}
describe("server request boundary", () => {
  it("accepts same-origin loopback Host when Next normalizes the URL authority", async () => {
    const { handler } = harness();
    const response = await handler(
      request(
        { brief },
        { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000" },
      ),
    );
    expect(response.status).toBe(200);
  });
  it("does not enable generation for a public Host or mismatched Origin", async () => {
    const { handler, provider } = harness();
    expect(
      (
        await handler(
          request(
            { brief },
            { host: "public.example", origin: "http://public.example" },
          ),
        )
      ).status,
    ).toBe(503);
    expect(
      (
        await handler(
          request(
            { brief },
            { host: "127.0.0.1:3000", origin: "http://other.example" },
          ),
        )
      ).status,
    ).toBe(403);
    expect(provider).not.toHaveBeenCalled();
  });
  it("returns a checked plan with no-store headers", async () => {
    const { handler, release } = harness();
    const response = await handler(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect((await response.json()).plan.details).toEqual(brief);
    expect(release).toHaveBeenCalledOnce();
  });
  it("returns a safe configuration error without calling the provider", async () => {
    const { handler, provider } = harness({
      apiKey: "",
      model: "test",
      localEnabled: true,
      hosted: false,
    });
    const response = await handler(request());
    expect(response.status).toBe(503);
    expect((await response.json()).error.code).toBe("NOT_CONFIGURED");
    expect(provider).not.toHaveBeenCalled();
  });
  it.each([
    { localEnabled: false, hosted: false },
    { localEnabled: true, hosted: true },
  ])(
    "fails closed outside explicitly enabled local mode: %j",
    async (flags) => {
      const { handler, provider } = harness({
        apiKey: "test-placeholder",
        model: "test",
        ...flags,
      });
      expect((await handler(request())).status).toBe(503);
      expect(provider).not.toHaveBeenCalled();
    },
  );
  it.each([
    { ...brief, guests: 1.5 },
    { ...brief, date: "2026-10-25" },
    { ...brief, budgetPaise: -1 },
    { ...brief, location: "" },
  ])("independently validates submitted details", async (invalid) => {
    const { handler, provider } = harness();
    expect((await handler(request({ brief: invalid }))).status).toBe(400);
    expect(provider).not.toHaveBeenCalled();
  });
  it("blocks cross-origin requests and unsupported content types", async () => {
    const { handler, provider } = harness();
    expect(
      (await handler(request({ brief }, { origin: "https://other.example" })))
        .status,
    ).toBe(403);
    expect(
      (await handler(request({ brief }, { "content-type": "text/plain" })))
        .status,
    ).toBe(415);
    expect(provider).not.toHaveBeenCalled();
  });
  it("enforces actual body bytes even without Content-Length", async () => {
    const { handler, provider } = harness();
    expect(
      (await handler(request({ brief, padding: "x".repeat(33_000) }))).status,
    ).toBe(413);
    expect(provider).not.toHaveBeenCalled();
  });
  it("propagates safe limits and releases concurrency after errors", async () => {
    const { handler, provider, release } = harness();
    provider.mockRejectedValue({ status: 429, message: "do-not-leak" });
    const response = await handler(request());
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("60");
    expect(JSON.stringify(await response.json())).not.toContain("do-not-leak");
    expect(release).toHaveBeenCalledOnce();
  });
});

describe("local abuse limits", () => {
  it("bounds concurrency and requests per minute", () => {
    const limiter = createGenerationLimiter(() => 0);
    const release = limiter.acquire();
    expect(() => limiter.acquire()).toThrow();
    release();
    limiter.acquire()();
    limiter.acquire()();
    expect(() => limiter.acquire()).toThrow();
  });
  it("enforces the hourly cap and expires old counters", () => {
    let now = 0;
    const limiter = createGenerationLimiter(() => now);
    for (let i = 0; i < 20; i++) {
      limiter.acquire()();
      now += 61_000;
    }
    expect(() => limiter.acquire()).toThrow();
    now = 3_600_001;
    expect(() => limiter.acquire()()).not.toThrow();
  });
});
