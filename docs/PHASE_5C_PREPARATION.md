# Phase 5C — Mock-only Vercel verification preparation

Date: 28 October 2026. Baseline: 373d145 plus the construction/templates/tests delivered with this report. **TEST ONLY. No deployment, service purchase, real Gemini call, Redis request or hosted activation occurred. Independent security approval remains outstanding.**

## Construction and separation

`node scripts/prepare-mock-vercel.mjs` creates a new uniquely named directory under the ignored .impeccable/mock-vercel-* tree. It never overwrites an existing artifact. Only tracked application/test source and explicitly selected configuration files are copied. Local environment files, Git history, private harnesses/results, .vercel configuration, dependencies and build outputs are not copied.

The generator then makes these changes **only in that copy**:

- Replaces src/lib/ai/client.ts with verification/mock-vercel/provider.ts: deterministic, strict proposal JSON, no network/tool/credential access, fixed TEST ONLY overview/warnings, and aborted-call rejection. Prompt instructions cannot select another behavior or provider.
- Replaces the copied generation route's credential input with a fixed non-secret handler sentinel and its model provenance with a test-only identifier. GEMINI_API_KEY is neither needed nor read by the mock adapter. The sentinel satisfies the existing handler's configured-provider check; it is not an API credential or hosted authorization.
- Removes @google/genai from package.json and the lockfile's root dependency/package entry and removes model-discovery tooling. npm ci installs the reduced graph; the final installed artifact has no @google/genai directory. No adapter fallback or runtime mock flag is added to normal Planora.
- Adds a visible TEST ONLY banner and changes the copied sharing notice to state that generation uses a local fixture. Adapts only the copied component test's sharing-notice expectation; normal tests/source remain unchanged. The four real-adapter contract tests are excluded from the SDK-free copy, and remain in the main suite.
- Adds artifact-only Node instrumentation: refuses Google/Gemini keys and a BotID endpoint override, validates isolated-project binding, then restricts application fetch to the exact configured Redis REST endpoint or the exact Vercel BotID verification path. Redirects are refused. Other destinations, including Gemini/OAuth, are blocked before transport.
- Pins outputFileTracingRoot to the artifact directory so local Next.js tracing does not infer the parent project as its root.
- Adds ARTIFACT_MANIFEST.json with the source baseline, optional project/endpoint binding and SHA-256 hashes of constructed files. Build/start safety checks verify those hashes, reject unexpected source/environment files, check SDK absence, and scan compiled server JS/traces for SDK/endpoint markers. This is an integrity aid, not a signature or independent attestation.

Handler validation, schemas, hosted configuration gates, sessions, Redis/Lua quota accounting, kill state, BotID server checks, origin/IP validation and access routes are byte-for-byte copied. No API test bypass or administrative HTTP endpoint is added. The main app never imports verification/mock-vercel; default main builds still use the real server-only Gemini adapter and unchanged disabled-by-default hosted gates.

The fetch restriction covers the application's existing fetch-based Redis/BotID paths. It is not an OS/network firewall, sandbox for arbitrary added code, or defense against a privileged operator rewriting the artifact/manifest. The removed adapter/SDK, deterministic provider, source hashes and compiled checks provide the additional barriers. The copied operator CLI remains an operator tool: it must only be invoked with explicitly approved test Redis credentials/namespace; the HTTP runtime policy is not a wrapper around manually executed scripts.

## Exact local preparation commands

From D:\Coding\Codex\planora-ai:

```powershell
node scripts/prepare-mock-vercel.mjs
```

Take the newly printed artifact directory and run inside it:

```powershell
npm ci --ignore-scripts --offline --no-audit --no-fund
npm run typecheck
npm run lint
npm test
npm run build
npm run verify:mock
```

The offline install requires cached packages and was verified locally. For a separately approved clean cloud build, use the same locked npm ci command without --offline if the package cache is unavailable. Never install/link the main project's node_modules into the artifact; that would reintroduce the installed SDK and fail safety checks. Build and start must use the generated scripts, which include the safety checks.

To run the dedicated local browser checks, return to the main project, set PLANORA_MOCK_ARTIFACT_DIR to that artifact directory, then run:

```powershell
npx playwright test --config verification/mock-vercel/browser.config.ts
```

The dedicated browser configuration binds only loopback port 3200, clears provider/Redis/cloud credentials in the server subprocess, disables hosted flags and enables only the pre-existing loopback path in the **mock copy**. It does not modify any environment file or parent production configuration. No network success route is mocked: the actual copied API composes, validates and saves a deterministic plan without a key. The normal browser configuration and normal production server are unaffected.

Generated output is private/ignored, not an upload package. Never upload the whole parent repository, .impeccable tree, node_modules, existing .next output, local environment files or previous test results. A future upload must be a freshly constructed/reviewed source artifact containing only manifest-listed source/configuration and its manifest. Do not upload local browser/compiler outputs or secrets. Rebuild on the approved isolated platform so Vercel supplies its own trace/package layout.

