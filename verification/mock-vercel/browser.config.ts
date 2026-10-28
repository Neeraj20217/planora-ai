import { defineConfig, devices } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const artifact = resolve(process.env.PLANORA_MOCK_ARTIFACT_DIR ?? "");
if (
  !artifact.startsWith(resolve(".impeccable", "mock-vercel-")) ||
  JSON.parse(readFileSync(resolve(artifact, "ARTIFACT_MANIFEST.json"), "utf8"))
    .kind !== "PLANORA_TEST_ONLY_MOCK"
)
  throw new Error("Select a locally constructed mock artifact");
export default defineConfig({
  testDir: ".",
  testMatch: "browser.spec.ts",
  workers: 1,
  retries: 0,
  use: {
    baseURL: "http://127.0.0.1:3200",
    trace: "off",
    video: "off",
    screenshot: "off",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: {
    command: "npm run start -- --hostname 127.0.0.1 --port 3200",
    cwd: artifact,
    url: "http://127.0.0.1:3200",
    reuseExistingServer: false,
    timeout: 60000,
    env: {
      GEMINI_API_KEY: "",
      GOOGLE_API_KEY: "",
      VERCEL: "",
      VERCEL_ENV: "",
      VERCEL_PROJECT_ID: "",
      OVERRIDE_BOTID_SERVER_URL: "",
      UPSTASH_REDIS_REST_URL: "",
      UPSTASH_REDIS_REST_TOKEN: "",
      PLANORA_SECURITY_NAMESPACE: "",
      AI_ENABLE_LOCAL_GENERATION: "true",
      AI_ENABLE_HOSTED_GENERATION: "false",
      AI_HOSTED_RELEASE_APPROVED: "false",
    },
  },
});
