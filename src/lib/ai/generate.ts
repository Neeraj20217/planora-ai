import { proposalSchema } from "@/lib/schemas/plan";
import type { EventDetails } from "@/types";
import { composePlan } from "@/lib/domain/plan";
import { todayInIndia } from "@/lib/domain/date";
import { PlanningError } from "@/lib/server/errors";
import { planningPrompt } from "./prompt";

export type ProposalProvider = (
  prompt: string,
  signal: AbortSignal,
) => Promise<string>;

async function boundedCall(
  provider: ProposalProvider,
  prompt: string,
  signal: AbortSignal,
) {
  if (signal.aborted)
    throw new PlanningError(
      504,
      "TIMEOUT",
      "Planning timed out. Your details are unchanged; try again shortly.",
    );
  let listener: () => void;
  const aborted = new Promise<never>((_, reject) => {
    listener = () =>
      reject(
        new PlanningError(
          504,
          "TIMEOUT",
          "Planning timed out. Your details are unchanged; try again shortly.",
        ),
      );
    signal.addEventListener("abort", listener, { once: true });
  });
  try {
    return await Promise.race([provider(prompt, signal), aborted]);
  } finally {
    signal.removeEventListener("abort", listener!);
  }
}

export async function generatePlan(
  details: EventDetails,
  options: {
    provider: ProposalProvider;
    model: string;
    now?: Date;
    signal?: AbortSignal;
    timeoutMs?: number;
  },
) {
  const now = options.now ?? new Date();
  const signal = AbortSignal.any([
    AbortSignal.timeout(options.timeoutMs ?? 35_000),
    ...(options.signal ? [options.signal] : []),
  ]);
  let repair = false;
  for (let attempt = 0; attempt < 2; attempt++) {
    let raw: string;
    try {
      raw = await boundedCall(
        options.provider,
        planningPrompt(details, todayInIndia(now), repair),
        signal,
      );
    } catch (error) {
      if (error instanceof PlanningError) throw error;
      const status =
        typeof error === "object" && error !== null && "status" in error
          ? Number(error.status)
          : 0;
      if (status === 429)
        throw new PlanningError(
          429,
          "PROVIDER_LIMIT",
          "The AI provider is busy or quota is exhausted. Please wait before retrying.",
          60,
        );
      if (
        status === 408 ||
        (error instanceof Error && /abort|timeout/i.test(error.name))
      )
        throw new PlanningError(
          504,
          "TIMEOUT",
          "Planning timed out. Your details are unchanged; try again shortly.",
        );
      if (
        attempt === 0 &&
        [500, 502, 503, 504].includes(status) &&
        !signal.aborted
      )
        continue;
      throw new PlanningError(
        503,
        "PROVIDER_UNAVAILABLE",
        "AI planning is unavailable right now. Your details are unchanged; please try again later.",
      );
    }
    try {
      if (raw.length > 65_536) throw new Error("Oversized response");
      const proposal = proposalSchema.parse(JSON.parse(raw));
      return composePlan(details, proposal, options.model, now);
    } catch {
      if (attempt === 0 && !signal.aborted) {
        repair = true;
        continue;
      }
      throw new PlanningError(
        502,
        "INVALID_PLAN",
        "The AI response could not be validated. No plan was saved. Please try again.",
      );
    }
  }
  throw new PlanningError(
    503,
    "PROVIDER_UNAVAILABLE",
    "AI planning is unavailable.",
  );
}
