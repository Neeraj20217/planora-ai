/* global process, console */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, relative } from "node:path";

function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? files(resolve(dir, entry.name))
      : [resolve(dir, entry.name)],
  );
}
try {
  const root = process.cwd();
  const manifest = JSON.parse(readFileSync("ARTIFACT_MANIFEST.json", "utf8"));
  if (
    manifest.kind !== "PLANORA_TEST_ONLY_MOCK" ||
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim() ||
    process.env.OVERRIDE_BOTID_SERVER_URL
  )
    throw new Error("CONFIG_OR_KEY_VIOLATION");
  if (readdirSync(root).some((name) => name.startsWith(".env")))
    throw new Error("ROOT_ENV_FILE_DETECTED");
  for (const [path, hash] of Object.entries(manifest.files)) {
    if (
      path.includes("..") ||
      resolve(root, path) === root ||
      !resolve(root, path).startsWith(
        root + (process.platform === "win32" ? "\\" : "/"),
      )
    )
      throw new Error(`PATH_TRAVERSAL_DETECTED:${path}`);
    if (!existsSync(path))
      throw new Error(`MISSING_MANIFEST_FILE:${path}`);
    if (createHash("sha256").update(readFileSync(path)).digest("hex") !== hash)
      throw new Error(`FILE_HASH_MISMATCH:${path}`);
  }
  for (const file of files(resolve(root, "src"))) {
    const path = relative(root, file).replaceAll("\\", "/");
    if (!manifest.files[path]) throw new Error(`UNTRACKED_SRC_FILE:${path}`);
    if (
      /@google\/genai|GoogleGenAI|generativelanguage\.googleapis\.com/.test(
        readFileSync(file, "utf8"),
      )
    )
      throw new Error(`SDK_MARKER_IN_SRC:${path}`);
  }
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
  if (
    pkg.dependencies?.["@google/genai"] ||
    lock.packages?.["node_modules/@google/genai"] ||
    existsSync("node_modules/@google/genai")
  )
    throw new Error("SDK_DEPENDENCY_DETECTED");
  if (process.argv.includes("--built")) {
    if (!existsSync(".next/server"))
      throw new Error("MISSING_COMPILED_SERVER_DIR");
    for (const file of files(resolve(root, ".next/server"))) {
      if (
        /\.(?:js|json)$/.test(file) &&
        /GoogleGenAI|generativelanguage\.googleapis\.com|node_modules\/@google\/genai/.test(
          readFileSync(file, "utf8"),
        )
      )
        throw new Error(
          `SDK_MARKER_IN_SERVER_BUILD:${relative(root, file).replaceAll("\\", "/")}`,
        );
    }
  }
  console.log("TEST ONLY artifact integrity and SDK-exclusion checks passed.");
} catch (err) {
  const code =
    err instanceof Error && err.message
      ? err.message
      : "UNKNOWN_SAFETY_VIOLATION";
  console.error(
    `TEST ONLY artifact safety check failed [${code}]; build/start refused. No private details logged.`,
  );
  process.exitCode = 1;
}
