# Phase 5A — Release preparation and security self-review

Date: 28 October 2026. Reviewed baseline: d516d6f. Result: **NO-GO for activation/deployment.** This is the implementer's self-review, not an independent audit. No account configuration was inspected, service provisioned, flag activated, deployment performed or Gemini request sent.

## Review findings and disposition

No confirmed critical source-code defect was identified in this bounded review. This does not establish that the implementation is vulnerability-free. No application source, dependencies, schemas, model settings or environment files were changed. The following unresolved deployment/security requirements are release blockers, not reasons to weaken the existing gate.

| Finding | Evidence / impact | Required disposition |
| --- | --- | --- |
| Real shared-state guarantees remain unverified | Production scripts execute via ordinary EVAL, use Redis TIME and dynamically address several keys. Fengari models primitives but not the service, replication, OOM, partitions or failover. | Test exact scripts against the selected Upstash service and obtain independent review of its failure guarantees. Normal atomic execution is not proof of linearizable behavior through every outage. |
| Earlier strong-consistency wording is not an actionable setting | Upstash documents eventual consistency and deprecation of its former strong-consistency mode. | Do not treat HOSTED_SECURITY.md's phrase “primary/strong write/read semantics” as a dashboard option or a verified guarantee. Establish authoritative EVAL execution and acceptable failover behavior with provider evidence; if the needed guarantees cannot be established, keep the gate closed and separately review a different state-service/design. |
| Cloud mock-only verification artifact is missing | The production route imports the real Gemini adapter; its injected-provider seam is available to tests. There is no hosted mock flag or mock HTTP endpoint. | Prepare a separately reviewed, isolated mock-only test artifact before any future Vercel happy-path test. A fake API key is not a mock: it could still send a real Google request. |
| Previews deliberately fail closed | hostedConfig requires VERCEL_ENV=production. | Do not change/spoof this platform variable or relax the guard for convenience. Future cloud tests need an isolated test project using its own production environment, mock-only artifact and test database, under separate deployment approval. |
| Platform IP trust is an external prerequisite | Only x-vercel-forwarded-for is accepted; generic forwarding headers are ignored. Unit requests cannot establish that Vercel overwrites a valid-looking attacker-supplied platform header. | Prove this on the actual direct Vercel edge, including IPv4/IPv6 normalization; no external reverse proxy until separately reviewed. |
| BotID/WAF are not verified enabled | Client/server integration exists; no platform setup or traffic evidence exists. App quotas occur after some function/BotID work. | Verify human/bot/bypass/outage behavior and endpoint-scoped WAF enforcement. App attempt limits do not cap all cloud/BotID/Redis charges. |
| Judge access can expire or be consumed | Codes last 24 hours, are single-use; sessions last at most eight hours and five generations per invite/day are allowed. Logout/lost redemption response needs a new code. | Confirm the organizer's access rules and evaluation window before inviting judges; do not publish a bearer code in the repository or submission URL. |

