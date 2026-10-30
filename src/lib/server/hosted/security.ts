import { createHash, createHmac, randomBytes } from "node:crypto";
import { isIP } from "node:net";
import { PlanningError } from "../errors";
import { redisREST, unavailable, type RedisCommand } from "./redis";
import { ADMIT, ATTEMPT, REDEEM, RELEASE, SESSION, TRIAL } from "./scripts";

export const COOKIE = "__Host-planora-session";
const TOKEN = /^[A-Za-z0-9_-]{43}$/;
export const hashToken = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export type HostedConfig = {
  origin: string;
  prefix: string;
  ipSecret: string;
  enabled: () => boolean;
};
export function hostedConfig(
  env: Record<string, string | undefined> = process.env,
) {
  if (
    env.VERCEL !== "1" ||
    env.VERCEL_ENV !== "production" ||
    env.AI_HOSTED_RELEASE_APPROVED !== "true" ||
    env.AI_ENABLE_HOSTED_GENERATION !== "true"
  )
    return unavailable();
  const origin = env.PLANORA_PRODUCTION_ORIGIN ?? "";
  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    return unavailable();
  }
  if (
    parsed.protocol !== "https:" ||
    ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname) ||
    parsed.origin !== origin ||
    parsed.username ||
    parsed.password ||
    !env.PLANORA_SECURITY_NAMESPACE?.match(/^[a-z0-9-]{4,64}$/) ||
    !env.PLANORA_IP_HASH_SECRET ||
    env.PLANORA_IP_HASH_SECRET.length < 32 ||
    !env.UPSTASH_REDIS_REST_URL?.match(
      /^https:\/\/[a-z0-9-]+\.upstash\.io\/?$/,
    ) ||
    !env.UPSTASH_REDIS_REST_TOKEN?.trim()
  )
    return unavailable();
  return {
    config: {
      origin,
      prefix: `planora:${env.PLANORA_SECURITY_NAMESPACE}:production:`,
      ipSecret: env.PLANORA_IP_HASH_SECRET,
      enabled: () =>
        env.AI_ENABLE_HOSTED_GENERATION === "true" &&
        env.AI_HOSTED_RELEASE_APPROVED === "true",
    },
    command: redisREST(
      env.UPSTASH_REDIS_REST_URL,
      env.UPSTASH_REDIS_REST_TOKEN,
    ),
  };
}
function deny(status: number, code: string): never {
  throw new PlanningError(
    status,
    code,
    status === 401
      ? "Access expired or invalid. Enter a new invite on the Generation access page."
      : "Secure access was denied or its limit was reached.",
    status === 429 ? 60 : undefined,
  );
}
export function sessionHash(request: Request) {
  const matches = (request.headers.get("cookie") ?? "")
    .split(";")
    .map((x) => x.trim())
    .filter((x) => x.startsWith(`${COOKIE}=`));
  if (matches.length !== 1) return deny(401, "SESSION_REQUIRED");
  const token = matches[0].slice(COOKIE.length + 1);
  if (!TOKEN.test(token)) return deny(401, "SESSION_REQUIRED");
  return hashToken(token);
}
export function sessionCookie(token: string, ttl: number) {
  return `${COOKIE}=${token}; Path=/; Max-Age=${ttl}; Secure; HttpOnly; SameSite=Strict`;
}

