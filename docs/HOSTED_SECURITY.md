# Hosted generation security and release runbook

Implementation date: 28 October 2026. **NOT RELEASED. Hosted access/generation is disabled by default.** No Vercel, Upstash, WAF or BotID service was provisioned/configured/verified in this task. Independent security review is outstanding. This document supersedes the proposed architecture in PRODUCTION_READINESS.md for implementation details; that assessment remains historical.

## Implemented access boundary

The public shell and browser-local plans do not require login. Hosted paid generation requires an invite session, not a full user-account system. A cryptographically random 256-bit invite expires after 24 hours and can be redeemed once. Redis stores its SHA-256 hash, active state and a single-use marker. Redemption issues a new independent 256-bit session cookie; only the session hash and invite hash are stored server-side. Session lifetime is the shorter of eight hours and remaining invite lifetime. The single-use marker lasts until invite expiry, even after logout/session expiry. A new invite is necessary to return after logout or a lost redemption response.

Cookies use the __Host- prefix, Path=/, Secure, HttpOnly, SameSite=Strict, and bounded Max-Age. No Domain attribute, URL code, client storage or raw token logging is used. Redemption is JSON POST; the input is a password field without a name and is cleared after attempts. Invalid codes have a generic failure. Logout deletes the current session before clearing the cookie. Deleting an invite revokes all its sessions, including checks before a retry. No browser endpoint can create/revoke invites administratively.

Hosted access requires VERCEL=1, VERCEL_ENV=production, both explicit release/activation flags and complete valid configuration. Previews are deliberately refused even if flags are accidentally copied. Keep previews without production Redis/Gemini credentials. Ordinary production NODE_ENV on loopback retains the existing explicit local-only workflow; it cannot activate hosted controls. Unsupported non-Vercel public hosting stays blocked. No production route falls back to a process limiter after a Redis failure.

Origin must exactly equal a single configured HTTPS origin, and Host must match its authority. Cross-site Fetch Metadata is rejected. This is CSRF defense, not identity proof: clients can forge these headers, so a valid session and bot check are independently necessary. No CORS permission is added.

## Atomic Redis policy

All script time comes from Redis TIME. Counters use fixed UTC minute/day buckets, not local worker clocks. Limits are deliberately small demo constants, not browser settings:

| Scope | Policy |
| --- | --- |
| Invite redemption | 5 attempts / IP / fixed 15-minute window; 100 attempts globally / minute; malformed string codes count too |
| Generation | 3 requests / trusted IP / minute; 5 admitted generations / invite / UTC day |
| Provider | 40 attempts globally / UTC day, including retries and JSON repair |
| Concurrent calls | 2 admitted operations, each with an unguessable ownership token and 90-second lease |

Admission checks session/invite state, shared kill state, IP/invite/global quota and concurrent leases in one Lua execution. It reserves the invite generation and lease atomically. Each actual SDK invocation separately performs atomic session/kill/lease/global-quota validation and consumes one global attempt immediately before invocation. The existing orchestration still permits at most two attempts total per generation. SDK retries remain disabled. Thus no repair/retry can bypass the global allowance.

Invalid sessions, exhausted limits, missing/disabled state and backend failures prevent the corresponding provider call. Failures/ambiguous Redis timeouts are never retried or refunded: capacity may be conservatively lost, never expanded. Redis REST calls have a 1.5-second deadline and no redirect/retry. Bot verification has a 3-second application deadline. Generation retains its 35-second bound and individual provider timeout; leases outlast that operation. Expired leases are removed atomically; release removes only the exact ownership token, so an old worker cannot release replacement capacity. Failed release leaves capacity occupied until expiry.

The Redis generation-state key must contain the approved enabled marker before admission or a provider attempt; absence fails closed. Removing it is the immediate operator kill switch for **future admissions/attempts**. Already dispatched Google requests cannot be recalled. A small race between successful admission and external SDK dispatch is inherent; this is not a distributed transaction with Google. Restarting/updating deployment flags is a slower secondary switch. Keep Redis non-evicting: evicted counters or manual deletion could reset quotas. Do not rotate namespaces/databases to bypass an exhausted allowance. Fixed windows permit boundary bursts; the global daily cap and concurrency bound remain in force.

## Vercel platform boundary

The application reads only a single valid x-vercel-forwarded-for IP on its explicitly Vercel-only path. It canonicalizes the IP and HMAC-hashes it for Redis keys; raw IPs are not stored by this application. Generic Forwarded, X-Forwarded-For and X-Real-IP are never fallbacks. This trust depends on Vercel overwriting its platform header and direct edge access. Local unit tests cannot prove platform sanitization. External reverse proxies/Trusted Proxy/custom IP forwarding are unsupported until separately reviewed. Changing IPv6 addresses or IPs cannot remove the invite/global quotas; shared NATs may cause legitimate throttling.

BotID Basic is wired client-side for generation/redemption and server-side with explicit non-development verification. Only an affirmative human, non-bot, non-bypassed result passes; verified bots are not exempted. Loopback browser instrumentation skips the remote challenge to preserve local functionality; the hosted server has no development bypass. SDK/platform availability or timeout fails closed. Logout does not require bot success, but still requires exact-origin POST, trusted IP and a session. Do not configure an automation bypass for these endpoints.

Manual dashboard work, **not performed**:

