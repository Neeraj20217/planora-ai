# Planora AI

A celebration-planning workspace for weddings, birthdays, and community events.

**Phase 2 is complete; one real Gemini 3.5 Flash-Lite birthday generation was verified.** Server-side generation, checked planning artifacts, an interactive dashboard and browser-local save/reopen workflows are implemented. The minimal Phase 3 quality pass adds clearer evidence boundaries and mocked coverage for all three event types. Hosted generation remains disabled pending security implementation and independent verification. There is no production mock fallback.

See the [minimal Phase 3 report](docs/PHASE_3_REPORT.md) and [production-readiness assessment](docs/PRODUCTION_READINESS.md) for current verification, deployment blockers and proposed costs. No live requests were made in this quality pass.

**Phase 4 security implementation:** invite redemption, expiring/revocable sessions, atomic Redis quotas and leases, per-attempt provider accounting, fail-closed hosted guards and BotID wiring are implemented. Hosted generation is still **disabled by default**, pending independent review and real infrastructure verification. See the [hosted security/release runbook](docs/HOSTED_SECURITY.md) and [Phase 4 report](docs/PHASE_4_REPORT.md). No deployment or live Gemini call was performed for Phase 4.

## Challenge and approach

Target: PromptWars Virtual 2026, Main Challenge 05 — Celebration & Event Planner.

User-supplied problem statement: “Create a GenAI-powered planning assistant that helps users organize weddings, birthdays, and community events with budgets, timelines, vendor checklists, and personalized ideas.”

Gemini proposes personalized priorities, tasks, vendor categories, ideas and trade-offs. Application code owns exact money arithmetic, date boundaries, dependency scheduling and stored-data validation. Schema validity does not prove recommendations true: assumptions, estimates and feasibility warnings remain visible.

See [the development plan](docs/DEVELOPMENT_PLAN.md), [Phase 1 report](docs/PHASE_1_REPORT.md), and [Phase 2 report](docs/PHASE_2_REPORT.md). Earlier reports are historical records, not descriptions of the current feature set.

## Features

- Next.js App Router, TypeScript strict mode, Tailwind, locally bundled fonts and Lucide icons.
- Responsive overview, accessible event form, review/edit step, planning guide and recovery states.
- Weddings, birthdays and community events; name, date, location, guests, INR budget, theme, preferences and special requirements.
- Server-side official `@google/genai` integration with structured JSON, Zod validation and bounded error recovery.
- Personalized overview, recommendations, ideas, savings, assumptions and feasibility warnings.
- Exact integer-paise allocations with contingency, estimated budget per guest, category rationale and exact totals.
- Dependency-aware timeline with completion checkboxes, progress and overdue labels.
- Essential/optional vendor categories with editable selection statuses. No verified businesses, prices, ratings or availability are claimed.
- Versioned localStorage: explicit save, multiple events, stable plan URLs, refresh/reopen, validation, corruption isolation and stale-write checks.
- Automated unit, component, API integration and desktop/mobile production-browser tests.

Expense recording, editable allocations, task authoring, requirement regeneration/merging, JSON backup, collaboration and cloud persistence remain later work.

## Local setup

Verified environment: Node **24.19.0**, npm **11.17.0**; use Node 24.x.

```powershell
git clone https://github.com/Neeraj20217/planora-ai.git
cd planora-ai
npm ci
npm run dev
```

