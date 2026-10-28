# Phase 5B — Real Upstash Redis verification

Date: 28 October 2026 (Asia/Kolkata). Application baseline: main, d516d6f. Scope: bounded testing of the actual configured Upstash HTTPS REST test database, using application security code and mocked Gemini responses. **This is not an independent security audit or a hosted release approval.**

## Outcome

| Result | Status |
| --- | --- |
| Redis authentication and write/read/delete | PASS |
| Security checks | 20 passed, 0 failed |
| Connection/cleanup/environment/network safety checks | 4 passed, 0 failed |
| Total named checks | **24 passed, 0 failed** |
| Atomic rate limiting and concurrency | PASS for tested normal-operation cases |
| Authentication, single use, revocation and expiration | PASS |
| Cleanup | PASS: 78 test-created keys deleted; namespace scan found none remaining |

The temporary Vitest wrapper contains one test orchestrating 24 named checks; these are not 24 separately reported Vitest test cases. The saved result list, rather than the outer runner's success alone, was checked for failures.

Actual test duration: about 94.7 seconds (runner duration about 95.6 seconds), including natural expiry of the application's unchanged 90-second leases. Transport use: **189 HTTPS REST requests**, bounded by a 350-request safety ceiling. Internal Redis command billing can differ from REST request count; no account usage/billing dashboard was inspected. **12 mocked provider invocations, zero live Gemini requests, zero attempted non-Redis network destinations.**

## Configuration and isolation

- .env.redis-test.local existed, was untracked and Git-ignored, and contained syntactically valid non-placeholder UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN entries. Values were neither displayed nor logged. Successful authenticated Redis operations establish that this credential worked for this test.
- The user identified the database as planora-test, Mumbai, Free Tier. These account-level name/region/plan settings and eviction policy were not independently inspected through a management API/dashboard; REST success does not verify those attributes.
- Read .env.redis-test.local privately using Node's environment parser without importing .env.local into the process. SHA-256 comparisons confirmed both existing environment files were unchanged after testing; digest values were not printed.
- Used a cryptographically unique disposable Redis root namespace, with separate case prefixes. Command guards restricted every explicit read/write/delete key and cleanup scan to that root. No production namespace, existing user keys or deployment settings were altered. No FLUSHDB or FLUSHALL was used.
- createHostedSecurity/createPlanHandler/accessHandler were instantiated locally with injected synthetic configuration and deterministic provider responses. Synthetic state markers existed only in disposable Redis test prefixes. No production hostedConfig, environment release flags, deployed route or hosted service was activated.
- The harness did not import the Gemini SDK adapter or read the real Gemini key. An outbound fetch guard allowed only the configured test Redis REST endpoint and blocked any other destination. Real BotID was replaced with a positive test callback; no Vercel or BotID service call was made.

## Tests executed

| # | Named check | Result |
| --- | --- | --- |
| 1 | HTTPS authentication, PING, write/read/delete, absent-after-delete | PASS |
| 2 | Production Lua admits two real 90-second leases and rejects a third | PASS |
| 3 | Invite creation, redemption, hardened cookie and hashed session mapping; valid mocked generation | PASS |
| 4 | Concurrent redemption of one code: exactly one success and one rejection | PASS |
| 5 | Missing, malformed and forged session cookies reject; zero provider invocations | PASS |
| 6 | Unknown invite rejection; zero provider invocations | PASS |
| 7 | Logout deletes the session and subsequent fresh security instance rejects it | PASS |
| 8 | Deleting an invite invalidates its associated session | PASS |
| 9 | Actual Redis session TTL expiry rejects subsequent generation | PASS |
| 10 | Actual Redis invite TTL expiry rejects subsequent generation | PASS |
| 11 | Four simultaneous same-IP admissions cannot exceed the IP allowance; subsequent request rejected | PASS |
| 12 | Exactly five invite generations accepted using changing IPs; sixth rejected | PASS |
| 13 | Independent concurrent handler/security instances: two held mock calls; third denied | PASS |
| 14 | Global counter seeded at 39: one invalid-JSON attempt consumes the last allowance; repair blocked | PASS |
| 15 | Global counter seeded at 39: one transient failure consumes the last allowance; retry blocked | PASS |
| 16 | Repeated invalid provider JSON: two attempts and one invite admission consumed; lease released | PASS |
| 17 | Missing shared kill state blocks generation; zero provider invocations | PASS |
| 18 | Simulated Redis exception fails closed without local/provider fallback | PASS |
| 19 | Simulated hung REST transport reaches bounded timeout and fails closed | PASS |
| 20 | Five bad invite attempts consume brute-force allowance; valid sixth request is denied | PASS |
| 21 | Natural 90-second lease expiry admits replacements; old release cannot clear them; old owner cannot dispatch | PASS |
| 22 | Delete only test-root keys and confirm namespace empty | PASS |
| 23 | Both existing local environment files unchanged | PASS |
| 24 | No network destination other than the configured Redis endpoint attempted | PASS |