## Binding for a future isolated Vercel project

The prepared local artifact is intentionally **unbound**: it refuses execution when Vercel platform context is present. An unbound local build is not ready to deploy as-is.

After independent review and separate setup/deployment authorization, identify a dedicated mock-only Vercel project, private test Redis endpoint and unique namespace. Privately compute SHA-256 of the exact UPSTASH_REDIS_REST_URL string, including any trailing slash. Do not print the URL or token. Construct a fresh copy from the approved commit:

```powershell
node scripts/prepare-mock-vercel.mjs --project-id <ISOLATED_PROJECT_ID> --redis-url-sha256 <TEST_ENDPOINT_SHA256>
```

Both arguments must be supplied together. Project ID and endpoint digest are non-secret binding metadata; neither is a credential. On Vercel, runtime policy requires that project's platform-provided ID, production environment, the bound test endpoint and a namespace beginning mock-vercel- with the documented source constraints. Missing binding, wrong project, wrong endpoint, ordinary preview context, or a non-test namespace fails closed. Do not edit VERCEL/VERCEL_ENV/VERCEL_PROJECT_ID to bypass this.

The isolated project's own production environment is needed because the preserved hosted gate deliberately rejects ordinary previews. It is **not** the real Planora production project. Its original activation/release flags and shared test state may only be enabled after explicit future authorization for this mock-only test project. The real application's flags/state remain disabled. Do not connect main's Git integration in a way that automatically deploys either project.

Current Vercel documentation describes VERCEL_PROJECT_ID as platform metadata available at build/runtime; verify that metadata is actually exposed in the chosen project's settings. [System variables](https://vercel.com/docs/environment-variables/system-environment-variables). The artifact tracing-root setting follows [Next.js output documentation](https://nextjs.org/docs/app/api-reference/config/next-config-js/output).

## Isolated configuration inventory — names only

| Name | Scope / requirement |
| --- | --- |
| VERCEL, VERCEL_ENV, VERCEL_PROJECT_ID | Platform context of the dedicated mock-only project; must match the immutable binding. |
| VERCEL_OIDC_TOKEN / runtime OIDC context | Vercel-managed BotID integration; do not expose/copy a captured token. |
| PLANORA_PRODUCTION_ORIGIN | Exact canonical HTTPS origin of that isolated project; despite the existing variable name, never the real Planora origin for this artifact. |
| PLANORA_SECURITY_NAMESPACE | Unique mock-vercel-prefixed namespace; original hosted code appends its production suffix inside the test database. |
| PLANORA_IP_HASH_SECRET | Independent high-entropy test secret, not a production or provider credential. |
| UPSTASH_REDIS_REST_URL | Bound dedicated test endpoint; keep its exact spelling stable. |
| UPSTASH_REDIS_REST_TOKEN | Writable test-only REST credential; no production token. |
| AI_ENABLE_HOSTED_GENERATION, AI_HOSTED_RELEASE_APPROVED | Existing hosted gates, still disabled here. Future activation requires separate mock-only test approval; neither bypasses the other controls. |
| AI_ENABLE_LOCAL_GENERATION | Disabled on Vercel; only the dedicated local browser subprocess opts in. |
| GEMINI_API_KEY, GOOGLE_API_KEY | Must be absent; nonempty values cause artifact safety/runtime rejection. |
| GEMINI_MODEL | Not required or used by the copied generation route; main local configuration is preserved. |
| OVERRIDE_BOTID_SERVER_URL | Must be absent; no BotID verification override. |
| PLANORA_MOCK_ARTIFACT_DIR | Local browser-runner input only, not an application/deployment switch. |

Keep environment files ignored and private. No local .env values were written or copied. Vercel environment updates require an appropriate reviewed rebuild/redeployment; do not assume a dashboard edit updates every running instance instantly.

## Redis and manual cloud checks — pending

Use a dedicated test database/credential, not production state; verify eviction disabled, capacity/billing limits, endpoint binding and current consistency/failover guarantees. The unique namespace is for isolation, not permission to reset exhausted production quotas. Phase 5B established bounded normal-operation compatibility; this phase made no further Redis requests.

Retain the Phase 5A/5B requirements and gather the following evidence after separate approval:

