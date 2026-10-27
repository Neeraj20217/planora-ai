import { z } from "zod";
import { eventDetailsSchema } from "@/lib/schemas/event";
import { todayInIndia } from "@/lib/domain/date";
import { generatePlan, type ProposalProvider } from "@/lib/ai/generate";
import { PlanningError } from "./errors";

const MAX_BYTES = 32_768;
async function readBody(request: Request) {
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > MAX_BYTES))
    throw new PlanningError(
      413,
      "PAYLOAD_LIMIT",
      "The event brief is too large. Shorten preferences and requirements.",
    );
  const reader = request.body?.getReader();
  if (!reader)
    throw new PlanningError(400, "INVALID_INPUT", "Provide an event brief.");
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      void reader.cancel();
      reject(
        new PlanningError(
          408,
          "BODY_TIMEOUT",
          "The request took too long. Please retry.",
        ),
      );
    }, 5000);
  });
  try {
    await Promise.race([
      (async () => {
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          bytes += chunk.value.byteLength;
          if (bytes > MAX_BYTES) {
            void reader.cancel();
            throw new PlanningError(
              413,
              "PAYLOAD_LIMIT",
              "The event brief is too large. Shorten preferences and requirements.",
            );
          }
          chunks.push(chunk.value);
        }
      })(),
      timeout,
    ]);
    const merged = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.byteLength;
    }
    try {
      return JSON.parse(
        new TextDecoder("utf-8", { fatal: true }).decode(merged),
      );
    } catch {
      throw new PlanningError(
        400,
        "INVALID_INPUT",
        "Provide valid JSON event details.",
      );
    }
  } finally {
    clearTimeout(timer!);
    reader.releaseLock();
  }
}

export function createPlanHandler(deps: {
  config: () => {
    apiKey?: string;
    model: string;
    localEnabled: boolean;
    hosted: boolean;
  };
  provider: (key: string, model: string) => ProposalProvider;
  acquire: () => () => void;
  now?: () => Date;
}) {
  return async (request: Request) => {
    const requestId = crypto.randomUUID();
    const headers: Record<string, string> = {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    };
    let release: (() => void) | undefined;
    try {
      if (request.method !== "POST")
        throw new PlanningError(405, "METHOD", "Use a POST request.");
      const url = new URL(request.url);
      // Next may normalize request.url to localhost; Host preserves the browser authority.
      const browserURL = new URL(
        `${url.protocol}//${request.headers.get("host") ?? url.host}`,
      );
      if (
        request.headers.get("origin") !== browserURL.origin ||
        browserURL.username ||
        browserURL.password ||
        request.headers.get("sec-fetch-site") === "cross-site"
      )
        throw new PlanningError(
          403,
          "ORIGIN",
          "This request must come from the Planora application.",
        );
      if (
        !/^application\/json(?:\s*;|$)/i.test(
          request.headers.get("content-type") ?? "",
        )
      )
        throw new PlanningError(
          415,
          "CONTENT_TYPE",
          "Send an application/json event brief.",
        );
      const now = deps.now?.() ?? new Date();
      const schema = z
        .object({
          brief: eventDetailsSchema.refine(
            (brief) => brief.date >= todayInIndia(now),
            "Event date must be today or later.",
          ),
        })
        .strict();
      const parsed = schema.safeParse(await readBody(request));
      if (!parsed.success)
        throw new PlanningError(
          400,
          "INVALID_INPUT",
          "Check the event details, including date, guests and budget, then review again.",
        );
      const config = deps.config();
      if (!config.apiKey?.trim())
        throw new PlanningError(
          503,
          "NOT_CONFIGURED",
          "AI planning is not configured on this server. Your brief is unchanged.",
        );
      if (
        !config.localEnabled ||
        config.hosted ||
        !["localhost", "127.0.0.1", "[::1]"].includes(browserURL.hostname)
      )
        throw new PlanningError(
          503,
          "ENDPOINT_DISABLED",
          "AI planning is disabled on this server. Your brief is unchanged.",
        );
      release = deps.acquire();
      const plan = await generatePlan(parsed.data.brief, {
        provider: deps.provider(config.apiKey, config.model),
        model: config.model,
        now,
        signal: request.signal,
      });
      return Response.json({ plan, requestId }, { headers });
    } catch (error) {
      const safe =
        error instanceof PlanningError
          ? error
          : new PlanningError(
              500,
              "INTERNAL",
              "Planning could not finish. Your details are unchanged.",
            );
      if (safe.retryAfter) headers["Retry-After"] = String(safe.retryAfter);
      return Response.json(
        { error: { code: safe.code, message: safe.message }, requestId },
        { status: safe.status, headers },
      );
    } finally {
      release?.();
    }
  };
}
