# Planora AI

**PromptWars Virtual 2026 — Main Challenge 05: Celebration & Event Planner**

A planning workspace for weddings, birthdays and community events in India. Gemini proposes contextual ideas and priorities; deterministic application code validates the proposal and composes exact INR allocations, preparation dates and vendor checklists.

- [Public application](https://planora-ai-iota.vercel.app)
- [Generation access](https://planora-ai-iota.vercel.app/access)
- [Planning guide](https://planora-ai-iota.vercel.app/guide)
- [Public repository](https://github.com/Neeraj20217/planora-ai)
- Competition deadline supplied by the organizer: November 1, 2026, 11:59 PM IST.

## Evaluate the application

### Offline reference path — no invitation or AI request required

1. Open **Create an event**. Choose Wedding, Birthday or Community event.
2. Enter an event name, today or a future date, location, guests and INR budget. Theme, preferences and requirements are optional.
3. Select **Review event details**, then **Explore sample plan (offline reference)**. There is no need to select Generate plan first.
4. Inspect the exact allocation total, contingency, timeline dependencies and vendor checklist. Samples are explicitly labeled as offline references; their generic recommendations are not personalized AI output.
5. Toggle tasks, change vendor statuses and select **Save plan**. Refresh, or reopen the event from **My events**, to check persistence.

### Live generation path — subject to access and shared quotas

1. In a normal browser on the canonical site, open **Generation access** and select **Start evaluation session**. No invite code is required for an eligible trial.
2. A successful claim creates an expiring session cookie, valid for up to eight hours. Each public session permits at most **two admitted generation requests across its entire lifetime**, including across UTC midnight. Failed admitted requests still consume that allowance.
3. Only one public trial can be claimed per trusted client IP hash per UTC day. Shared networks can therefore affect eligibility. Private single-use organizer invitations are a separate access option.
4. Create and review an event, then select **Generate plan**. An absent or expired session triggers one automatic trial-activation attempt; successful activation retries generation once. No quotas are reset.
5. Save the resulting plan explicitly. Sign out revokes a valid session; signing out neither refunds nor resets allowances. If sign-out cannot be confirmed, the interface says so.
6. If access checks, configuration, provider availability or quotas prevent generation, follow the error guidance or use the offline reference path.

Live generation depends on operator configuration, BotID verification, Redis availability and remaining provider quota. This README does not guarantee that live access is enabled or available for every visitor. This audit used mocks only; it does not re-certify live Gemini or platform security behavior.

## Approach and contextual AI logic

The brief includes event type, date, location, guests, INR budget, theme, preferences and special requirements. The server supplies the planning date in Asia/Kolkata and derives:

- Whole-paise budget per guest and its remainder. Below INR 500 per guest triggers a limited-funds warning, not a market-price claim.
- Preparation urgency: same-day, urgent (up to 7 days), soon (up to 30 days), or advance.
- Large-gathering warnings at 200 or more guests, plus zero-budget and short-notice warnings.

Gemini receives these inputs and is instructed to explain recommendations, expose assumptions, account for constraints, and avoid claiming verified vendor availability or inferring cultural preferences from location. User-supplied text is untrusted data. Suggestions are validated against strict Zod contracts, including unique categories and acyclic task dependencies. Model output is not guaranteed to be valid or factually correct; invalid output is rejected after bounded repair/retry attempts.

The provider-facing JSON Schema is separate from strict application validation. The server-only Google GenAI SDK uses the configured GEMINI_MODEL; the previously verified model was gemini-3.5-flash-lite. There is no automatic model switch. SDK attempts are limited to one per invocation; generation permits at most two total provider invocations, sharing a 38-second pipeline deadline and a 30-second SDK timeout. The browser allows 50 seconds; the generation route has a 45-second maximum duration. No fixed response time is promised.

## What the application implements

- Accessible event form with validation on review/submission, review/edit flow and explicit sharing notice.
- Celebration Atelier homepage, responsive navigation, saved-event cards and planning dashboard.
- Budget allocation bars with exact INR values, rounded display percentages and an explicit distinction between planned allocation and actual spending. Actual expenses are not tracked.
- Dependency-aware preparation timeline with editable completion, priorities, overdue labels and progress.
- Vendor/service categories: venue, catering, decoration, photography, entertainment, transport, equipment and logistics. Entries are categories, not verified businesses.
- Vendor statuses: not-started, shortlisted, contacted, booked, not-needed; Essential and Optional describe arrangements, not obligations to hire.
- Contextual ideas, recommendations, savings, warnings and assumptions.
- Explicit browser-only save/reopen with revision checks and stale-write detection. No cloud synchronization.
- Offline reference proposals for all three event types, composed with the supplied event details using the same domain logic.

## Budget and timeline logic

Money is parsed and stored in integer paise. Contingency is floor(totalPaise / 10): a 10% target rounded down to the nearest paise. Remaining funds are distributed by relative category weights using largest remainders and deterministic tie-breaking. Allocations, including contingency, sum exactly to the input budget. Display percentages are rounded to two decimals and may not sum to exactly 100%; they do not drive money calculations. Zero-budget plans remain valid.

Core templates and AI tasks form a dependency graph. Scheduling respects calendar dates from the planning snapshot to the event. On compressed or same-day schedules, prerequisite and dependent tasks may share a date; they must still follow dependency order. Dates and warnings do not guarantee feasible bookings or sufficient preparation time.

## Security and privacy boundaries

- Exact origin/host and cross-site checks, content-type validation, a 32 KiB request limit and bounded body-read time.
- Hosted access requires release flags, complete configuration, server-side BotID verification, a valid session, and atomic Redis admission. Redis errors fail closed.
- Secure, HttpOnly, SameSite=Strict host-only session cookies; Redis stores hashed invite/session identifiers with expiration. Valid session revocation must succeed before logout reports success. No-session logout is idempotent after the same request boundary checks.
- Public trial lifetime allowance: two admitted requests. Private invitations: five admissions per UTC day. Admission IP limit: three requests per minute; global provider cap: 40 attempts per UTC day; concurrency: two expiring ownership leases. Retries/repairs consume provider-attempt allowance.
- Redis generation-state switch and environment gates control admission. They do not recall provider calls already in flight.
- CSP frame-ancestors 'none' and X-Frame-Options DENY block framing. External WAF/BotID effectiveness and trusted edge-header handling require platform verification; code and mocked tests are not an independent security audit.
- API keys remain server-side. Reviewed briefs travel to the application server and Gemini when live generation is requested. Saved plans remain in this browser and site origin; clearing storage, private browsing or switching devices/origins can remove access. Do not enter sensitive guest information.

## Assumptions and limitations

Recommendations, availability, prices, weather, capacity, local permissions and cultural suitability require human confirmation. There are no bookings, payments, vendor-directory lookups or verified quotes. Reference samples are generic demonstrations. Live AI can be unavailable or time out; shared-IP limits can block otherwise legitimate visitors. Infrastructure/provider quotas and charges depend on the accounts and plans in use; no zero-cost or latency guarantee is made.

## Run locally

Requires Node.js 24.x and npm 11.x.

```bash
npm ci
npm run dev
```

Open http://localhost:3000. Offline references require no Gemini key. To opt into local live generation, copy .env.example to .env.local and configure GEMINI_API_KEY, GEMINI_MODEL and AI_ENABLE_LOCAL_GENERATION=true privately. Never commit local environment files. The optional npm run ai:models command makes a real model-discovery request. Hosted setup and release controls are documented in docs/HOSTED_SECURITY.md and the phase reports; do not disable safeguards to make tests pass.

## Validation

```bash
npm test
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

Pre-submission audit on **October 31, 2026**: **272 automated tests in 15 files passed**, including logout, access, retry and offline-reference regressions. **34 desktop/mobile Playwright tests passed** for access, safe errors, direct offline samples, mocked generation, task/vendor editing and save/refresh/reopen. TypeScript, ESLint and the production build passed. Automated providers are mocked; no live Gemini request is needed. Browser tests use synthetic data and mocked responses where applicable. Historical live generation and isolated Redis results are documented separately and are not rerun or represented as new live results here.

## Repository layout

- src/app: public pages and API route handlers.
- src/components: event forms, access UI, saved cards and planning dashboard.
- src/lib/ai: prompt, provider adapter and response schema.
- src/lib/domain: exact money, calendar, context and plan composition.
- src/lib/server/hosted: access boundaries, Redis Lua admission and sessions.
- src/lib/storage and src/lib/schemas: versioned browser persistence and strict contracts.
- tests: unit, component, integration/security and browser checks.
- docs: architecture, verification evidence, release and security limitations.

Built for PromptWars Virtual 2026, Main Challenge 05.