For the existing checkout, use `Set-Location D:\Coding\Codex\planora-ai` first. Open [http://localhost:3000](http://localhost:3000). You can review event details and reopen saved plans without credentials. Generation reports a configuration error until configured; entered details remain intact.

Both dev and build scripts use Webpack. Windows Smart App Control blocks native SWC on the verified machine, so Next.js uses its supported WASM fallback. Its first use may download a package into Next's user cache. No system security policy is disabled or bypassed.

### Configure Gemini securely

1. Copy `.env.example` to `.env.local` without replacing an existing configuration.
2. Enter your key locally in `GEMINI_API_KEY`. Never paste it into chat, frontend code, screenshots, a public repository or `NEXT_PUBLIC_` variables.
3. Set `GEMINI_MODEL=gemini-3.5-flash-lite` and `AI_ENABLE_LOCAL_GENERATION=true` for the previously verified local model. Preserve existing local configuration.
4. Restart the local server. Run `npm run ai:models` to list Flash model IDs accessible to your account. This command prints model names only, never the key or raw provider errors.
5. Create an event, review its sharing notice, and choose **Generate plan**. This explicitly sends the event brief to Google. Avoid sensitive guest information.

The code fallback remains `gemini-3.8-flash`; the current local override is `gemini-3.5-flash-lite`, which passed a real structured-output birthday test. That single success does not establish ongoing quota or reliability. There is no silent model fallback. `GEMINI_MODEL` can select another compatible model after checking its capabilities. Gemini 3 models use low thinking; other overrides use their provider defaults. SDK version: `@google/genai` 2.31.0.

Check current model availability and terms in [Google's model documentation](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash), [structured-output documentation](https://ai.google.dev/gemini-api/docs/structured-output), [rate limits](https://ai.google.dev/gemini-api/docs/rate-limits) and [pricing](https://ai.google.dev/gemini-api/docs/pricing). No fixed free quota or cost guarantee is assumed.

**Generation gates:** missing credentials return 503. Local generation requires explicit local enablement and a loopback host. Vercel generation requires the separately gated security path documented in the hosted runbook: release approval, activation, production origin, server session, shared Redis quotas/kill state and bot verification. It remains disabled; previews are refused. External protections and hosted behavior need independent verification before activation. No deployment is performed here.

## How planning works

```text
Event form -> Zod validation -> review + sharing notice
  -> POST /api/plans/generate
     -> origin/content type/body limits + independent request validation
     -> local-only gate OR separately approved hosted sessions + shared limits
     -> server-only Google SDK + prompt/context + JSON schema
     -> Zod + semantic proposal checks
     -> deterministic budget/timeline/vendor composition
     -> canonical plan validation
  -> dashboard -> explicit save -> localStorage -> saved-event URL/reopen
```

### Deterministic rules

- Money enters as decimal rupee strings and is stored as integer paise. No decimal multiplication is used for input conversion. Model output contains relative integer weights, not authoritative totals.
- Reserve `floor(totalPaise / 10)` for contingency. Allocate the remainder using largest remainders, with stable category-name tie breaking. Merge model priorities with event-type defaults; zero/invalid outputs cannot create negative or missing funds. All category allocations, including contingency, sum exactly to the total. These are allowances, not quotes.
- Per-guest display uses the floor paise quotient and is labeled approximate. Zero budget is valid and yields zero allocations with an in-kind/DIY feasibility warning. Low per-guest and large-crowd thresholds are disclosed heuristics, not local market facts.
- Dates are date-only values in Asia/Kolkata. The server derives the current date independently. UTC calendar ordinals avoid host timezone/DST errors. Core task templates and model tasks are topologically ordered, clamped to the planning interval and adjusted so prerequisites are no later than dependents. Compressed/same-day schedules explicitly warn that dates alone do not establish feasibility.
- Essential venue/coordination arrangements are retained. A paid supplier is not required for every essential service. The provider adds context-specific categories/rationale.
- Prompts receive normalized event data and derived days, urgency and budget pressure. Free text is untrusted data. There is no tool execution, booking, arbitrary server fetch, vendor lookup or external action.

### Validation and failures

Requests accept only a strict `{brief}` object. Fields retain Phase 1 bounds: 1–10,000 guests; INR 0–10 crore; real nonpast creation date; bounded text. Bodies are limited to **32 KiB measured from the stream**, with a five-second read deadline.

AI sections have bounded lengths/arrays, enum categories and integer weights. Duplicate categories/task keys, missing dependencies, cycles, invalid allocations or dates are rejected. Unsupported fields such as vendor prices are rejected. Generated factual claims can still be wrong; the UI does not present them as verified.

Normal generation uses one call. There are at most **two provider attempts total**, shared by one schema-repair or one retry for selected transient 5xx errors. Provider 429/authentication errors are not automatically retried. SDK internal retries are disabled; each SDK request has a 20-second timeout, the combined generation has a 35-second abort deadline, and the browser has a 50-second bound. Failures return safe codes/messages and never save partial plans. The previous brief remains editable. No raw provider response/error or key is logged by application code.

## Persistence and privacy

Plans are saved only when **Save plan** or **Save changes** is chosen. First save navigates to `/events/<uuid>`, so refreshing reopens that saved record. Task and vendor edits require another explicit save.

Each plan uses `planora:plan:v1:<uuid>` and contains schema version, revision, event brief, model/prompt provenance, generation date and validated artifacts. Readable records remain available if another record is corrupt; unreadable records are left untouched. Storage denial/full quota surfaces a recoverable error. A 50-record and 128 Ki-character per-record limit bounds storage work. Revision checks reject stale writes; localStorage has no atomic multi-tab transaction, so truly simultaneous writes can still race. There is no cross-device sync or encrypted storage.

Saved plans stay on the same browser/profile/site origin. Clearing site data or using private browsing may remove them; localhost and a future deployment have separate data. Unsaved briefs/plans are lost when leaving or refreshing; visible notices explain this. Internal links ask before discarding unsaved plan edits; browser Back/programmatic navigation may still discard them, so save first. No automatic generation occurs on reload. All scripts on the origin can access localStorage, so avoid sensitive personal information. AI generation sends the brief to Google subject to the selected service terms; local save itself does not send it to a backend.

## Structure

```text
src/app/                      overview, form, saved event, guide, API route
src/components/events/        accessible form and saved-event list
src/components/planner/       generation states, dashboard, saved-plan loader
src/lib/ai/                   public model ID, prompt, SDK adapter, orchestration
src/lib/domain/               context, money, date, budget, timeline, composition
src/lib/schemas/              event, proposal and canonical plan schemas
src/lib/server/               request handling, safe errors, local rate limits
src/lib/storage/              versioned records and external-store hook
src/types/                    schema-inferred contracts
tests/{unit,components,integration,e2e,fixtures}/
scripts/check-models.mjs       optional credential-safe model-access check
docs/                         approved plan and delivery reports
```

## Verification

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

`typecheck` generates Next route types before `tsc --noEmit`. `test:e2e` needs a completed production build and starts a local server on port 3100. It explicitly clears the server key and disables generation so the suite cannot incur model usage. Successful browser generation uses labeled network fixtures; real route validation/missing-key handling and the SDK contract have separate tests. There is no user-facing test mode or mock endpoint in the app.

Tests cover preserved Phase 1 behavior, exact allocations and rounding, date/dependency rules, three event categories, response schema/semantic failures, bounded retries/timeouts, missing credentials, independent input validation, origin/size limits, local request caps, corruption/quota/stale writes, save/refresh/reopen/multiple events, keyboard focus, responsive layout and axe checks. Mobile testing uses Chromium emulation, not Safari/iOS. Automated scans do not establish full WCAG conformance. Actual results and limitations are recorded in the Phase 2 report.

To run the production build locally:

```powershell
npm run build
npm start
```

## Security and release constraints

The SDK/key live only in server modules; the adapter imports `server-only`. No `NEXT_PUBLIC_` secret exists. JSON text is rendered by React without HTML execution. Responses are `no-store`, and errors disclose no internal provider details. No CORS access is granted.

Local protection permits **one active generation, three requests/minute and twenty/hour per process** (up to two provider attempts per request). These are not durable/distributed limits and reset on restart. The separately gated hosted path uses atomic Redis limits and invite sessions; it never falls back to the local limiter. Hosted generation remains blocked pending independent review/platform verification. Origin/Host checks alone are not authorization against curl. Budget alerts alone would not be a hard spending cap.

Work only on `main`. Source, lockfile and tests stay below the supplied 10 MB repository limit. Dependencies, build artifacts, environments, screenshots and traces are ignored. Never commit credentials. No Vercel deployment or PromptWars submission is authorized by this release.

## Remaining work

Configure a local key and verify model access, a real generation for each event type, latency, schema adherence and quota/cost. Later approved work may add budget/expense editing, task authoring, requirement revisions, backup/export, broader browser/screen-reader verification and durable hosted abuse controls.

Hackathon-specific deadline/rules remain subject to official confirmation. The public [PromptWars FAQ](https://promptwars.in/promptwarsVirtual.html) requires Google Antigravity despite broader wording elsewhere; Codex eligibility remains unresolved. The original November 1 deadline is a user-supplied working requirement. No competition submission has been performed.
