import { geminiProvider } from "@/lib/ai/client";
import { DEFAULT_GEMINI_MODEL } from "@/lib/ai/model";
import { createPlanHandler } from "@/lib/server/handler";
import { createGenerationLimiter } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 45;
const limiter = createGenerationLimiter();
export const POST = createPlanHandler({
  config: () => ({
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL,
    localEnabled: process.env.AI_ENABLE_LOCAL_GENERATION === "true",
    hosted: Boolean(process.env.VERCEL),
  }),
  provider: geminiProvider,
  acquire: limiter.acquire,
});