Session/invite expiry tests shortened only their disposable Redis record TTLs to one second, then waited for real expiration. They do not represent an eight-hour wall-clock endurance test. The generated redemption cookie was separately checked for Secure, HttpOnly, SameSite=Strict, Path=/ and a lifetime bounded by the invite TTL. The 90-second concurrency lease test used the unmodified production lease period.

Rate/concurrency tests used distinct local handler/security objects issuing actual concurrent REST requests against shared Redis state; they did not involve separate OS worker processes or Vercel instances. IP headers were synthetic test inputs, not verified edge-derived identities. The IP race permits additional denials from the independent concurrent-operation cap; the follow-up assertion checks that the exhausted IP cannot admit another request. The invite test independently established its exact five-generation threshold.

Failed-attempt checks assert zero additional provider invocations after quota rejection; an earlier intentionally failed mocked provider attempt is still counted. Initial unauthorized/outage/kill-state rejections made zero provider calls. Outage and hung-transport cases were injected locally; the actual Upstash service was not stopped, exhausted or reconfigured.

## Actual compatibility findings

The application REDEEM, SESSION, ADMIT, ATTEMPT and RELEASE Lua scripts executed successfully over real HTTPS REST, including Redis TIME, dynamic key references, string/counter TTLs and sorted-set lease operations. Normal-operation single-use and concurrency behavior held under the tested interleavings. Per-invite/global quotas, conservative failed-attempt accounting, expiration and owner-specific release behaved as expected. The production redisREST adapter's existing 1.5-second deadline was preserved for real requests; no transport timeout extension or automatic retry was added.

These results establish compatibility and behavior for this run, not linearizability through every partition/failover. They do not resolve the Phase 5A consistency warning or establish actual eviction policy. REST primary/failover guarantees, data-loss recovery and multi-region behavior still require provider evidence and independent review.

## Security issues discovered

**No confirmed application security defect was observed in the tested cases.** No source changes or protection weakening were necessary. Passing bounded tests cannot establish absence of vulnerabilities, production scalability, cloud control configuration or an independent audit.

## Local artifacts and Git status

Created only:

- docs/PHASE_5B_REDIS_VERIFICATION.md — this report.
- .impeccable/phase5b.config.mts — ignored temporary runner configuration.
- .impeccable/phase5b.test.ts — ignored, network-restricted real-Redis harness.
- .impeccable/phase5b-results.json — ignored safe result counts/list, no credentials or tokens.

Reproduction command from the project root: `npx vitest run --config .impeccable/phase5b.config.mts`. **Do not rerun unless another bounded real-Redis run is explicitly intended.** This harness is local, not a new default-suite network dependency. The earlier untracked Phase 5A review was preserved. No application source, dependency manifest, environment, production setting or existing report was changed. No commit or push occurred; baseline remains d516d6f.

## Remaining deployment blockers and recommended next action

1. Independently review security code, Redis guarantees and actual test database/production eviction and access policies; this run was not an independent audit.
2. Prepare and review an isolated mock-only Vercel validation artifact. With separate approval, test real platform header sanitization, hardened cookie delivery, origin handling, actual BotID human/bot/bypass/outage behavior, WAF edge enforcement and environment separation. Current ordinary previews deliberately remain blocked.
3. Add separate-process/actual-cloud-worker concurrency and deployment-duration evidence, boundary-window/clock-skew and controlled failover/partition tests. Do not infer those results from this single-process REST test.
4. Verify operational shutdown, credential rotation, redacted observability, capacity/cost settings and recovery without resetting quota state.
5. Resolve judge invite delivery/expiry/access expectations and competition eligibility before submission.

Recommended next action: obtain independent security review and explicit authorization for an isolated **mock-only** Vercel verification phase. Keep real hosted generation disabled. This report authorizes no deployment, live Gemini test, paid resource or competition submission.
