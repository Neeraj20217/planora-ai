/* global process, fetch, AbortSignal, console */
// Operator CLI only. Credentials belong in the process environment, never arguments.
import { randomBytes, createHash } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { resolve } from "node:path";

try {
  const [action, id] = process.argv.slice(2);
  const url = process.env.UPSTASH_REDIS_REST_URL ?? "";
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? "";
  const namespace = process.env.PLANORA_SECURITY_NAMESPACE ?? "";
  if (
    !/^https:\/\/[a-z0-9-]+\.upstash\.io\/?$/.test(url) ||
    !token ||
    !/^[a-z0-9-]{4,64}$/.test(namespace)
  )
    throw new Error();
  const prefix = `planora:${namespace}:production:`;
  async function command(args) {
    const response = await fetch(url, {
      method: "POST",
      redirect: "error",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(1500),
    });
    if (!response.ok) throw new Error();
    const data = await response.json();
    if (data.error || !("result" in data)) throw new Error();
    return data.result;
  }
  if (action === "issue") {
    const code = randomBytes(32).toString("base64url");
    const hash = createHash("sha256").update(code).digest("hex");
    const dir = resolve(".impeccable");
    await mkdir(dir, { recursive: true });
    const path = resolve(dir, `invite-${hash}.txt`);
    await writeFile(
      path,
      `Single-use invite (expires in 24 hours):\n${code}\n`,
      { flag: "wx", mode: 0o600 },
    );
    try {
      if (
        (await command([
          "SET",
          prefix + "invite:" + hash,
          "active",
          "EX",
          86400,
          "NX",
        ])) !== "OK"
      )
        throw new Error();
    } catch {
      await unlink(path);
      throw new Error();
    }
    console.log(
      `Invite created. ID: ${hash}. Retrieve privately from ${path}; remove the file after secure delivery.`,
    );
  } else if (action === "revoke-invite" && /^[a-f0-9]{64}$/.test(id ?? "")) {
    await command(["DEL", prefix + "invite:" + id]);
    console.log("Invite and its sessions revoked.");
  } else if (action === "disable") {
    await command(["DEL", prefix + "generation-state"]);
    console.log(
      "Future provider attempts disabled. In-flight requests cannot be recalled.",
    );
  } else {
    // Intentionally no enable action: manual release review is required first.
    console.log(
      "Usage: node scripts/access-admin.mjs issue | revoke-invite <hashed-id> | disable",
    );
    process.exitCode = 1;
  }
} catch {
  console.error(
    "Operator action failed. Check private configuration and Redis connectivity; no error details were logged.",
  );
  process.exitCode = 1;
}
