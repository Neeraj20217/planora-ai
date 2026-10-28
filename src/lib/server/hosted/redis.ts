import { PlanningError } from "../errors";

export type RedisCommand = (args: (string | number)[]) => Promise<unknown>;
export function unavailable(): never {
  throw new PlanningError(
    503,
    "ACCESS_UNAVAILABLE",
    "Secure access is unavailable. Please try later.",
  );
}

// One bounded POST, no retries. Ambiguous timeouts may consume quota, never refund it.
export function redisREST(
  url: string,
  token: string,
  transport = fetch,
  timeoutMs = 1500,
): RedisCommand {
  return async (args) => {
    const signal = AbortSignal.timeout(timeoutMs);
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        (async () => {
          const response = await transport(url, {
            method: "POST",
            redirect: "error",
            cache: "no-store",
            signal,
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(args),
          });
          if (!response.ok) return unavailable();
          const data = await response.json();
          if (
            !data ||
            typeof data !== "object" ||
            "error" in data ||
            !("result" in data)
          )
            return unavailable();
          return data.result;
        })(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error("Redis timeout")),
            timeoutMs,
          );
        }),
      ]);
    } catch {
      return unavailable();
    } finally {
      clearTimeout(timer);
    }
  };
}