1. **Session/Redis path:** human browser redeems a fresh test invite, receives Secure/HttpOnly/SameSite cookie, gets fixed TEST ONLY output, saves/reopens it. Invalid/expired/revoked sessions, quotas and kill state reject. Compare aggregate shared attempt counters: zero new attempts on initial rejection implies no provider dispatch through the preserved handler. A positive test should consume exactly one attempt for the deterministic valid response. Do not infer actual cloud results from local injected tests.
2. **Headers:** test valid-looking forged platform/generic forwarding headers from the same source; prove Vercel's authoritative IP identity remains stable. Test canonical/mismatched Origin/Host and cross-site requests, IPv4/IPv6, and noncanonical deployment URLs. No raw IP, cookie or header values in retained evidence.
3. **BotID:** use real human browsers for positive tests; verify missing/tampered challenge, nonhuman, bypassed and timeout/error handling. Keep the existing server verification and client challenge; do not add bypasses to make automation pass. Do not treat a synthetic BotID callback as a real platform result.
4. **WAF:** preserve system protections; review endpoint-scoped rules in log mode, then authorize operator publication for enforcement in the isolated test project. Prove edge denials via WAF evidence and absent function/attempt activity, and verify benign human access. This artifact enables no WAF rule.
5. **Concurrency/failures:** run multiple actual workers, test quota/lease ownership and expiration, service outage and shared shutdown. Keep traffic small and predetermined; no failover/storage-exhaustion experiment without additional approval. Fixed-window behavior and provider consistency risks still require review.

Disable HAR/video/traces before entering private access data; retain only safe statuses, aggregate counters, hashes and timing. Never put real invites, cookies, credentials or endpoint URLs in logs/reports. The mock provider does not emit prompt/token logs or add a public invocation-counter endpoint.

## Cleanup and rollback

- Stop the local browser/server processes after verification. Keep generated files ignored; retain existing reports and evidence rather than deleting them.
- For a future failed cloud test, stop new traffic, disable only the isolated project's activation flags and remove only its shared mock generation-state marker using the reviewed operator procedure. Revoke test invites/sessions; allow owned leases to finish/expire. In-flight operations cannot be recalled.
- Clean up only keys proven to belong to that run's test namespace, using bounded SCAN/MATCH and checked key-by-key/batched deletion. Never FLUSHDB/FLUSHALL or delete another namespace. Never copy quota snapshots into production.
- Disable/delete an isolated deployment/project only under the relevant authorization; do not promote it, change real production flags or replace the real production artifact. Roll back to a known reviewed mock-only artifact or leave the isolated service disabled.
- Rebuild rather than editing a sealed artifact in place. Runtime secrets never belong in the manifest/upload, Git or test output. Main's normal production build has no mock switch to roll back.

## Verification and remaining approval

Main project: TypeScript/lint passed; 192 automated tests, production build and 28 desktop/mobile browser tests passed. Focused mock-construction plus hosted-security run: 69 passed. New tests cover deterministic output, aborted calls, unchanged protections, SDK/key exclusion, manifest tampering, project/endpoint/namespace separation, blocked Google/unapproved destinations and redirect refusal.

Final artifact: .impeccable/mock-vercel-9jfkxN. TypeScript and lint passed; **166 applicable automated tests across eight files passed**, production build and both source/compiled SDK-exclusion checks passed, and **four dedicated desktop/mobile browser checks passed**. The installed artifact has no Google SDK package and no environment files. The actual copied API generated strict fixture plans without a key, preserved exact INR 30,000 totals, saved/reopened task completion, rejected cross-origin requests and kept local hosted-access redemption closed. No external browser destination was attempted. The artifact component assertion was adapted to its mock-only notice after an earlier test correctly detected the production-copy mismatch; final checks passed after that correction.

Artifact tests intentionally exclude the four real SDK adapter contracts because that dependency does not exist in this copy; those contracts still pass in main. Local session/quota/cookie tests execute unchanged security code with offline Redis/BotID mocks. No new real-service result is claimed.

The final local manifest SHA-256 is a012ac74a5870ea5a50af5898ebf0b998867df9c1d631ef9e732a230d6121a74. Its baseline SHA is 373d145 and its per-file hashes describe the constructed source with this phase's new templates; it is not misrepresented as a pre-existing artifact from baseline Git alone. A future deployable bound artifact must be reconstructed from the subsequently committed/reviewed constructor and retested; it will have a different manifest hash. Private local builds/manifests/results are not committed.

Files delivered on main: scripts/prepare-mock-vercel.mjs and its declaration; verification/mock-vercel/{provider.ts,policy.ts,safety.mjs,browser.config.ts,browser.spec.ts}; tests/integration/mock-artifact.test.ts; this report. No existing application code, normal package/lockfile/configuration or environment file was modified. No mock mode was introduced into the normal production release.

Independent review must inspect the constructor, exact manifest/diff, immutable binding, runtime instrumentation/egress policy, copied route sentinel, cloud credentials/permissions, BotID/WAF, Redis failover guarantees and actual upload contents. This preparation is not that independent review and is not approval to deploy. Judge-access/Antigravity eligibility issues remain unresolved. **Exact next step: obtain independent review and separate approval to configure and deploy only a newly bound mock artifact to an isolated Vercel test project.**