Official service references: [Upstash consistency](https://upstash.com/docs/redis/features/consistency), [key-based locking](https://upstash.com/docs/redis/features/key-locking), [EVAL primary routing explanation](https://upstash.com/blog/replicated-cache-backed-by-redis). Upstash currently documents global locking for scripts without allow-key-locking, permitting dynamic keys; the code does not set that flag. That removes a suspected dynamic-key incompatibility, but real-service testing is still required. Do not optimize to key-based locking or EVAL_RO without a fresh review.

### Controls inspected

- Config gate: both separate release/activation flags, Vercel production environment and complete config are mandatory. Local enablement cannot override the hosted path.
- Sessions: random independent tokens, hashed server records, strict duplicate-cookie rejection, bounded cookie lifetime, invite revocation checked again before each provider attempt. Browser POST origin/Host checks complement sessions; they are not identity checks.
- Redis: atomic admission, conservative quota reservations, global attempt increment before each SDK invocation, ownership-token lease release, automatic expiry, safe errors, bounded transport and no backend-error fallback/retry.
- Provider: existing two-attempt orchestration and disabled SDK retries remain intact; strict planning validation and streamed body limits are preserved.
- Operations: shared kill state checked before attempts, but cannot recall dispatched Google work or remove the reservation/dispatch race. Namespace/database resets or eviction can invalidate quota assumptions. Local development with its opt-in flag must bind to loopback; a forged Host is not proof of a network peer's address on a self-hosted public listener.
- Operator CLI: writes raw invites only to an ignored local file and reports only its hash/path. Use the repository root, restrictive Windows ACLs and private delivery; do not treat mode 0600 as verified Windows access control. A timeout can consume an invite conservatively.

## Exact setup checklist — prepare only, do not execute during Phase 5A

Every checkbox below is **pending** unless an independent reviewer records evidence. Do not purchase resources or click any import action that creates a deployment without separate authorization.

### 1. Release and account prerequisites

- [ ] Confirm Neeraj20217/planora-ai ownership, reviewed main SHA, access rights and intended Vercel team/project. Record reviewer and release approver separately.
- [ ] Confirm account plan eligibility, spending ceilings/notifications and allowed test resources. No upgrade, add-on or auto-upgrade is authorized here.
- [ ] Check GitHub/Vercel integration and automatic deployment behavior before connecting/importing the repository or pushing release changes. Keep automatic production deployment disconnected/disabled during preparation. Import can itself initiate deployment.
- [ ] Agree on one canonical public HTTPS origin and how judges obtain access privately. Do not use deployment aliases/wildcards as automatic allowlists.

### 2. Upstash, after separate resource approval

- [ ] Use a dedicated production database; use a different database, credentials and namespace for verification. Choose the primary region near the future Vercel function region. No shared cache/application database.
- [ ] In database Configuration, verify **Eviction disabled**. Upstash documents this as the default; verify actual state instead of assuming it. Reject-on-full behavior must fail closed. Do not enable auto-upgrade without explicit cost approval. [Eviction reference](https://upstash.com/docs/redis/features/eviction).
- [ ] Obtain the writable REST endpoint/token privately. Do not copy credentials into URLs, commands, screenshots, this checklist or NEXT_PUBLIC variables. A read-only token cannot run admission writes.
- [ ] Check exact EVAL scripts and TIME, GET, SET/EX/NX, EXISTS, TTL, DEL, INCR, EXPIRE, ZADD, ZSCORE, ZCARD, ZREM and ZREMRANGEBYSCORE behavior. Confirm ordinary EVAL executes against authoritative state, remains atomic across its dynamic keys, and has no replica routing optimization added.
- [ ] Obtain evidence for failover/partition/data-loss behavior. Read-your-writes tokens alone are not a multi-worker global-quota proof. No “Strong Consistency” checkbox is assumed available.
- [ ] Verify operator privileges, TTL cleanup, capacity alerts, budget/command allowances and recovery procedure. Never delete live quota keys, restore old quota snapshots, rotate namespaces or use FLUSHDB as an operational reset.
- [ ] Leave the production generation-state key absent. Its exact naming is `planora:<PLANORA_SECURITY_NAMESPACE>:production:generation-state`; absence is the safe initial state. Do not initialize it during preparation.

### 3. Vercel, after separate configuration/deployment approval

- [ ] Use Next.js with the repository root, Node 24.x, locked dependencies via npm ci, npm run build, framework-managed output, Node route runtime and the committed maxDuration. Confirm actual plan supports the route duration; do not lower it without lease/timeout review.
- [ ] Configure the exact HTTPS production domain/origin; verify TLS, Host normalization and any trailing-slash/redirect behavior without sending invites through redirects. Use direct Vercel edge access, no external proxy.
- [ ] Add only production-scoped variables listed below. Keep both hosted gates disabled, local enablement disabled on Vercel, and shared production state absent. Ordinary previews must have no production Gemini/Redis secrets and must return disabled errors even if flags are accidentally present.
- [ ] Verify protected noncanonical deployment URLs cannot bypass the canonical-origin/session checks. Select appropriate Deployment Protection for private verification; a Vercel login wall can separately block judges and is not the app's session system. Never publish protection-bypass tokens.
- [ ] Check BotID Basic platform support and challenge routing with the pinned package. Do not set custom BotID server overrides or add an automation bypass. Preserve explicit non-development server checks. [BotID setup](https://vercel.com/docs/botid/get-started).
- [ ] Keep system DDoS protections enabled. In Firewall, scope draft rules to POST /api/access/redeem and POST /api/plans/generate, begin with log-only observation, inspect legitimate human traffic, then review a blocking/rate policy in the isolated test project. Have the authorized operator publish any future change. No rule is enabled by this document.
- [ ] Suppress request bodies, invite inputs, Cookie/Authorization values, HAR/traces and environment dumps in platform observability, application telemetry and testing. Retain only safe status/counter/latency evidence. Confirm this at each layer, not just in app source.

### 4. Variable inventory — names only

| Name | Scope / requirement |
| --- | --- |
| GEMINI_API_KEY | Production secret, added only for a separately approved real release. Absent from all mock-only artifacts. Preserve local file. |
| GEMINI_MODEL | Production model selection must match the reviewed local configuration; no automatic model switch. |
| AI_ENABLE_LOCAL_GENERATION | Existing local-only switch; keep disabled in every Vercel environment. |
| AI_ENABLE_HOSTED_GENERATION | Activation gate; keep disabled during preparation. |
| AI_HOSTED_RELEASE_APPROVED | Separate release gate; keep disabled until independent sign-off and release approval. |
| PLANORA_PRODUCTION_ORIGIN | Exact canonical HTTPS origin with no path, trailing slash or wildcard. |
| PLANORA_SECURITY_NAMESPACE | Unique reviewed app namespace matching source constraints; isolate test/production. |
| PLANORA_IP_HASH_SECRET | Independent high-entropy server secret; at least 32 characters; not reused from another credential. |
| UPSTASH_REDIS_REST_URL | Private production endpoint configuration; source allows only HTTPS Upstash endpoints. |
| UPSTASH_REDIS_REST_TOKEN | Writable production REST credential; server-only, least-privilege operator access. |
| VERCEL, VERCEL_ENV | Platform-provided values; do not manually spoof/override them. |
| VERCEL_OIDC_TOKEN / runtime OIDC context | BotID platform integration dependency; verify platform delivery, do not paste a captured token into clients or test reports. |

Environment changes apply to the deployments that receive them; they are not an instant fleet-wide shutdown. Use the shared Redis kill state for future-attempt shutdown, and test it. A secret being set on Vercel does not imply a reviewed deployment exists.

## Safe mock-only verification procedures

These are future procedures, **not executed or deployment-authorized here**. No production mock fallback or runtime bypass should be added.

### A. Actual Redis with offline application execution

1. After explicit resource/test approval, prepare a temporary integration harness using createPlanHandler and createHostedSecurity. Replace only the Redis primitive model in the existing test harness with redisREST connected to a dedicated test database. Keep the ProposalProvider injected and deterministic, using tests/fixtures/planning.ts; never import/invoke geminiProvider.
2. Use an allowlisted network transport permitting only that test Redis endpoint. Deny Google/Gemini destinations and fail the run on any unexpected egress. Remove the real API key from this process, without touching .env.local. Use only a clearly synthetic non-secret provider placeholder where handler validation requires a configured value.
3. Run exact production Lua via REST; record script/commit hashes, safe response statuses, aggregate counters, TTLs and provider-spy counts. Do not log request headers, raw codes, cookies or database credentials.
4. Start at least two separate application worker processes with the same test state; a single Lua VM test is insufficient. Seed only dedicated test counters, never production state. Follow the matrix below. Retain safe evidence and delete only the known dedicated test namespace after all leases finish; do not run FLUSHDB.

### B. Vercel headers, cookies and BotID

1. First create and review a **mock-only validation artifact** derived from the pinned commit in an isolated directory. Replace the provider adapter at build time with a deterministic fixture and invocation counter; ensure the real Google SDK path cannot execute. Remove Gemini credentials, label output TEST ONLY, and enforce network denial of Google calls. Record the exact diff/artifact hash. This artifact does not currently exist and is a prerequisite, not a claimed capability.
2. Only after separate approval deploy that artifact to a dedicated private Vercel test project with its own production environment, Redis database, origin and namespace. This tests the production environment path without relaxing the ordinary-preview gate. Test-specific gate/state activation is confined to this mock-only project; the real project remains disabled. A normal preview or fake Google key cannot substitute for this isolation.
3. Use real human browsers for BotID positive cases. Do not use bypass headers to make automation pass. Check the protected API requests actually reach server verification and that cookie headers are hardened. Disable traces/HAR/video/screenshot capture before entering test access credentials; never echo them in failure output.
4. For rejected calls, require zero new mock-provider invocations; for positive calls require correct fixture composition plus exactly the expected attempt count. Browser route.fulfill success mocks alone cannot verify the deployed session/Redis/BotID path.

### C. Evidence matrix and pass criteria

| Dependency | Cases / exact expected evidence |
| --- | --- |
| Real Redis | Redeem one synthetic invite, check hashed keys and bounded TTL; immediate second redemption rejected. Logout, invite revocation and expiry prevent subsequent provider calls across workers. Single-use marker survives session expiry. |
| Real Redis admission | Hold two mock-provider requests open in separate workers using distinct trusted IPs; a third valid request is denied without entering the mock provider. Release one and check capacity returns. |
| Real Redis quotas | Sequential requests prove the 3/IP/minute and 5/invite/UTC-day limits. At global count 39, one invalid-output/transient mock attempt consumes the remaining allowance and repair/retry is denied: exactly one prior call, zero additional calls. Repeat with separate sessions for the same invite to prove no quota reset. |
| Real Redis windows | Test real UTC bucket boundaries; fixed-window boundary bursts are expected, not a failing rolling-window promise. Verify Redis clock controls bucket identity despite worker clock skew. |
| Redis failures | Simulate transport timeout, invalid credential and backend rejection against test state only. API returns safe 503 with zero new mock invocations; no local limiter fallback. Ambiguous reservations may remain consumed. Test OOM/failover safely with provider tooling/support evidence; do not exhaust shared/production storage. |
| Lease races | Abandon a worker; no replacement admission before expiry, then capacity returns after 90 seconds. Releasing the old ownership token cannot remove new leases. Fail release deliberately and check automatic recovery without counter refunds. |
| Shared kill switch | Remove only the test generation-state key while a mock transient failure is about to retry. That retry and all future admissions fail with zero additional mock invocations. A completed/in-flight first call cannot be recalled. |
| Vercel headers | From the same source vary valid-looking x-vercel-forwarded-for, X-Forwarded-For, Forwarded and X-Real-IP values. Verify quota identity remains the actual edge-derived IP, without logging raw IPs. Repeat real IPv4/IPv6 and malformed/multiple-header cases; unit tests cover only parsing/ignored generic headers. |
| Vercel origin/cookies | Missing/foreign/forged Origin, Host, cross-site Fetch Metadata and invalid/duplicate cookies reject with zero new mock calls. Valid same-origin browser succeeds without URL tokens; expiry/revocation must work after another worker handles the next request. Check no unintended CORS/cache behavior. |
| BotID | Human browser succeeds; missing/tampered challenge, nonhuman, bypassed, verified-bot and verification-error/timeout cases fail closed. No mock provider invocation on rejection. Do not assert BotID classification based on user-agent alone. |
| WAF | First verify log-only rule matches without claiming enforcement. After separately approved blocking policy, selected test traffic must be rejected at the edge; correlate WAF events with absent function/mock invocations. Keep benign judge-like browsers functional. Avoid load tests or extra paid features. |
| Environment separation | Main project flags remain disabled; preview/development Vercel environments refuse generation; test credentials cannot resolve production state. Each missing required configuration fails closed. |

Archive safe evidence with project/environment, SHA/artifact hash, script hashes, timestamp, test IDs, statuses, attempt deltas and reviewer decision. No session/cookie/invite values, environment dumps or secret-bearing requests. If a check fails, stop activation and diagnose locally; never compensate by disabling a control.

## Competition judge access and eligibility

The [official PromptWars Virtual page](https://promptwars.in/promptwarsVirtual.html) asks for code plus a live preview. I found no explicit acceptance or prohibition of invite-only login on that page. It also contains broader “other AI tools” wording while its FAQ explicitly requires Google Antigravity. Organizer confirmation is necessary for this Codex-built entry; eligibility is not established by this review.

Operational conflict: a shared single-use invite fails for a second judge, automated link checks, another browser, return visits after logout/expiry, or delayed evaluation. A public Vercel login wall can add another barrier. A limited live preview is not automatically equivalent to anonymous access to paid AI.

Before submission, ask the organizer through an authorized channel whether restricted generation is accepted, how credentials are delivered privately, how many judges/browser sessions need access and the evaluation window. If accepted, arrange separate fresh invites near review time, explicit renewal support and quota capacity; do not reuse/publish one code. If anonymous core functionality is mandatory, this architecture conflicts with that requirement: retain protections, obtain a separately reviewed bounded-access design, or do not submit it as compliant. Do not silently make generation anonymous or add bot bypasses.

## Work actually performed

Reviewed the listed Phase 4 documents, all hosted modules/Lua, generation route/handler/SDK options, operator CLI, environment template, instrumentation and security tests. Checked primary provider/competition documentation. Re-ran the 47 hosted-security tests successfully with Gemini credentials cleared only in the test subprocess; no live calls. Application source unchanged, so TypeScript/full browser suite/build were not rerun; Phase 4's 170 automated/28 browser/build results are historical, not newly claimed results.

This checklist is a local preparation artifact. Because no confirmed critical source fix was necessary and the request limits commits/pushes to verified fixes, no commit or push is made for this review. Baseline remains d516d6f. External checks above are pending, and independent audit/release approval remain outstanding.
