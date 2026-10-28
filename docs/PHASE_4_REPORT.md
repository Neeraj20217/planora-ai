# Phase 4 — Secure hosted generation implementation

Completed implementation and local verification: 28 October 2026, based on main commit 4eafc45. **Hosted generation remains disabled by default and is not approved for release.** No deployment, live Gemini request, external service setup or challenge submission occurred. Existing local Gemini configuration was preserved.

## Delivered

- Single-use high-entropy invite redemption; SHA-256 invite/session hashes in Redis; bounded server-side session expiry; Secure/HttpOnly/SameSite=Strict __Host- cookie; logout and invite-wide revocation.
- Accessible generation-access page, safe failure messages, code clearing, no URL/browser storage of tokens, and navigation from the existing application. One redundant brand label was removed to resolve the accessibility name mismatch found by the new page scan.
- Atomic Redis Lua admission: trusted-IP burst quota, invite/day quota, global provider-attempt/day quota and concurrent ownership leases. Each actual provider invocation, including retry/repair, separately checks shared state and consumes its allowance. Existing two-attempt orchestration and strict validation remain intact.
- Distributed redemption brute-force counters, fail-closed Redis/bot deadlines, deployment/release gates, production origin/Host checks, production-only environment separation and operator shutdown. No in-memory fallback for hosted requests.
- Vercel BotID Basic client/server wiring with no hosted development bypass; direct Vercel IP header use with HMAC storage. The browser challenge is not initialized on loopback, preserving local development and offline browser tests.
- Private operator CLI for issue/revoke/disable, plus a detailed [configuration and release runbook](HOSTED_SECURITY.md). No administrative browser API or enable CLI action was added.

## Files created or modified

New: src/lib/server/hosted/{security,scripts,redis,runtime,access}.ts; src/app/api/access/{redeem,logout}/route.ts; src/app/access/page.tsx; src/components/access-form.tsx; src/instrumentation-client.ts; scripts/access-admin.mjs; tests/fixtures/lua-redis.ts; tests/integration/hosted-security.test.ts; tests/e2e/access.spec.ts; docs/HOSTED_SECURITY.md; this report.

Modified: existing generation route/handler, generation error messages, navigation, root layout accessible brand name, .env.example, README.md, package.json and lockfile. Added pinned botid 1.5.11 and development-only fengari 0.1.5. No planning schema, model selection, provider configuration or persistence behavior was changed. .env.local was not edited or staged.

## Actual verification

| Check | Final result |
| --- | --- |
| TypeScript | Passed |
| Lint | Passed, zero warnings |
| Focused security + generation suite | 65 passed on initial run; additional security regressions included in final full suite |
| Full automated suite | 170 passed across 9 files, including 47 new hosted-security tests |
| Browser suite | 28 passed on desktop/mobile production server, retries disabled |
| Production build | Passed; new access page and access API routes compiled |
| Production dependency audit | Zero reported vulnerabilities |

The browser run found and drove fixes for loopback BotID interception, disabled-field focus timing and a redundant brand accessible label. The final full run passed after those corrections. Browser access success paths use synthetic HTTP mocks; the real unconfigured access route returns 503. No live Google calls are used by tests.

Security tests cover missing/forged/duplicate/expired/revoked cookies and invites; forged invite IDs; cross-site Origin/Host and generic forwarding headers; malformed platform-IP values; brute-force/global redemption limits; shared concurrent admission; IP/invite/global quotas; retries/repair accounting; lease expiry and ownership; kill switches and Redis failures; transport timeout; and missing/preview configuration. Initial rejections assert zero provider calls. A denied retry asserts zero additional calls after the earlier provider attempt.

The exact production Lua runs offline in Fengari against a deterministic Redis primitive model. This does not establish Upstash compatibility, cloud concurrency under real failures, actual platform header overwriting, BotID classification or WAF configuration. Independent security review has **not** occurred. Local passing tests must not be described as production approval.

## Required setup and release blockers

Follow HOSTED_SECURITY.md for the exact variable names, fixed quotas, session lifecycle, operator commands and platform procedure. Required server names: GEMINI_API_KEY, GEMINI_MODEL, AI_ENABLE_LOCAL_GENERATION, AI_ENABLE_HOSTED_GENERATION, AI_HOSTED_RELEASE_APPROVED, PLANORA_PRODUCTION_ORIGIN, PLANORA_SECURITY_NAMESPACE, PLANORA_IP_HASH_SECRET, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN. VERCEL and VERCEL_ENV are platform-provided. All hosted flags stay disabled in the template; no production values were set.

Before a safe live URL: arrange a separate Upstash database with primary script semantics/no eviction, configure private Vercel environment and domain, verify BotID and staged WAF protections, test actual distributed failures with mocked Gemini, and obtain independent review. Then obtain separate release authorization before deployment/activation, issue a private invite and run one authorized quota-budgeted live smoke test and shutdown check. Preview credentials must remain separate; ordinary preview generation is deliberately blocked.

Remaining risks: bearer invite/session theft, non-transactional gap between Redis reservation and external provider dispatch, inability to recall in-flight calls, denial of service/cost outside the app's model cap, infrastructure eviction/data loss or operator quota deletion, and legitimate-user throttling behind shared IPs. The global cap is attempts, not a currency guarantee. No public production-safe claim is made.

Final audit: 83 tracked/candidate files, about 0.55 MB total, with zero common credential/private-key patterns, zero matches for the existing local Gemini key, zero forbidden environment/build/dependency files, and zero checked server-secret/provider markers in browser bundles. Existing Git history also had zero common credential-pattern matches. .env.local remains ignored. Git metadata before commit was about 0.29 MB. Pattern scans cannot prove absence of every possible secret. Commit/push identity and the final remote match are supplied in the completion message, avoiding a self-referential hash.
