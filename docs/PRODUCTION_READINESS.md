# Production-readiness assessment — 27 October 2026

Historical Phase 3 assessment. Phase 4 implements the proposed core controls but keeps hosted generation disabled. See [HOSTED_SECURITY.md](HOSTED_SECURITY.md) for current implementation, setup and independent-review blockers, and [PHASE_4_REPORT.md](PHASE_4_REPORT.md) for actual local verification. No cloud protections are claimed enabled.

Status: the local planner works, but hosted Gemini generation is intentionally NOT ready to enable. This assessment proposes protections; none were provisioned, enabled or deployed. Local Gemini configuration and the existing hosted gate are unchanged.

## What blocks hosted generation today

In src/app/api/plans/generate/route.ts, hosted is Boolean(process.env.VERCEL), and localEnabled requires AI_ENABLE_LOCAL_GENERATION=true. In src/lib/server/handler.ts, a configured key is necessary but not sufficient: any hosted request, disabled local mode, or browser authority outside localhost/127.0.0.1/[::1] returns ENDPOINT_DISABLED before provider access. Thus setting the local flag on Vercel does not enable generation.

The current route independently validates JSON, the 32 KiB body limit, event constraints, origin and output. It bounds timeouts and provider attempts. Its limiter, however, is one process's in-memory counter/boolean: restarts and additional instances reset or multiply capacity. There is no application login/session check, shared quota, distributed concurrency lease, verified bot signal or global provider-attempt spending ceiling. Origin and Host checks are not authentication: non-browser callers can forge them. Do not simply remove the hosted/loopback checks or assume the local flag is production authorization.

## Minimum practical public-demo design (proposed)

Keep the site publicly reachable while restricting paid generation to invited judges/testers. This avoids a full user-account product and adds one shared store, not an event database. Confirm competition rules permit an invitation-protected AI endpoint; an unrestricted anonymous demo has a different abuse profile.

1. **Invite access and sessions.** Use high-entropy expiring invite codes, one per judge/tester, stored hashed server-side. Exchange a code through a validated same-origin POST for an opaque random session. Store only a hash of that session in Redis with an invite ID, expiry and revocation state; set a Secure, HttpOnly, SameSite cookie. No code in URLs, browser bundles, localStorage or logs. A verified session is mandatory before every generation. Add a simple access form/logout and rate-limit the login endpoint. This is demo access control, not proof of a person's identity. Managed OAuth with an allowlist is an alternative if actual user identities become required.
2. **Atomic distributed limits.** Use Upstash Redis's HTTPS API from Vercel's Node runtime. An atomic server-side script must check/reserve all limits together: invite quota, trusted-platform-IP burst quota, global provider-attempt/day cap and a short-lived concurrency lease. Initial demo policy could be 3 requests/minute/IP, 5 generations/day/invite, 40 provider attempts/day globally and 2 active calls. These are proposed values, not installed settings. Charge each real provider attempt, including retries/repair; never trust a client-supplied invite ID. A new cookie must not reset the invite quota.
3. **Fail closed.** If auth lookup, Redis, quota reservation, lease or bot verification fails, return 401/429/503 as appropriate and make zero Google calls. Expire leases after a deadline longer than the provider operation and release using an ownership token so an old worker cannot clear another worker's lease. Use TTL counters and atomic admission; a read-then-write counter or process cache is insufficient. Add an operator kill switch. Scope keys to this app/environment.
4. **Edge/bot controls.** Apply Vercel WAF rules to generation and access endpoints to reject obvious abuse before function execution. Add BotID Basic client and server verification where supported. Neither bot detection nor IP limits replace invite authorization or the shared global quota. Use a platform-derived client IP rather than trusting arbitrary forwarded headers. Avoid an app-level bypass for automation on production.
5. **Retain existing safeguards.** Preserve the response-schema compatibility fix, strict local validation, body limits, server-only keys, no-store responses, origin validation, bounded calls, safe errors and estimate labels. Configure an explicit production origin allowlist rather than accepting Host as authorization. Keep test/preview quotas and credentials separated. Do not introduce cross-device event storage merely to add security.

