// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import {
  createHostedSecurity,
  hashToken,
  hostedConfig,
  COOKIE,
  type HostedConfig,
} from "@/lib/server/hosted/security";
import { redisREST } from "@/lib/server/hosted/redis";
import { createPlanHandler } from "@/lib/server/handler";
import { accessHandler } from "@/lib/server/hosted/access";
import { luaRedis } from "../fixtures/lua-redis";
import { NOW, brief, proposal } from "../fixtures/planning";

const origin = "https://planner.example";
const prefix = "planora:test:production:";
const code = "c".repeat(43);
const token = "s".repeat(43);
const cookie = `${COOKIE}=${token}`;
function request(
  headers: Record<string, string> = {},
  body: unknown = { brief },
) {
  return new Request(origin + "/api/plans/generate", {
    method: "POST",
    headers: {
      origin,
      host: "planner.example",
      "content-type": "application/json",
      cookie,
      "x-vercel-forwarded-for": "203.0.113.1",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}
async function harness() {
  const redis = luaRedis();
  const config: HostedConfig = {
    origin,
    prefix,
    ipSecret: "test-hmac-secret-".repeat(3),
    enabled: () => true,
  };
  const command = vi.fn(redis.command);
  const bot = vi.fn().mockResolvedValue(true);
  const security = createHostedSecurity(config, command, bot);
  await command(["SET", prefix + "generation-state", "enabled"]);
  await command([
    "SET",
    prefix + "invite:" + hashToken(code),
    "active",
    "EX",
    86400,
  ]);
  await command([
    "SET",
    prefix + "session:" + hashToken(token),
    hashToken(code),
    "EX",
    28800,
  ]);
  const provider = vi.fn().mockResolvedValue(JSON.stringify(proposal));
  const handler = () =>
    createPlanHandler({
      config: () => ({
        apiKey: "test-only-placeholder",
        model: "mock",
        localEnabled: false,
        hosted: true,
      }),
      provider: () => provider,
      acquire: () => {
        throw new Error("Local limiter must not be used");
      },
      hostedSecurity: () => security,
      now: () => NOW,
    });
  return { redis, command, bot, security, provider, handler, config };
}

describe("hosted authorization and boundaries — zero provider calls on rejection", () => {
  it.each<Record<string, string>>([
    { cookie: "" },
    { cookie: `${COOKIE}=forged` },
    { cookie: `${COOKIE}=${"f".repeat(43)}` },
    { cookie: `${cookie}; ${cookie}` },
    { origin: "https://evil.example" },
    { host: "evil.example" },
    { origin: "https://evil.example", host: "evil.example" },
    { "sec-fetch-site": "cross-site" },
    { "x-vercel-forwarded-for": "" },
    { "x-vercel-forwarded-for": "1.2.3.4, 5.6.7.8" },
    {
      "x-vercel-forwarded-for": "invalid",
      "x-forwarded-for": "203.0.113.1",
      "x-real-ip": "203.0.113.1",
    },
  ])("rejects invalid headers %j", async (headers) => {
    const h = await harness();
    expect(
      (await h.handler()(request(headers))).status,
    ).toBeGreaterThanOrEqual(400);
    expect(h.provider).not.toHaveBeenCalled();
  });
  it.each(["expired", "revoked invite", "revoked session"])(
    "rejects %s",
    async (kind) => {
      const h = await harness();
      if (kind === "expired") h.redis.advance(28801);
      else
        await h.command([
          "DEL",
          prefix +
            (kind === "revoked invite"
              ? "invite:" + hashToken(code)
              : "session:" + hashToken(token)),
        ]);
      expect((await h.handler()(request())).status).toBe(401);
      expect(h.provider).not.toHaveBeenCalled();
    },
  );
  it("does not trust client-provided invite IDs or relax request validation", async () => {
    const h = await harness();
    expect(
      (await h.handler()(request({}, { brief, inviteId: hashToken(code) })))
        .status,
    ).toBe(400);
    expect(
      (await h.handler()(request({ "content-type": "text/plain" }))).status,
    ).toBe(415);
    expect(
      (await h.handler()(request({}, { brief, padding: "x".repeat(33000) })))
        .status,
    ).toBe(413);
    expect(h.provider).not.toHaveBeenCalled();
  });
  it.each(["deny", "outage"])("fails closed on bot %s", async (kind) => {
    const h = await harness();
    if (kind === "deny") h.bot.mockResolvedValue(false);
    else h.bot.mockRejectedValue(new Error("secret"));
    const response = await h.handler()(request());
    expect(response.status).toBe(kind === "deny" ? 403 : 503);
    expect(await response.text()).not.toContain("secret");
    expect(h.provider).not.toHaveBeenCalled();
  });
  it("Redis outage fails closed without leaking errors", async () => {
    const h = await harness();
    h.command.mockRejectedValue(new Error("secret credential"));
    const response = await h.handler()(request());
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("secret");
    expect(h.provider).not.toHaveBeenCalled();
  });
  it("both deployment and shared operator kill switches stop calls", async () => {
    const h = await harness();
    h.config.enabled = () => false;
    expect((await h.handler()(request())).status).toBe(503);
    h.config.enabled = () => true;
    await h.command(["DEL", prefix + "generation-state"]);
    expect((await h.handler()(request())).status).toBe(503);
    expect(h.provider).not.toHaveBeenCalled();
  });
  it("ignores forged generic forwarding headers instead of changing quota identity", async () => {
    const h = await harness();
    for (let i = 0; i < 3; i++)
      expect(
        (
          await h.handler()(
            request({
              "x-forwarded-for": `1.1.1.${i}`,
              forwarded: `for=2.2.2.${i}`,
            }),
          )
        ).status,
      ).toBe(200);
    const count = h.provider.mock.calls.length;
    expect(
      (await h.handler()(request({ "x-forwarded-for": "9.9.9.9" }))).status,
    ).toBe(429);
    expect(h.provider).toHaveBeenCalledTimes(count);
  });
});

describe("actual Lua shared admission semantics", () => {
  it("coordinates independent handler instances and admits only two concurrent calls", async () => {
    const h = await harness();
    let finish!: () => void;
    const waiting = new Promise<void>((resolve) => {
      finish = resolve;
    });
    h.provider.mockImplementation(async () => {
      await waiting;
      return JSON.stringify(proposal);
    });
    const pending = [
      h.handler()(request()),
      h.handler()(request({ "x-vercel-forwarded-for": "203.0.113.2" })),
    ];
    await vi.waitFor(() => expect(h.provider).toHaveBeenCalledTimes(2));
    expect(
      (await h.handler()(request({ "x-vercel-forwarded-for": "203.0.113.3" })))
        .status,
    ).toBe(429);
    expect(h.provider).toHaveBeenCalledTimes(2);
    finish();
    expect((await Promise.all(pending)).every((r) => r.status === 200)).toBe(
      true,
    );
  });
  it("does not reset invite daily quota when another session is issued", async () => {
    const h = await harness();
    for (let i = 0; i < 5; i++) {
      expect((await h.handler()(request())).status).toBe(200);
      h.redis.advance(61);
    }
    const other = "t".repeat(43);
    await h.command([
      "SET",
      prefix + "session:" + hashToken(other),
      hashToken(code),
      "EX",
      1000,
    ]);
    expect(
      (await h.handler()(request({ cookie: `${COOKIE}=${other}` }))).status,
    ).toBe(429);
    expect(h.provider).toHaveBeenCalledTimes(5);
  });
  it.each(["repair", "retry"])(
    "charges each %s attempt and refuses a second call at the global cap",
    async (kind) => {
      const h = await harness();
      await h.command([
        "EVAL",
        `local day = math.floor(tonumber(redis.call('TIME')[1]) / 86400); return redis.call('SET', ARGV[1] .. 'attempt-day:' .. day, '39', 'EX', 1000)`,
        0,
        prefix,
      ]);
      if (kind === "repair") h.provider.mockResolvedValueOnce("invalid");
      else h.provider.mockRejectedValueOnce({ status: 503 });
      expect((await h.handler()(request())).status).toBe(429);
      expect(h.provider).toHaveBeenCalledOnce();
      expect((await h.handler()(request())).status).toBe(429);
      expect(h.provider).toHaveBeenCalledOnce();
    },
  );
  it("successful repair is bounded and consumes two provider attempts", async () => {
    const h = await harness();
    h.provider.mockResolvedValueOnce("invalid");
    expect((await h.handler()(request())).status).toBe(200);
    expect(h.provider).toHaveBeenCalledTimes(2);
    expect(
      await h.command([
        "EVAL",
        `return redis.call('GET', ARGV[1] .. 'attempt-day:' .. math.floor(tonumber(redis.call('TIME')[1]) / 86400))`,
        0,
        prefix,
      ]),
    ).toBe("2");
  });
  it("expires abandoned leases and an old owner cannot release replacements", async () => {
    const h = await harness();
    const a = await h.security.admit(request());
    const b = await h.security.admit(
      request({ "x-vercel-forwarded-for": "203.0.113.2" }),
    );
    h.redis.advance(91);
    const c = await h.security.admit(request());
    const d = await h.security.admit(request());
    await a.release();
    await b.release();
    expect(
      (await h.handler()(request({ "x-vercel-forwarded-for": "203.0.113.3" })))
        .status,
    ).toBe(429);
    await expect(a.beforeAttempt()).rejects.toMatchObject({ status: 503 });
    expect(h.provider).not.toHaveBeenCalled();
    await c.release();
    await d.release();
  });
  it.each(["kill", "logout", "outage"])(
    "rechecks %s before retry; rejected attempt makes zero additional calls",
    async (kind) => {
      const h = await harness();
      h.provider.mockImplementationOnce(async () => {
        if (kind === "kill")
          await h.command(["DEL", prefix + "generation-state"]);
        if (kind === "logout") await h.security.logout(request());
        if (kind === "outage") h.command.mockRejectedValue(new Error("outage"));
        throw { status: 503 };
      });
      expect((await h.handler()(request())).status).toBeGreaterThanOrEqual(400);
      expect(h.provider).toHaveBeenCalledOnce();
    },
  );
});

describe("invite redemption and session lifecycle", () => {
  it("single-use markers last through invite expiry, not just session expiry", async () => {
    const h = await harness();
    await h.security.redeem(request(), code);
    h.redis.advance(28801);
    await expect(h.security.redeem(request(), code)).rejects.toMatchObject({
      status: 401,
    });
    expect(h.provider).not.toHaveBeenCalled();
  });
  it("limits global redemption traffic even when IPs change", async () => {
    const h = await harness();
    for (let i = 1; i <= 100; i++)
      await expect(
        h.security.redeem(
          request({ "x-vercel-forwarded-for": `203.0.113.${i}` }),
          "bad",
        ),
      ).rejects.toMatchObject({ status: 401 });
    await expect(
      h.security.redeem(
        request({ "x-vercel-forwarded-for": "203.0.113.101" }),
        code,
      ),
    ).rejects.toMatchObject({ status: 429 });
    expect(h.provider).not.toHaveBeenCalled();
  });
  it.each(["redeem", "logout"] as const)(
    "rejects cross-site %s and oversized access payloads",
    async (action) => {
      const h = await harness();
      const handler = accessHandler(() => h.security, action);
      expect(
        (await handler(request({ origin: "https://evil.example" }, { code })))
          .status,
      ).toBe(403);
      expect(
        (await handler(request({}, { code: "x".repeat(33000) }))).status,
      ).toBe(413);
      expect(h.provider).not.toHaveBeenCalled();
    },
  );
  it("sets only a hardened cookie, stores hashes, enforces single use and logout", async () => {
    const h = await harness();
    const redeem = accessHandler(() => h.security, "redeem");
    const response = await redeem(request({}, { code }));
    expect(response.status).toBe(200);
    const resultCookie = response.headers.get("set-cookie")!;
    expect(resultCookie).toMatch(
      /Path=\/; Max-Age=\d+; Secure; HttpOnly; SameSite=Strict/,
    );
    expect(await response.text()).toBe('{"ok":true}');
    expect(JSON.stringify(h.command.mock.calls)).not.toContain(code);
    const raw = resultCookie.split(";")[0];
    expect((await h.handler()(request({ cookie: raw }))).status).toBe(200);
    expect((await redeem(request({}, { code }))).status).toBe(401);
    const logout = await accessHandler(
      () => h.security,
      "logout",
    )(request({ cookie: raw }, {}));
    expect(logout.status).toBe(200);
    expect(logout.headers.get("set-cookie")).toContain("Max-Age=0");
    const calls = h.provider.mock.calls.length;
    expect((await h.handler()(request({ cookie: raw }))).status).toBe(401);
    expect(h.provider).toHaveBeenCalledTimes(calls);
  });
  it("bounds redemption brute force across instances, including malformed codes", async () => {
    const h = await harness();
    for (let i = 0; i < 5; i++)
      expect(
        (
          await accessHandler(
            () => h.security,
            "redeem",
          )(request({}, { code: "bad" }))
        ).status,
      ).toBe(401);
    expect(
      (await accessHandler(() => h.security, "redeem")(request({}, { code })))
        .status,
    ).toBe(429);
    expect(h.provider).not.toHaveBeenCalled();
  });
});

describe("configuration and REST transport fail closed", () => {
  const env = {
    VERCEL: "1",
    VERCEL_ENV: "production",
    AI_HOSTED_RELEASE_APPROVED: "true",
    AI_ENABLE_HOSTED_GENERATION: "true",
    PLANORA_PRODUCTION_ORIGIN: origin,
    PLANORA_SECURITY_NAMESPACE: "test-app",
    PLANORA_IP_HASH_SECRET: "x".repeat(32),
    UPSTASH_REDIS_REST_URL: "https://test.upstash.io",
    UPSTASH_REDIS_REST_TOKEN: "test-placeholder",
  };
  it.each(Object.keys(env))("rejects missing %s", async (key) => {
    const h = await harness();
    const bad = { ...env, [key]: "" };
    const handler = createPlanHandler({
      config: () => ({
        apiKey: "test",
        model: "mock",
        localEnabled: true,
        hosted: true,
      }),
      provider: () => h.provider,
      acquire: () => () => {},
      hostedSecurity: () => {
        hostedConfig(bad);
        return h.security;
      },
    });
    expect((await handler(request())).status).toBe(503);
    expect(h.provider).not.toHaveBeenCalled();
  });
  it.each(["preview", "development"])(
    "refuses %s even with flags",
    (environment) => {
      expect(() => hostedConfig({ ...env, VERCEL_ENV: environment })).toThrow();
    },
  );
  it("never retries or exposes HTTP errors; bounds hung transport", async () => {
    const failing = vi
      .fn()
      .mockResolvedValue(new Response('{"error":"secret"}', { status: 401 }));
    await expect(
      redisREST(env.UPSTASH_REDIS_REST_URL, "secret", failing)(["GET", "test"]),
    ).rejects.toMatchObject({
      status: 503,
      message: expect.not.stringContaining("secret"),
    });
    expect(failing).toHaveBeenCalledOnce();
    const hung = vi.fn().mockImplementation(() => new Promise(() => {}));
    await expect(
      redisREST(
        env.UPSTASH_REDIS_REST_URL,
        "secret",
        hung,
        10,
      )(["GET", "test"]),
    ).rejects.toMatchObject({ status: 503 });
    expect(hung).toHaveBeenCalledOnce();
  });
});
