# Phase 2 — GenAI planning integration

Prepared 26 October 2026 (IST). Implementation delivered under the user's explicit Phase 2 approval; no deployment, submission or Phase 3 work.

Verification resumed and completed on 27 October 2026 (IST). The existing local implementation was preserved; the project was not recreated or reset. At resumption, local and remote main were still at Phase 1 commit 7bfd676 and the Phase 2 changes were uncommitted.

## Delivered flow

The existing form/review flow is preserved. A sharing notice precedes explicit generation. The official server-only Google SDK produces JSON proposals, Zod and semantic checks reject invalid output, and deterministic code composes exact allocations, a nonpast dependency-aware timeline and relevant vendor categories. The responsive dashboard shows overview, rationale, budget, tasks/progress, vendor statuses, ideas, savings, assumptions, feasibility warnings and provenance. Explicit local save supports multiple records, a stable saved-event route and refresh/reopen.

## Gemini status

- Checked project environment through Next's environment loader without printing values: GEMINI_API_KEY absent; no model override configured.
- `npm run ai:models` correctly reports that access cannot be checked without a key. No authenticated model list or real generation was performed.
- Default `gemini-3.8-flash` was verified against Google's official public model page as stable with structured outputs. This verifies documented capability, not account access, quota or billing.
- SDK pinned to @google/genai 2.31.0. Model/schema contract is covered with a mocked SDK; provider orchestration is injected for deterministic tests.
- No mock fallback or fixture seed is included in production functionality. Browser success tests intercept the network with explicitly labeled test fixtures.
- Follow README instructions to configure .env.local securely, enable loopback generation and check account models. Never paste the key into chat or commit it.

## Architecture and deterministic rules

`src/app/api/plans/generate/route.ts` wires the server-only SDK adapter to an independently validated handler. `src/lib/ai` owns prompts and bounded generation; `src/lib/domain` owns context, exact budgets, dates, timeline and composition; `src/lib/schemas` owns event/proposal/plan contracts. Client components validate success responses again before rendering them.

Money remains integer paise. Contingency is floor(total/10). The remaining amount is allocated using validated relative weights merged with event-type defaults and a largest-remainder method, with stable category-name tie breaking. Totals are exact, including zero and maximum budgets. Per-guest display is an explicitly approximate floor-paise quotient. No model arithmetic is authoritative and no local market affordability is asserted.

Timeline dates derive from the server's India calendar date. Core essentials plus AI tasks are topologically ordered, clamped to available dates and checked against prerequisite due dates. Same-day/short-window compression is disclosed as a feasibility concern, not a booking guarantee. Essential space/coordination arrangements remain, while paid services may be optional.

## Persistence

Version 1 per-plan records use UUID keys and revision numbers. Plan validation includes exact totals, unique categories/tasks, bounded text, date intervals and dependency ordering. Corrupt or unsupported records are isolated without deletion; quota/denied storage and stale saves show safe errors. First save changes to a stable saved-plan route. Multiple plans and task/vendor changes survive refresh after saving.

Limits: 50 records and 128 Ki-characters per record; no export, encryption, cloud sync or atomic multi-tab transaction. The revision read/check is optimistic and cannot eliminate simultaneous-write races. Unsaved work can be lost on navigation/refresh; notices, a beforeunload guard and an internal-link confirmation cover supported exits. Browser Back/programmatic navigation can still discard unsaved changes; saving explicitly is required. No automatic re-generation/reconciliation was added.

## Security

- Credentials and SDK restricted to server adapter; no frontend credential or public environment variable.
- Strict request schemas, current-date checks, JSON content type, same-origin checks and 32 KiB actual stream limit; five-second body deadline.
- Next normalizes local request.url authorities, so origin is compared to the canonical browser Host authority; loopback gating uses the same authority. Cross-origin and public-host regression tests cover this distinction.
- Missing key returns safe 503. Generation requires explicit local activation and loopback host; Vercel-hosted generation is blocked. No public-enable switch exists in this phase.
- Per-process local caps: one concurrent request, three/minute, twenty/hour. They are not production authorization or distributed limits. Future hosted generation needs shared abuse controls and spend boundaries first.
- SDK retries disabled. At most two provider calls total, shared between transient-5xx retry or invalid-output repair. 429/auth failures do not retry automatically. SDK timeout 20 seconds; combined generation abort deadline 35 seconds; browser deadline 50 seconds.
- No raw provider errors, briefs or keys logged by application code. Safe client messages, no-store responses and plain React text rendering.

## Test evidence

Existing Phase 1 tests are retained without deletion. New suites cover proposal/plan semantics, exact rounding, schedules, context, all event categories, provider repair/failure/timeout behavior, SDK configuration, request/abuse boundaries and storage recovery. Browser tests verify the complete UI using labeled fixtures and exercise real-server missing-key behavior without any paid provider calls.

| Verification on 27 October | Actual result |
| --- | --- |
| npm run lint | Pass, zero errors or warnings |
| npm run typecheck | Pass, route type generation and tsc --noEmit |
| npm test | 116 tests passed across 7 files |
| npm run build | Pass, production Webpack build with all routes compiled |
| npm run test:e2e -- --retries=0 | 22 passed, desktop and mobile Chromium; no retries |
| npm ls --depth=0 | Pass, installed dependency graph matches declared dependencies |
| npm audit --audit-level=high | Zero vulnerabilities reported |
| Key presence check through Next environment loader | GEMINI_API_KEY absent; its value was never printed |
| Candidate source and existing Git-history credential-pattern scan | Zero matches; no sensitive filenames proposed for tracking |
| Frontend chunk scan for key/SDK/server endpoint markers | Zero matches |
| Repository size before final commit | Approximately 0.45 MB source and 0.14 MB Git metadata, well below 10 MB |

The first resumed browser run exposed a hydration contrast race: button text became white while its background was still transitioning from the pale disabled color. Although that run passed on retry, the transition was removed so foreground/background now change together. The accessibility test also waits for the form to become enabled. The final rebuilt suite passed all 22 cases with retries disabled. No accessibility rule or existing test was removed or suppressed.

A first browser run found the localhost/127.0.0.1 origin mismatch; it was fixed and given dedicated regression tests. Initial TypeScript findings in a throwing storage test double were also fixed. The Windows Webpack/WASM fallback remains unchanged; no security policy was disabled.

## Completion boundary

Phase 2 implementation and mocked verification are complete. This delivery includes the server adapter, deterministic engines, dashboard, local save/reopen workflows, tests and configuration instructions. Live Gemini generation, account-specific model access, quota/billing and real-output quality are explicitly pending. The checked-in model remains gemini-3.8-flash; no live provider call was made during resumed verification.

The final source commit is to be delivered on main only; its exact hash, push result and remote-HEAD comparison are recorded in the completion response after publication. Repository size is checked again after that commit. No branch, deployment or competition submission is created by this verification.

## Limitations and Phase 3 recommendations

Live AI/account availability and quality remain unverified until a key is configured. JSON validity and constraints cannot eliminate hallucination; verify suggestions with users and suppliers. The app does not verify businesses, availability, prices, weather or local permissions. Desktop/mobile Chromium tests are not Safari or complete screen-reader certification.

After explicit Phase 3 approval: verify live generations for wedding/birthday/community and failure/latency/cost behavior first; then prioritize editable budget/actual spending and task authoring, backup/export and safe requirement revisions. Hosted release remains a separate authorization and requires durable abuse protection. Hackathon tool eligibility and challenge-specific rules remain unresolved as documented previously.