No new authentication/rate-limit dependencies were installed for this assessment. This path is feasible with a single Next.js Node deployment and a REST Redis service; it still needs implementation and independent review/testing before the gate changes.

## Evidence required before enabling the hosted path

- Missing/invalid/expired/revoked sessions, blocked IPs and bot failures cause zero provider calls; brute-force invite attempts are limited. Cookies have correct flags and a bounded lifetime.
- Parallel requests from two independent handler instances share limits; boundary bursts cannot exceed the cap. Retry/repair consumes the global attempt budget. Different sessions for one invite cannot evade limits.
- Redis timeout/outage, exhausted quotas and lease expiry/ownership races fail safely. Verify no partial admission or permanent lock after failure.
- Browser and direct HTTP requests, forged Origin/Host/forwarding headers and cross-site requests cannot bypass authorization. Test production/preview separation and kill-switch operation.
- A reviewer other than the implementer verifies the controls against the deployed platform configuration. Only then replace the unconditional hosted gate with the verified production path; disabled remains the default when settings are missing.
- With separately authorized release/testing, stage the exact main commit, test judge access, mobile save/reopen and one quota-budgeted live generation, then promote that tested build. No release is authorized by this document.

## Feasibility and additional costs

USD list prices checked on 27 October 2026; taxes, regional usage and account eligibility can change. No services were purchased and no actual billing/plan quota was inspected.

| Service | Small-demo estimate / limitation |
| --- | --- |
| Vercel hosting | Hobby lists $0/month for eligible personal non-commercial work; Pro starts at $20/month with usage charges/credits. Confirm eligibility and actual function/traffic quotas. |
| Invite/session access | No separate paid identity service is required for the proposed invite flow; session data uses Redis. Implementation and security verification are still work. |
| Upstash Redis | Free tier: 250 MB, 500K commands/month, 10 GB bandwidth. May cover a small capped demo; no production SLA is assumed. Pay-as-you-go commands list $0.20/100K, plus applicable storage/bandwidth. Measure actual command/script accounting. |
| Vercel abuse controls | Basic BotID is free on all plans. Deep Analysis is optional and lists $1/1,000 checks on Pro; not needed for this proposal. WAF availability/allowances must be checked for the selected plan; rate-limiting pricing lists $0.50/million allowed requests. |
| Gemini 3.5 Flash-Lite | Current standard paid rates list $0.30/million input and $2.50/million output tokens (including thinking). At the previously observed 475 input + 771 output tokens, one call is about $0.00207, or $0.21/100 single-attempt calls. This is an illustration, not a cap: prompts, output, retries and pricing vary; free quota is account-specific. |

Practical starting budget: $0/month fixed platform fees if eligible for both free tiers, plus Gemini/usage costs; otherwise at least Vercel Pro's base price plus applicable usage. Redis and provider quota exhaustion must stop generation rather than trigger an unbounded fallback. Spend alerts are notifications, not hard spending caps; the global admission limit, per-call token bounds and kill switch are the application backstops.

Vercel Authentication with All Deployments is also available without a paid add-on and can protect an invite-only staging/review URL. It restricts access to suitable Vercel users and is not an anonymous public-app login. Shareable/bypass links are bearer access, not per-judge identity, and do not solve distributed quotas. Native Password Protection is a paid Pro option; this proposal does not depend on it.

### Primary sources

- [Vercel pricing](https://vercel.com/pricing)
- [Deployment Protection scopes and availability](https://vercel.com/docs/deployment-protection)
- [Vercel WAF usage/pricing](https://vercel.com/docs/vercel-firewall/vercel-waf/usage-and-pricing)
- [BotID pricing and integration](https://vercel.com/docs/botid)
- [Upstash Redis pricing](https://upstash.com/pricing/redis)
- [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing)

## Remaining submission work

Implement and verify the selected access/shared-limits path, obtain release approval, and configure the actual host/environment before a functional hosted AI URL exists. Recheck model account quota and real response quality under the revised prompt with a deliberately budgeted test, not repeated calls. Review the remaining event types live only when authorized. Finalize README/known limitations, challenge eligibility, repository size, live judge access and the under-four-minute walkthrough. No advanced budget editor, expense system, calendar integration or collaboration is required by this minimal quality pass.
