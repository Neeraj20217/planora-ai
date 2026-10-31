import { z } from "zod";
import { planSchema } from "./schemas/plan";

// Shared wire envelopes; plan validation remains the existing strict contract.
const requestId = z.string().min(1).max(128).optional();
export const planResponseSchema = z.object({ plan: planSchema, requestId }).strict();
export const accessResponseSchema = z.object({ ok: z.literal(true) }).strict();
const errorResponseSchema = z.object({
  error: z.object({
    code: z.string().min(1).max(100).regex(/^[A-Z_]+$/),
    message: z.string().max(2000).optional(),
  }).strict(),
  requestId,
}).strict();

export class ApiResponseError extends Error {
  constructor(public kind: "network" | "invalid-response") { super(kind); }
}

export async function fetchApi(input: string, init: RequestInit) {
  try { return await fetch(input, init); }
  catch { throw new ApiResponseError("network"); }
}

export async function readApiResponse<T extends z.ZodType>(response: Response, schema: T) {
  let raw: unknown;
  try { raw = await response.json(); }
  catch (error) {
    throw new ApiResponseError(error instanceof SyntaxError ? "invalid-response" : "network");
  }
  if (response.ok) {
    const parsed = schema.safeParse(raw);
    if (!parsed.success) throw new ApiResponseError("invalid-response");
    return { ok: true as const, data: parsed.data };
  }
  const parsed = errorResponseSchema.safeParse(raw);
  if (!parsed.success) throw new ApiResponseError("invalid-response");
  return { ok: false as const, error: parsed.data.error };
}

/** A UI cooldown only; server quotas remain authoritative. Never schedules retries. */
export function retryAfterMs(response: Response, now = Date.now()) {
  if (response.status !== 429 && response.status !== 503) return 0;
  const fallback = response.status === 429 ? 60_000 : 0;
  const value = response.headers.get("Retry-After")?.trim();
  if (!value) return fallback;
  let delay: number;
  if (/^\d+$/.test(value)) delay = Number(value) * 1000;
  else if (/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), /.test(value)) delay = Date.parse(value) - now;
  else return fallback;
  if (Number.isNaN(delay)) return fallback;
  return Math.max(0, Math.min(delay, 86_400_000));
}

export function cooldownMessage(until: number, now = Date.now()) {
  const seconds = Math.max(1, Math.ceil((until - now) / 1000));
  return seconds === 60
    ? "Please wait a minute before retrying. Your details are unchanged."
    : `Please wait ${seconds} seconds before retrying. Your details are unchanged.`;
}
