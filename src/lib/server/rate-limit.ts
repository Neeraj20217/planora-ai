import { PlanningError } from "./errors";

/** Local single-process protection only. Hosted generation is blocked separately. */
export function createGenerationLimiter(clock = Date.now) {
  let calls: number[] = [];
  let active = false;
  return {
    acquire() {
      const now = clock();
      calls = calls.filter((time) => time > now - 3_600_000);
      if (
        active ||
        calls.filter((time) => time > now - 60_000).length >= 3 ||
        calls.length >= 20
      )
        throw new PlanningError(
          429,
          "LOCAL_LIMIT",
          "Too many planning requests. Please wait before trying again.",
          60,
        );
      calls.push(now);
      active = true;
      let released = false;
      return () => {
        if (!released) {
          active = false;
          released = true;
        }
      };
    },
  };
}
