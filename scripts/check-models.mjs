import env from "@next/env";
import { GoogleGenAI } from "@google/genai";
import process from "node:process";
import console from "node:console";

env.loadEnvConfig(process.cwd());
if (!process.env.GEMINI_API_KEY?.trim()) {
  console.error(
    "GEMINI_API_KEY is not configured. Model access cannot be checked.",
  );
  process.exitCode = 1;
} else {
  try {
    const client = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      vertexai: false,
      httpOptions: { timeout: 10_000, retryOptions: { attempts: 1 } },
    });
    const models = await client.models.list({ config: { pageSize: 100 } });
    for await (const model of models)
      if (model.name?.includes("flash")) console.log(model.name);
  } catch {
    console.error(
      "Unable to verify model access. Check the key, network and account configuration securely.",
    );
    process.exitCode = 1;
  }
}
