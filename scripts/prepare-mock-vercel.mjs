/* global process, console */
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  mkdtempSync,
  copyFileSync,
  readdirSync,
} from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

export function prepareMockArtifact({
  sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), ".."),
  projectId = null,
  redisUrlSha256 = null,
} = {}) {
  if (
    (projectId === null) !== (redisUrlSha256 === null) ||
    (projectId !== null && !/^prj_[A-Za-z0-9_-]{4,100}$/.test(projectId)) ||
    (redisUrlSha256 !== null && !/^[a-f0-9]{64}$/.test(redisUrlSha256))
  )
    throw new Error("Invalid non-secret test binding");
  const ignoredRoot = join(sourceRoot, ".impeccable");
  mkdirSync(ignoredRoot, { recursive: true });
  execFileSync("git", ["check-ignore", "--", ".impeccable/mock-vercel-probe"], {
    cwd: sourceRoot,
    stdio: "pipe",
  });
  const target = mkdtempSync(join(ignoredRoot, "mock-vercel-"));
  const binding = { projectId, redisUrlSha256 };
  function write(path, value) {
    mkdirSync(dirname(join(target, path)), { recursive: true });
    writeFileSync(join(target, path), value);
  }
  function replace(path, from, to) {
    const source = readFileSync(join(target, path), "utf8");
    if (source.split(from).length !== 2)
      throw new Error("Source contract changed; construction refused");
    write(path, source.replace(from, to));
  }
  const tracked = execFileSync("git", ["ls-files", "--", "src", "tests"], {
    cwd: sourceRoot,
    encoding: "utf8",
  })
    .trim()
    .split(/\r?\n/);
  const configs = [
    "next.config.ts",
    "tsconfig.json",
    "postcss.config.mjs",
    "eslint.config.mjs",
    "vitest.config.ts",
    "playwright.config.ts",
    "scripts/access-admin.mjs",
  ];
  for (const path of [...tracked, ...configs]) {
    if (
      !path ||
      path.includes("..") ||
      path === "tests/integration/gemini-client.test.ts" ||
      path === "tests/integration/mock-artifact.test.ts"
    )
      continue;
    mkdirSync(dirname(join(target, path)), { recursive: true });
    copyFileSync(join(sourceRoot, path), join(target, path));
  }
  write(
    "src/lib/ai/client.ts",
    readFileSync(join(sourceRoot, "verification/mock-vercel/provider.ts")),
  );
  write(
    "src/lib/server/mock-policy.ts",
    readFileSync(join(sourceRoot, "verification/mock-vercel/policy.ts")),
  );
  write(
    "src/lib/server/mock-binding.ts",
    `export const binding = ${JSON.stringify(binding)};\n`,
  );
  write(
    "src/instrumentation.ts",
    `export async function register() { if (process.env.NEXT_RUNTIME === "nodejs") { const { install } = await import("./lib/server/mock-runtime"); install(); } }\n`,
  );
  write(
    "src/lib/server/mock-runtime.ts",
    `import "server-only";\nimport { binding } from "./mock-binding";\nimport { assertMockIsolation, restrictedMockFetch } from "./mock-policy";\nexport function install() { assertMockIsolation(binding, process.env); globalThis.fetch = restrictedMockFetch(process.env, globalThis.fetch); }\n`,
  );
  replace(
    "src/app/api/plans/generate/route.ts",
    "apiKey: process.env.GEMINI_API_KEY,",
    'apiKey: "TEST_ONLY_PROVIDER_SENTINEL",',
  );
  replace(
    "src/app/api/plans/generate/route.ts",
    "model: process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL,",
    'model: "test-only-deterministic",',
  );
  replace(
    "src/app/api/plans/generate/route.ts",
    'import { DEFAULT_GEMINI_MODEL } from "@/lib/ai/model";\n',
    "",
  );
  replace(
    "src/app/layout.tsx",
    "<body>",
    '<body>\n        <aside aria-label="Mock environment notice" data-testid="mock-only-banner">TEST ONLY — deterministic mock, no live AI. Not a production release.</aside>',
  );
  replace(
    "next.config.ts",
    "reactStrictMode: true,",
    "reactStrictMode: true,\n  outputFileTracingRoot: process.cwd(),",
  );
  replace(
    "src/components/planner/generation-panel.tsx",
    "Choosing Generate plan sends this brief to Google Gemini. Avoid",
    "This TEST ONLY build uses a local deterministic fixture. Avoid",
  );
  replace(
    "tests/components/planner.test.tsx",
    "/sends this brief to Google Gemini/",
    "/TEST ONLY build uses a local deterministic fixture/",
  );
  const pkg = JSON.parse(
    readFileSync(join(sourceRoot, "package.json"), "utf8"),
  );
  delete pkg.dependencies["@google/genai"];
  delete pkg.scripts["ai:models"];
  pkg.name = "planora-test-only-mock";
  pkg.scripts.build =
    "node scripts/mock-safety.mjs && next build --webpack && node scripts/mock-safety.mjs --built";
  pkg.scripts.start = "node scripts/mock-safety.mjs --built && next start";
  pkg.scripts.dev = "node scripts/mock-safety.mjs && next dev --webpack";
  pkg.scripts["verify:mock"] = "node scripts/mock-safety.mjs --built";
  const lock = JSON.parse(
    readFileSync(join(sourceRoot, "package-lock.json"), "utf8"),
  );
  lock.name = pkg.name;
  lock.packages[""].name = pkg.name;
  delete lock.packages[""].dependencies["@google/genai"];
  delete lock.packages["node_modules/@google/genai"];
  write("package.json", JSON.stringify(pkg, null, 2) + "\n");
  write("package-lock.json", JSON.stringify(lock, null, 2) + "\n");
  const isWin = process.platform === "win32";
  execFileSync(
    isWin ? (process.env.ComSpec || "cmd.exe") : "npm",
    isWin
      ? [
          "/d",
          "/s",
          "/c",
          "npm install --package-lock-only --no-audit --no-fund --ignore-scripts",
        ]
      : [
          "install",
          "--package-lock-only",
          "--no-audit",
          "--no-fund",
          "--ignore-scripts",
        ],
    { cwd: target, stdio: "pipe" },
  );
  write(
    "scripts/mock-safety.mjs",
    readFileSync(join(sourceRoot, "verification/mock-vercel/safety.mjs")),
  );
  write(
    ".gitignore",
    "node_modules/\n.next/\n.env*\n.vercel/\ntest-results/\nplaywright-report/\n*.tsbuildinfo\n",
  );
  write(
    "README.md",
    "# TEST ONLY — Planora mock verification artifact\n\nNot a production release. No Gemini adapter or key. No deployment is authorized. See the parent repository docs/PHASE_5C_PREPARATION.md. An unbound artifact refuses Vercel execution.\n",
  );
  function list(dir) {
    return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? list(join(dir, e.name)) : [join(dir, e.name)],
    );
  }
  const files = Object.fromEntries(
    list(target)
      .sort()
      .filter(
        (p) =>
          p.slice(target.length + 1).replaceAll("\\", "/") !== ".gitignore",
      )
      .map((path) => [
        path.slice(target.length + 1).replaceAll("\\", "/"),
        createHash("sha256").update(readFileSync(path)).digest("hex"),
      ]),
  );
  const sourceCommit = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: sourceRoot,
    encoding: "utf8",
  }).trim();
  write(
    "ARTIFACT_MANIFEST.json",
    JSON.stringify(
      { kind: "PLANORA_TEST_ONLY_MOCK", sourceCommit, binding, files },
      null,
      2,
    ) + "\n",
  );
  return target;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const args = process.argv.slice(2);
    if (
      args.length !== 0 &&
      (args.length !== 4 ||
        args[0] !== "--project-id" ||
        args[2] !== "--redis-url-sha256")
    )
      throw new Error();
    console.log(
      `TEST ONLY artifact created at ${prepareMockArtifact({ projectId: args[1] ?? null, redisUrlSha256: args[3] ?? null })}`,
    );
  } catch {
    console.error(
      "Mock artifact construction refused. Check source contracts and non-secret binding arguments.",
    );
    process.exitCode = 1;
  }
}
