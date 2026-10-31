import { describe, expect, it } from "vitest";
import { accessResponseSchema, readApiResponse, retryAfterMs } from "@/lib/api-response";

describe("typed API responses", () => {
  it.each([null, {}, { ok: false }, { ok: "true" }, { ok: true, extra: "unexpected" }])("rejects malformed success envelopes: %j", async raw => {
    await expect(readApiResponse(Response.json(raw), accessResponseSchema)).rejects.toMatchObject({ kind: "invalid-response" });
  });
  it("rejects HTML instead of JSON without exposing its contents", async () => {
    await expect(readApiResponse(new Response("<html>private details</html>"), accessResponseSchema)).rejects.toMatchObject({ kind: "invalid-response" });
  });
  it("rejects malformed error codes", async () => {
    await expect(readApiResponse(Response.json({ error: { code: 429 } }, { status: 429 }), accessResponseSchema)).rejects.toMatchObject({ kind: "invalid-response" });
  });
});

describe("bounded manual retry cooldown", () => {
  const now = Date.parse("2026-10-31T00:00:00Z");
  it.each([
    [429, null, 60000], [503, null, 0], [429, "120", 120000],
    [503, "30", 30000], [429, "0", 0], [429, "-1", 60000],
    [429, "garbage", 60000], [429, "999999999999999999999999", 86400000],
    [429, "Sat, 31 Oct 2026 00:02:00 GMT", 120000],
    [429, "Fri, 30 Oct 2026 00:00:00 GMT", 0], [403, "120", 0],
  ] as const)("handles HTTP %i with Retry-After %s", (status, header, expected) => {
    expect(retryAfterMs(new Response(null, { status, headers: header === null ? {} : { "Retry-After": header } }), now)).toBe(expected);
  });
});
