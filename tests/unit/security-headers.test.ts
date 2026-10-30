// @vitest-environment node
import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

describe("application anti-framing headers", () => {
  it("covers every route with CSP and legacy browser protection", async () => {
    const rules = await nextConfig.headers!();
    expect(rules).toEqual([
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ]);
  });

  it("preserves existing settings without restricting BotID scripts or connections", async () => {
    expect(nextConfig.reactStrictMode).toBe(true);
    expect(nextConfig.poweredByHeader).toBe(false);
    const rules = await nextConfig.headers!();
    const csp = rules.flatMap((rule) => rule.headers)
      .find((header) => header.key === "Content-Security-Policy");
    expect(csp?.value.split(";").map((directive) => directive.trim()))
      .toEqual(["frame-ancestors 'none'"]);
  });
});