export function createHostedSecurity(
  config: HostedConfig,
  command: RedisCommand,
  verifyBot: () => Promise<boolean>,
) {
  const evalScript = async (
    script: string,
    keys: string[],
    args: (string | number)[],
  ) => {
    let result: unknown;
    try {
      result = await command(["EVAL", script, keys.length, ...keys, ...args]);
    } catch {
      return unavailable();
    }
    if (result === "SESSION") return deny(401, "SESSION_REQUIRED");
    if (result === "LIMIT") return deny(429, "ACCESS_LIMIT");
    if (result === "DISABLED" || result === "LEASE") return unavailable();
    return result;
  };
  const boundary = (request: Request) => {
    if (!config.enabled()) return unavailable();
    const origin = new URL(config.origin);
    if (
      request.method !== "POST" ||
      request.headers.get("origin") !== config.origin ||
      request.headers.get("host") !== origin.host ||
      request.headers.get("sec-fetch-site") === "cross-site"
    )
      return deny(403, "ORIGIN");
    // Only the Vercel-overwritten header on Vercel's direct edge. No fallback to
    // Forwarded/X-Forwarded-For/X-Real-IP, and no external reverse proxy support.
    const ip = request.headers.get("x-vercel-forwarded-for") ?? "";
    if (!isIP(ip)) return deny(403, "CLIENT_IP");
    const normalized = new URL(
      isIP(ip) === 6 ? `http://[${ip}]` : `http://${ip}`,
    ).hostname;
    return createHmac("sha256", config.ipSecret)
      .update(normalized)
      .digest("hex");
  };
  const bot = async () => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const result = await Promise.race([
        verifyBot(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error("Bot timeout")), 3000);
        }),
      ]);
      if (result === true) return;
    } catch {
      return unavailable();
    } finally {
      clearTimeout(timer);
    }
    return deny(403, "BOT_DENIED");
  };
  return {
    boundary,
    async redeem(request: Request, code: string) {
      const ip = boundary(request);
      await bot();
      // Invalid format still consumes the IP/global brute-force quota.
      const invite = hashToken(TOKEN.test(code) ? code : "invalid-format");
      const token = randomBytes(32).toString("base64url");
      const ttl = await evalScript(
        REDEEM,
        [config.prefix + "session:" + hashToken(token)],
        [config.prefix, ip, invite],
      );
      if (
        typeof ttl !== "number" ||
        !Number.isInteger(ttl) ||
        ttl <= 0 ||
        ttl > 28800
      )
        return unavailable();
      return sessionCookie(token, ttl);
    },
    async trial(request: Request) {
      const ip = boundary(request);
      await bot();
      const trialInvite = hashToken("trial:" + randomBytes(32).toString("base64url"));
      const token = randomBytes(32).toString("base64url");
      const ttl = await evalScript(
        TRIAL,
        [config.prefix + "session:" + hashToken(token)],
        [config.prefix, ip, trialInvite],
      );
      if (ttl === "CLAIMED") {
        throw new PlanningError(
          429,
          "ACCESS_LIMIT",
          "The daily public evaluation limit for your connection (2 live plans) has been reached. For extended testing, enter an organizer invite code on the Generation access page.",
          3600,
        );
      }
      if (ttl === "RATE") {
        throw new PlanningError(
          429,
          "ACCESS_LIMIT",
          "Too many evaluation attempts. Please wait a minute before retrying.",
          60,
        );
      }
      if (
        typeof ttl !== "number" ||
        !Number.isInteger(ttl) ||
        ttl <= 0 ||
        ttl > 28800
      )
        return unavailable();
      return sessionCookie(token, ttl);
    },
    async logout(request: Request) {
      boundary(request);
      const key = config.prefix + "session:" + sessionHash(request);
      try {
        const deleted = await command(["DEL", key]);
        if (deleted !== 0 && deleted !== 1) return unavailable();
      } catch {
        return unavailable();
      }
      return sessionCookie("", 0);
    },
    async admit(request: Request) {
      const ip = boundary(request);
      const key = config.prefix + "session:" + sessionHash(request);
      // Reject invalid access before paying for bot verification.
      if ((await evalScript(SESSION, [key], [config.prefix])) !== "OK")
        return unavailable();
      await bot();
      const lease = randomBytes(32).toString("hex");
      if ((await evalScript(ADMIT, [key], [config.prefix, ip, lease])) !== "OK")
        return unavailable();
      return {
        async beforeAttempt() {
          if (!config.enabled()) return unavailable();
          if (
            (await evalScript(ATTEMPT, [key], [config.prefix, lease])) !== "OK"
          )
            return unavailable();
        },
        async release() {
          // Failure cannot grant capacity: keep the lease until its 90s TTL.
          try {
            await command([
              "EVAL",
              RELEASE,
              1,
              config.prefix + "leases",
              lease,
            ]);
          } catch {
            /* bounded lease expiry */
          }
        },
      };
    },
  };
}
export type HostedSecurity = ReturnType<typeof createHostedSecurity>;
