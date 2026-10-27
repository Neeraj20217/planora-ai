import "server-only";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { z } from "zod";
import { proposalShape } from "@/lib/schemas/plan";
import { SYSTEM_PROMPT } from "./prompt";
import type { ProposalProvider } from "./generate";

export function geminiProvider(
  apiKey: string,
  model: string,
): ProposalProvider {
  const client = new GoogleGenAI({
    apiKey,
    vertexai: false,
    httpOptions: { timeout: 20_000, retryOptions: { attempts: 1 } },
  });
  const responseJsonSchema = z.toJSONSchema(proposalShape);
  delete responseJsonSchema.$schema;
  return async (prompt, signal) => {
    const result = await client.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseJsonSchema,
        ...(model.startsWith("gemini-3")
          ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
          : {}),
        maxOutputTokens: 6000,
        abortSignal: signal,
      },
    });
    return result.text ?? "";
  };
}
