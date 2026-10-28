import { createHash } from "node:crypto";

export type MockBinding = {
  projectId: string | null;
  redisUrlSha256: string | null;
};
export function assertMockIsolation(
  binding: MockBinding,
  env: Record<string, string | undefined>,
) {
  if (
    env.GEMINI_API_KEY?.trim() ||
    env.GOOGLE_API_KEY?.trim() ||
    env.OVERRIDE_BOTID_SERVER_URL
  )
    throw new Error("TEST_ONLY_CONFIGURATION_BLOCKED");
  if (env.VERCEL) {
    const redisURL = env.UPSTASH_REDIS_REST_URL ?? "";
    if (
      env.VERCEL !== "1" ||
      env.VERCEL_ENV !== "production" ||
      !binding.projectId ||
      !binding.redisUrlSha256 ||
      env.VERCEL_PROJECT_ID !== binding.projectId ||
      !/^mock-vercel-[a-z0-9-]{4,40}$/.test(
        env.PLANORA_SECURITY_NAMESPACE ?? "",
      ) ||
      !/^https:\/\/[a-z0-9-]+\.upstash\.io\/?$/.test(redisURL) ||
      createHash("sha256").update(redisURL).digest("hex") !==
        binding.redisUrlSha256
    )
      throw new Error("TEST_ONLY_ISOLATION_BLOCKED");
  }
}

export function restrictedMockFetch(
  env: Record<string, string | undefined>,
  transport: typeof fetch,
): typeof fetch {
  const redisURL = env.UPSTASH_REDIS_REST_URL;
  const redisAllowed =
    !!redisURL && /^https:\/\/[a-z0-9-]+\.upstash\.io\/?$/.test(redisURL);
  return async (input, init) => {
    const raw =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      throw new Error("TEST_ONLY_EGRESS_BLOCKED");
    }
    const redis = redisAllowed && raw === redisURL;
    const bot =
      url.origin === "https://api.vercel.com" &&
      url.pathname === "/bot-protection/v1/is-bot";
    if (url.username || url.password || (!redis && !bot))
      throw new Error("TEST_ONLY_EGRESS_BLOCKED");
    return transport(input, { ...init, redirect: "error" });
  };
}