1. Select the Vercel project/plan, Node 24, intended production domain and HTTPS origin. Confirm eligibility/usage and that this repository's push cannot automatically deploy production until release approval. No project was linked or deployment initiated here.
2. Configure production-only secrets and flags below. Do not expose them as NEXT_PUBLIC variables, put them in build logs or propagate them to preview branches. Keep both flags disabled throughout review. Use a separate service/database for isolated staging tests; this implementation intentionally rejects VERCEL_ENV=preview.
3. Create Upstash Redis with primary/strong write/read semantics suitable for EVAL, supported TIME and sorted-set commands, no eviction, restricted operator access and bounded plan spending. Use the writable REST credential (read-only cannot run admissions). Confirm EVAL executes on the primary and all instances share the same namespace. Measure command billing and latency; do not assume the free tier guarantees availability.
4. Enable/check BotID Basic support and its client challenge routing on the actual Vercel project. Current Vercel instructions say modern deployments automatically route the challenge; installed package and actual platform behavior must be verified. Keep Vercel system protections active. Configure endpoint-scoped WAF/rate rules for /api/access/redeem and /api/plans/generate. Begin with logging, inspect legitimate traffic, stage deny/challenge rules and have the operator publish them after review. No WAF protection is claimed enabled by the code.
5. Disable request body, Cookie and Authorization capture in observability/debugging for these routes, and do not record DOM password values. Secure operator files/credentials with Windows account ACLs. OS mode 0600 is best effort on Windows, not proof of restrictive ACLs. Do not save traces containing real invites/cookies; browser traces in this task contain synthetic values only.

## Environment variable names (server-only)

- GEMINI_API_KEY, GEMINI_MODEL: existing provider configuration, unchanged locally.
- AI_ENABLE_LOCAL_GENERATION: existing loopback-only opt-in, never a hosted bypass.
- AI_ENABLE_HOSTED_GENERATION, AI_HOSTED_RELEASE_APPROVED: distinct explicit activation and release gates, both default disabled.
- PLANORA_PRODUCTION_ORIGIN: exact canonical HTTPS origin, no path/trailing slash/wildcard. Configure a real public hostname.
- PLANORA_SECURITY_NAMESPACE: unique lowercase app namespace (4–64 letters/digits/hyphens). The code adds a production suffix.
- PLANORA_IP_HASH_SECRET: independently generated high-entropy server secret of at least 32 characters. Do not reuse the Gemini/Redis credential.
- UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN: production writable HTTPS REST connection. URL restricted to an Upstash endpoint.
- VERCEL, VERCEL_ENV: platform-provided system variables; never trust request headers for these. BotID uses Vercel's runtime OIDC/platform integration; do not copy OIDC credentials manually into clients.

No new local environment values were written. .env.example contains only names/empty secrets and disabled flags. Never overwrite an existing .env.local.

## Operator lifecycle

After service setup and review, supply the Redis configuration securely to the local process; never put credentials in command arguments. `node scripts/access-admin.mjs issue` creates a single-use invite, writes its raw value only to a new ignored .impeccable/invite-<hash>.txt file and prints only its non-secret ID/path. Deliver it privately, then securely remove the local copy. The CLI does not print raw provider errors, tokens or connection details. Do not run from an unrelated working directory: use the repository root where .impeccable is ignored, and verify ignore status before issuing real invites.

`node scripts/access-admin.mjs revoke-invite <hashed-id>` invalidates the invite and every session associated with it. `node scripts/access-admin.mjs disable` removes the shared generation-state marker. The CLI deliberately has no enable action. An operator must initialize that marker in the correct Redis namespace only after the independent review and separately approved release. Do not reset quotas when enabling, rolling back or restarting.

## Required independent release verification

Have a reviewer other than the implementer inspect source, Lua, cookie handling, secrets, exact trusted-IP semantics and infrastructure settings. Test against a separate real Upstash database and an isolated Vercel environment with mocked Gemini: multiple running workers, bursts at boundaries, outages/latency, Redis eviction policy, TTLs and ownership races, revocation during retry, brute force, invalid cookies, session expiry, origin/host/forwarding spoofing, BotID humans/bots/failures, all failure cases with zero **additional** provider calls, and deployed shutdown behavior. Retries necessarily follow an earlier call; their rejection must make zero subsequent calls.

Offline tests execute the production Lua in Fengari with a deterministic Redis primitive model. They are stronger than mocking admission decisions but are **not actual Redis/Upstash integration or independent review**. Browser successes mock access/provider HTTP responses; real route coverage proves disabled routes remain closed. No automated/live Gemini requests were made. Actual hosted happy-path, platform sanitization, real BotID and cloud failure modes remain unverified.

Only after those checks and separate approval: stage the reviewed exact commit, install production-only secrets, explicitly activate both flags and shared state, issue one private tester invite, perform one authorized quota-budgeted live smoke test, check mobile save/reopen and operator disable, then approve production promotion. Keep release disabled if any prerequisite fails. No deployment or submission is authorized by this runbook.

## Residual risks

Invites are bearer access, not verified personal identity; stolen invites/cookies work until expiry/revocation. Delivery loss consumes the invite; issue a new one. Revocation cannot cancel an already dispatched provider operation. App quotas do not bound every Vercel/BotID/Redis billable request, so WAF/provider spending controls and monitoring remain necessary. Redis credential compromise, eviction/data loss or operator deletion can undermine the quota state. Cloud outage may deny legitimate service. Saved plans remain browser-local, not server account records. No independent penetration test or production-safe claim is made.

Sources checked for integration guidance: [Vercel request headers](https://vercel.com/docs/headers/request-headers), [BotID setup](https://vercel.com/docs/botid/get-started), [Upstash REST](https://upstash.com/docs/redis/features/restapi), [Upstash EVAL](https://upstash.com/docs/redis/sdks/ts/commands/scripts/eval).
