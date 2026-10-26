# Planora AI — Development Plan

Status: proposed; planning only. Prepared 26 October 2026 (IST). No application implementation, dependency installation, automated application testing, remote repository creation, push, deployment, or competition submission has been performed.

## 1. Project Overview

Planora AI helps an individual organizer turn wedding, birthday, or community-event requirements into an editable, actionable plan. It combines Gemini suggestions with deterministic financial calculations, scheduling rules, and persistent task tracking. The product is a planning workspace rather than a general chat interface.

Working deadline supplied by the user: 1 November 2026, 11:59 PM IST. Target feature freeze: 31 October; final verification and demonstration: 1 November. Schedule assumes roughly 5–7 focused engineering hours daily and prompt review of this plan. If approval is delayed, remove optional enhancements and preserve a day for verification.

### Environment inspection — actual findings

| Check | Result |
| --- | --- |
| Requested workspace | `D:\Coding\Codex` exists; contains AutoAssist, hatch-pet, hinata-kite-desktop, partsledger-ai, pets, Repair-Before-Replace, and README.md |
| Project before setup | `D:\Coding\Codex\planora-ai` absent; empty folder created during planning |
| Parent Git repository | `D:\Coding\Codex` is not a Git repository |
| Existing immediate-child repositories | AutoAssist and partsledger-ai have Git metadata; both report main. No recursive repository audit performed |
| Local guidance | No AGENTS.md found at D:\, D:\Coding, or D:\Coding\Codex during inspection |
| Git | 2.56.0.windows.3 |
| Node.js / npm | v24.19.0 / 11.17.0 |
| GitHub CLI | 2.102.0 |
| Configured Git identity | Neeraj20217; neerajkarri34@gmail.com. Commit identity is not proof of authentication |
| GitHub CLI authentication | Configured github.com account Neeraj20217 reports an invalid token |
| Intended remote | Assumed candidate Neeraj20217/planora-ai. CLI lookup failed on connectivity; connected GitHub search returned nonexistent-or-inaccessible. Existence and ownership remain unconfirmed |
| Gemini / Vercel accounts | Credentials, quota, billing, account access, and deployed configuration not inspected or tested |

The initial sandbox blocked Git access to D:; an approved elevated command completed read-only Git inspection and folder creation. No existing project was overwritten. Final setup verification: docs/DEVELOPMENT_PLAN.md, README.md, and .gitignore created; empty local Git repository initialized with main as its unborn HEAD. Files remain untracked; no commits or remotes exist. Planning documents and minimal repository setup are the only authorized writes.

### Assumptions and decisions needing review

- Treat the supplied challenge statement, deadline, one-main-branch rule, size cap, three-attempt submission cap, and demonstration duration as working requirements, not independently verified official rules.
- Single organizer, browser-local storage, INR only, English interface, India-oriented examples; no guest personal-data collection or collaboration for MVP.
- Event dates are date-only values interpreted in Asia/Kolkata. Time of day, multi-day events, and multi-currency support are optional later work.
- Estimates are planning allocations, not vendor quotations or verified local market prices. No automatic bookings, payments, or vendor outreach.
- Codex eligibility requires organizer clarification: the official public FAQ requires Google Antigravity, despite broader wording elsewhere. Do not represent Codex-only development as approved.

## 2. Official Challenge Alignment

User-supplied Main Challenge 05 statement: “Celebration & Event Planner: Create a GenAI-powered planning assistant that helps users organize weddings, birthdays, and community events with budgets, timelines, vendor checklists, and personalized ideas.”

| Requirement | Product evidence |
| --- | --- |
| Weddings, birthdays, community events | Type-specific templates, requirements, vendor categories, and test scenarios for all three |
| GenAI planning | Real Gemini response with contextual rationale, explicit assumptions, ideas, and trade-offs |
| Budgets | Editable integer-paise category allocations, actual expenses, remaining balance, and overruns |
| Timelines | Date-bound tasks with dependencies, urgency, completion, and progress |
| Vendor checklists | Relevant categories with not-started, shortlisted, contacted, booked, and not-needed status |
| Personalized ideas | Suggestions reference location, theme, guests, preferences, constraints, and available preparation time |

Public rule review on 26 October found an event-page refresh notice, inconsistent AI-tool wording, an Antigravity requirement in the FAQ, and narrative-submission requirements. The specific Challenge 05 statement, deadline, repository limit, attempt limit, and exact scoring weights were not confirmed on that page. Obtain the challenge-specific rule page or organizer confirmation before claiming eligibility. No scoring weights are assumed.

## 3. Target Users and Use Cases

- Family organizer: plan a birthday with limited funds and one week to prepare.
- Couple or family: coordinate wedding categories, accessibility and dietary needs, and longer lead times.
- Community volunteer: prioritize venue capacity, food, sanitation, accessibility, and responsibilities for a larger gathering.

Primary flow: saved events → create validated event brief → generate and review plan → edit allocations/tasks/vendors → record spending and completion → reopen saved event → revise requirements and explicitly review replacement suggestions.

## 4. Feature Requirements

All nine requested features are MVP essentials; polish depth and optional extras can vary.

| Feature | MVP scope and acceptance |
| --- | --- |
| Event creation | Type, name, future or same-day date, location, positive guest count, nonnegative budget, optional theme/preferences/special requirements; default INR; field-level validation |
| AI planner | Overview, recommendations, allocation weights, tasks, vendor categories, ideas, savings, assumptions, and considerations in a validated schema |
| Budget | Edit allocations and item estimates; record actual amounts; exact totals, unallocated funds, and both estimated/actual overruns |
| Timeline | Actionable tasks dated between planning date and event date; manual additions/edits/completion; progress |
| Vendor checklist | Categories and requirement rationale; editable statuses and optional organizer-entered notes; no invented businesses |
| Personalized ideas | Useful feasible alternatives linked to the brief; disclose assumptions and conflicting constraints |
| Dashboard | Brief, budget totals, progress, next tasks, vendors, recommendations; loading, empty, and error states |
| Plan management | Save/reopen multiple events, edit requirements, budgets, and tasks; versioned persistence; explicit regeneration review |
| Responsive accessibility | Mobile through desktop, semantic forms, keyboard operation, readable contrast, text equivalents for visual summaries |

Optional only after MVP passes: JSON export/import with schema validation, print stylesheet, budget charts, dark mode, richer vendor notes. Defer database, login, collaboration, chat, maps, weather, live search/pricing, calendar integrations, file uploads, payments, autonomous agents, and email notifications.

## 5. Recommended Technology Stack

| Layer | Recommendation and reason |
| --- | --- |
| UI | Next.js App Router, React, TypeScript strict mode, Tailwind CSS, Lucide; matches preferences and permits one application deployment |
| Server | Next.js Node-runtime Route Handler; no separate backend server or orchestration framework |
| AI | Official `@google/genai`, one configured stable Flash-class model supporting structured JSON; verify actual account availability before selecting and pinning model ID |
| Contracts | Zod for request, response, stored-data validation; compatible JSON Schema subset for provider |
| State | React state/reducer and small context where needed; avoid Redux and extra query libraries initially |
| Persistence | Versioned localStorage repository abstraction; no cloud event database for MVP |
| Tests | Vitest for pure logic/API orchestration; React Testing Library for important interactions; Playwright for critical browser flows; axe tooling for automated accessibility checks |
| Tooling | npm lockfile, ESLint, TypeScript check, Git main only; Vercel after separate authorization |

Select compatible stable package versions at Phase 1, pin the dependency graph with package-lock.json, and record the Node runtime. Node 24 is installed; confirm Vercel support and package compatibility before adoption. Current Next.js installation docs list Node 20.9 as the minimum; installed Node exceeds that minimum, but this does not verify every dependency.

LocalStorage is sufficient for a single-browser hackathon workspace: no identity system, database credentials, migrations, or per-user backend. It has capacity limits, no cross-device synchronization or guaranteed backup, and is readable by scripts on the same origin. Handle denied storage, quota errors, corrupt records, migrations, and concurrent-tab edits without overwriting good data. Provide an unsaved warning and retry path. Recommend optional JSON backup after core delivery. Add authenticated Postgres persistence only if collaboration or multi-device requirements become essential; that expansion needs ownership checks, migrations, deletion, and additional testing. Serverless filesystem storage is not an event database.

## 6. System Architecture

```text
Browser: event form → POST /api/plans/generate
                          ↓
Server: request validation → abuse guard → normalized context/rules
                          ↓
            Gemini adapter + versioned prompt + JSON schema
                          ↓
        Zod + semantic checks → budget allocator + scheduler
                          ↓
Browser: review → dashboard/reducer → localStorage repository
```

Keep rendering and computation separate. Server components render the shell; client components handle forms and local data. Keep API key and Google SDK usage in server-only modules. Pure domain functions are shared where safe and tested without a browser or network.

### Contracts and state

- EventBrief: UUID, event type, name, YYYY-MM-DD date, timezone, location, integer guests, budgetPaise, theme/preferences/special requirements, revision.
- AiProposal: overview, assumptions, constraint conflicts, recommendations with rationale, category weights, task suggestions with lead-day offsets/dependencies, vendor suggestions, ideas, savings, considerations. Bounded arrays and text lengths; no executable content.
- EventPlan: schemaVersion, ID, briefRevision, generatedAt/asOfDate, promptVersion, model ID, provenance (`gemini` or explicitly marked sample), brief, categories, expense records, tasks, vendors, and advice.
- IDs are generated by the application, unique and stable for stored entities. Model references are checked and mapped before persistence.
- BudgetCategory: allocationPaise and estimated line items; Expense: categoryId and actualPaidPaise. MVP actuals are amounts paid, not invoices or committed liabilities; label this clearly.
- Task: ID, title, dueDate, priority, status, category, dependencies. Vendor: category, rationale, status, optional notes.

API: POST only; bounded request `{brief, asOfDate, promptVersion}`. Validate server-side and derive authoritative current date server-side in Asia/Kolkata; client date is advisory. Return `{plan, warnings, requestId}` on success; safe `{error:{code,message,fieldErrors?,retryAfter?},requestId}` on failure. No backend CRUD endpoints are needed for browser-local plans. Proposed statuses: 400 invalid input, 413 too large, 429 limited, 502 invalid/upstream response, 503 unavailable, 504 timeout.

Existing plan edits are local and immediate. Requirement changes mark AI advice stale. Generate a candidate tied to the current brief revision; display a preview and require explicit replacement acceptance. Preserve the existing version until acceptance and retain prior copy for recovery. Never silently merge new tasks into completed work or reset expenses/vendor statuses. MVP can offer keeping the current plan or creating a separate revised copy to avoid unreliable automatic reconciliation.

## 7. AI Planning and Decision Logic

### Deterministic context before AI

1. Validate required fields; reject past dates, fractional guests, negative/nonfinite money, oversized strings and requests. Proposed bounds: 1–10,000 guests, 0–INR 10 crore total budget, names ≤120 characters, location ≤200, each free-text field ≤2,000, body ≤32 KiB. These are application limits, not event-industry constraints.
2. Compute calendar days until event in Asia/Kolkata, available budget per guest, and a preparation band: same day, 1–7, 8–30, or over 30 days.
3. Attach explicit constraints: dietary/accessibility needs, indoor/outdoor preference, theme, and event type. Preserve free text as data; do not infer sensitive cultural or religious preferences from location.
4. Use configurable heuristics to flag low per-guest funds and unusually large guest counts. Label thresholds as product heuristics, not market-price facts. Never declare affordability guaranteed.
5. Seed essential task/vendor categories by event type and requirements. Wedding examples include venue, food, ceremony logistics when requested; birthdays may favor DIY decoration and simple food; community events may need sanitation, volunteers, accessibility, and permission-check tasks. Permission needs must be verified locally rather than asserted as law.

### Prompt and validation

Versioned system instructions describe the planner role, output schema, known facts, prohibitions on invented vendors/prices, hard constraints, and estimate labeling. Supply a normalized JSON brief plus derived context and compact examples for urgent and constrained events. Ask for concise rationale, trade-offs, assumptions, and clarification needs; do not request hidden chain-of-thought. User text cannot override system constraints. No tool calls, retrieval, or external actions in MVP.

Use structured JSON output, then parse with Zod and check semantic invariants: known categories, finite nonnegative weights, bounded task offsets, valid dependency references, no cycles, and required sections. Schema conformity alone does not prove recommendations true. Mandatory deterministic rules are authoritative when model suggestions conflict. Unresolved preference conflicts are surfaced with alternatives; never silently discard special requirements.

Default is one generation per user action. Set request/output limits and a provider timeout (initial target 25 seconds, overall route budget about 45 seconds, adjusted after measurement). Allow at most one bounded retry for transient provider failure or one repair attempt for invalid output, sharing a maximum two-provider-call budget. Respect Retry-After and remaining deadline; do not retry authentication errors or trigger endless repair. Failure leaves the brief and saved plan intact with manual retry. A fixed sample plan may demonstrate offline behavior only when explicitly labeled; it must never masquerade as a successful Gemini generation.

### Budget rules

Store and calculate integer paise only, validate safe integers, and convert rupee inputs from decimal strings without floating-point multiplication. Use INR formatting only at display boundaries. AI supplies suggested relative weights and reasoning, never authoritative totals.

Allocate total paise across validated weights using largest remainder with stable category-ID tie breaking. Include a configurable contingency category (initial planning assumption 10%, editable). Resulting category allocations must sum exactly to total budget. Reject all-zero/invalid weights and use disclosed event-template weights if necessary. Prevent contingency from being counted twice.

Track separate quantities: allocated = sum category allocations; estimated = sum estimated line items; spent = sum actual expense records; unallocated = total minus allocated; remaining cash = total minus spent; forecast variance = total minus estimated. Allow negative remaining/variance and show overrun instead of clamping. Do not add actual spending to estimates when estimates already represent total category cost. Users may intentionally overallocate after edits; show the difference and require no misleading automatic rebalance. Budget reductions preserve entries and expose conflicts.

For the supplied birthday example: INR 30,000 / 50 = INR 600 per guest before reserving contingency. An illustrative allocation is food 15,000, space 4,000, decoration 3,000, cake/activities 3,000, logistics 2,000, contingency 3,000. This sums to 30,000 and is an editable allocation, not a Hyderabad price quote. Suggest home/community space only subject to actual availability and capacity; avoid promises that any package is purchasable.

### Timeline rules

Use calendar-date arithmetic, not milliseconds divided by 24 hours. Derive dates from validated lead-day offsets within [planning date, event date]. Essential tasks come from deterministic templates; Gemini adds personalization. Topologically order dependencies, place prerequisites no later than dependents, and revalidate after compression. Mark same-day urgent clusters and insufficient lead time explicitly; clamping dates does not establish feasibility. Reject cycles and missing references; offer simplified alternatives when booking/production lead times are unavailable.

Seven-day birthday priorities: confirm constraints/space now, shortlist food options and invitations early, confirm attendance and dietary counts next, buy/delegate essentials, reconfirm suppliers before the day, then setup and event-day checks. Long-range wedding tasks compress into urgent confirmation or reduced-scope alternatives, not fictitious months of preparation. Same-day events show immediate/optional items. Completion = completed eligible tasks / all eligible tasks; zero tasks shows 0% with an empty-state message. Overdue derives from date plus incomplete status.

### Vendor and idea rules

Select essential versus optional categories based on type, size, budget pressure, time, and requirements. Distinguish self-provided service from booked vendor. Always explain relevance; allow not-needed status. No verified names, ratings, availability, live quotes, or direct booking links invented by the model. Ideas must cite relevant input constraints and offer low-cost alternatives. Weather, venue capacity, permits, and availability are considerations to verify, not live facts.

## 8. Proposed Directory Structure

```text
planora-ai/
  src/
    app/
      layout.tsx                  # global shell/metadata
      page.tsx                    # saved-event overview
      events/new/page.tsx         # event form
      events/[id]/page.tsx        # local plan workspace
      api/plans/generate/route.ts # server orchestration
      globals.css
    components/
      ui/                         # small reusable controls
      events/                     # brief form and saved cards
      planner/                    # dashboard, budget, tasks, vendors
    lib/
      ai/{client,prompt,generate}.ts
      domain/{context,budget,timeline,vendors,plan}.ts
      schemas/{event,proposal,plan}.ts
      storage/{repository,local-storage,migrations}.ts
      server/{errors,rate-limit}.ts
    types/index.ts                # mostly infer from schemas
  tests/
    unit/
    integration/
    components/
    e2e/
    fixtures/                     # synthetic briefs/proposals only
  docs/{DEVELOPMENT_PLAN,ARCHITECTURE,DEMO}.md
  public/                         # tiny local assets only
  .github/workflows/ci.yml        # later, checks on main
  .env.example                    # names/placeholders only
  .gitignore
  README.md
  package.json
  package-lock.json
  next.config.ts
  tsconfig.json
  eslint.config.mjs
  vitest.config.ts
  playwright.config.ts
```

This is a proposed structure, not implemented files. Keep related helpers together; split modules only when their responsibilities warrant it. No monorepo or separate API service.

## 9. Development Roadmap

All phases below are proposed and depend on explicit development approval. Dates are IST targets.

| Phase / target | Objective and scope | Tasks and modules | Dependencies | Testing and completion gate |
| --- | --- | --- | --- | --- |
| 1 — Oct 26, 3–4h | Foundation with accessible UI skeleton | Scaffold pinned Next/TS/Tailwind; shell, saved-events empty state, form layout; establish Zod brief contract and test scripts; app/, components/ui/, schemas/event.ts | Plan approval; confirm tooling eligibility and compatible versions | Typecheck, lint, production build; keyboard/mobile shell review; no secrets or extra branches |
| 2 — Oct 27, 5–6h | Working vertical slice early | Validated form → context → real Gemini → validated proposal → deterministic composition → basic dashboard/save/reopen; route.ts, ai/, domain/, storage/ | Phase 1; Gemini access/model/quota | Real smoke generation plus mocked API tests; all three types generate and reopen; failures retain input |
| 3 — Oct 28, 5–6h | Contextual reasoning and correctness | Refine prompts, constraints, exact allocations, urgency/dependencies, vendor relevance, rationale and warning display | Phase 2 | Representative scenarios, invalid output, budget invariants; contextual checks pass across three types |
| 4 — Oct 29, 5–6h | Full management workflows | Budget edits and actuals, task editing/completion, vendor statuses, requirement revision preview; planner components and reducer | Phase 3 contracts stable | Component and integration tests; no data/status loss after edits or accepted revision |
| 5 — Oct 30, 4–5h | Usability and persistence hardening | Responsive dashboard, upcoming tasks, stale advice, storage errors/migrations, multi-tab warning, empty/error/loading states | Phase 4 | Refresh/reopen E2E, storage corruption/quota tests, keyboard and mobile review; optional export only if ahead |
| 6 — Oct 31, 5–7h | Feature freeze and quality gate | Abuse controls, validation attack cases, accessibility fixes, timeout/retry tests, performance and clean-clone build | Core MVP complete | Unit/API/component/E2E suite passes; manual rubric evidence; no critical accessibility or secret findings |
| 7 — Nov 1, 4–6h plus buffer | Release readiness and submission preparation | With separate authorization create public remote, push main, configure Vercel secrets, stage/test/promote; finalize README and <4m demo | Working credentials, eligibility clarification, remote/deployment approval | Clean-clone install/check/build; hosted real-AI smoke; public URL accessible; size and branch audit; user submits manually |

If behind: remove optional charts, export/import, visual themes, and richer vendor notes first. Do not cut any of the nine essential feature categories or core validation/testing. If real AI is unavailable by Oct 28, resolve access before adding polish; a mock alone does not satisfy the GenAI requirement.

## 10. Testing Strategy

Tests described here are planned, not executed. Prefer behavioral tests over component snapshots. Mock the provider for repeatable CI; keep a small, separately enabled live-AI smoke set with explicit quota budget. Inject clock and provider for deterministic tests.

| Scenario | Expected observable evidence |
| --- | --- |
| Hyderabad birthday, INR 30,000, 50 guests, 7 days | Exact sum; 600/person contextual figure; urgent food/space/RSVP tasks within seven days; practical simple ideas; no market-price guarantees |
| Wedding, 200 guests, INR 50,000, 3 days | Constraint conflict warning, reduced-scope alternatives, immediate decisions; no claim a conventional wedding is affordable or bookable |
| Community event, 500 guests, 30 days, wheelchair access/vegetarian meals | Accessibility, capacity verification, food requirements, volunteer/sanitation considerations reflected in tasks/vendors/ideas |
| Zero or very low budget, high guest count | No divide-by-zero/negative allocations; DIY/in-kind alternatives; explicit feasibility caveat |
| Same-day event / past date / midnight IST | Immediate task set / field rejection / correct calendar-day calculation |
| Missing location, fractional guests, huge or malformed payload | Helpful field errors; no provider call; bounded server work |
| Provider timeout, 429, malformed JSON, schema-valid nonsense | Bounded retry behavior; safe errors; invalid plan not persisted; current plan retained |
| Special request text attempts instruction override or includes HTML | Treated as untrusted data; no executable rendering, secrets, or external actions |
| Spending exceeds total; budget decreases; fractional rupees | Exact paise calculations; negative remaining visible; estimates and actuals not double-counted |
| Save/reload, damaged storage, denied quota, old schema | Valid plan round trip; recoverable errors and no silent data loss |
| Regenerate after completed task and actual payment | Existing record preserved; candidate explicitly accepted as revision/copy; stale response cannot overwrite newer brief |
| Keyboard-only and narrow viewport | All controls usable, focus visible, errors announced, no horizontal form overflow |

Unit tests: decimal parsing, largest-remainder tie/rounding cases, empty inputs, safe-integer limits, totals, progress, calendar scheduling, dependency cycles, and validators. API integration: route status codes, limits, prompt context, semantic rejection, retry cap, no secret errors. Component tests: budget inputs, status toggles, validation, error recovery. E2E: create→generate→save→refresh→edit→reopen, failure→retry, and revision preservation. Use fixed fixtures for exact assertions; evaluate live suggestions with a rubric (constraint coverage, feasibility caveats, relevant categories, no fabricated facts), not exact text matches.

### Evaluation mapping — no invented weights

| Criterion | Engineering/feature evidence | Verification |
| --- | --- | --- |
| Code quality | Typed contracts, pure domain modules, reusable controls, small server adapter | Strict typecheck/lint, focused review, clean install/build |
| Security | Server-only key, validated bodies/output, bounded AI, deployment-level rate controls, safe text rendering | Client-bundle secret check, malicious input tests, rate/error tests |
| Efficiency | One action/one normal call, bounded tokens, local edits without AI, minimal dependencies | Instrument request count/latency/token metadata; inspect bundle and network |
| Testing | Financial/date/API/storage tests plus critical E2E | Recorded passing commands and scenario matrix; disclose skipped live tests |
| Accessibility | Labels, focus/errors, keyboard, contrast, non-chart equivalents | axe plus manual keyboard/mobile/screen-reader spot check |
| Problem alignment | Three event types and all planning artifacts | Three scenario demos and end-to-end acceptance checklist |

Most distinctive intelligence: short-window prioritization, budget-pressure trade-offs, requirement-specific categories, conflict detection, and revision-aware recommendations. Show input facts → derived flags → suggestions/rationale in the demo. Do not expose hidden model reasoning.

## 11. Security Strategy

- `GEMINI_API_KEY` stays in server environment and `.env.local`; never `NEXT_PUBLIC_`. `.env.example` has placeholders only. Never log keys, raw briefs, or provider error bodies.
- Enforce type/length/size limits server-side, JSON content type, same-origin browser requests, output bounds, and plain React text rendering; no raw HTML/Markdown execution.
- Public generation is a paid-resource endpoint even without login. Browser debouncing or an in-memory counter is insufficient across serverless instances. Prefer platform rate limiting/bot controls available on the selected Vercel plan. Verify actual availability before release; if insufficient, add one small shared rate-limit store as an explicit exception to minimal infrastructure, plus a global generation ceiling. Do not release an unbounded paid endpoint.
- Provider quota and spend alerts are backstops; alerts alone are not hard cost caps. Add a server-side kill switch, bounded retries, output caps, and operational monitoring. Establish numeric limits after checking actual quota and expected judge traffic.
- No uploads, tool execution, booking, or arbitrary server fetches. Treat prompt injection as an output-integrity risk and validate results rather than assuming prompts eliminate it.
- Local event data is unencrypted browser data. Explain device/origin limitations and that generation sends the entered brief to Google. Discourage sensitive guest data. Provide local deletion and avoid retaining briefs in server logs.
- Before public publication, inspect tracked files and history for secrets and licenses. Dependency checks must be reviewed rather than blindly applying breaking upgrades.

## 12. Accessibility Strategy

Target WCAG 2.2 AA practices: semantic headings/landmarks; explicit input labels and helper/error associations; fieldsets for related choices; focus visible throughout; error summary focusing the first invalid field; polite live status for generation/saving. Budget status includes words and amounts rather than color alone. Use at least 4.5:1 normal text contrast and 3:1 large text/UI boundaries as applicable; sufficiently large touch targets. Native buttons/inputs first. Avoid unnecessary dialogs; if used, manage focus and Escape. Respect reduced motion. Use responsive cards/tables with accessible headers and text budget summaries. Test 360px mobile, tablet, desktop, zoom/reflow, keyboard, and a screen-reader spot check. Automated scans do not establish full conformance.

## 13. Deployment Strategy

No deployment is authorized now. Later, after approval: verify Vercel owner/project, GitHub owner, Node version, Gemini model availability, runtime duration, and plan-specific protection/rate-limit capabilities. One Next.js deployment is enough; no Services/Queues/Workflow needed.

Run clean `npm ci`, typecheck, lint, tests, and production build on main. Main-only workflow excludes feature branches and branch-based previews. Use explicit CLI preview from the approved main commit if desired, then stage a production build without assigning the public domain, test it with production configuration, and promote that tested build. Keep preview and production environment variables scoped appropriately. Avoid automatic production promotion before quality checks. CI configuration or account changes require the later remote-work authorization.

Test hosted generation, storage, reload, edits, phone layout, error recovery, quota controls, and judge access from a logged-out browser. Confirm browser-local plans are origin-specific: preview plans do not automatically transfer to production. Keep a known working deployment for rollback. Record deployment commit and any live-test limitations. Keep credentials out of build artifacts and traces.

## 14. GitHub and Submission Requirements

Local setup may initialize only main if no repository exists. No branch creation beyond initial main, no worktrees requiring branches, no remote creation/push now. No initial commit is required during planning. Existing sibling repositories are unrelated and must remain untouched.

Later public repository must include complete source, lockfile, tests, configuration examples, and comprehensive README. Exclude node_modules, .next, environments, .vercel, coverage, screenshots/test videos, browser binaries, and archives. Avoid large media entirely. Measure tracked working-tree bytes, source archive bytes, and Git object size before release; target <8 MB to leave margin under the supplied <10 MB rule. Confirm how organizers measure repository size; deletions do not remove oversized historical blobs. Keep walkthrough video externally hosted if permitted.

README must cover challenge vertical/statement, approach, features, architecture and domain logic, how it works, contextual AI decisions, assumptions, setup/environment variables, testing, deployment, and limitations. Include exact verified versions/commands once implementation exists. Add screenshots only if small and useful.

Prepare a 3:30–3:50 walkthrough: brief/problem (~20s), constrained birthday generation and rationale (~60s), exact budget/edit/spending (~40s), timeline/vendor status and persistence (~45s), alternate wedding/community context (~30s), architecture/testing/limitations (~25s). Rehearse below four minutes. User controls official submission; maximum three official attempts is tracked separately from local tests/commits/deployments. Do not submit automatically. Confirm whether blog/LinkedIn narrative material is mandatory and permitted before preparing or publishing it; no messages/posts sent by this task.

## 15. Risks and Mitigations

| Risk | Mitigation / release gate |
| --- | --- |
| Hallucinated facts | No live vendor claims, fact/assumption/estimate labels, constrained schema, semantic review, local-verification reminders |
| Financial errors | Integer paise, invariant tests, exact allocation, separate estimates/paid amounts, visible negative balances |
| Invalid or infeasible plans | Zod plus semantic checks, deterministic mandatory rules, bounded repair, explicit conflict warnings |
| API outages/quota/cost | Timeouts, max two calls, preserved input, manual retry, checked quotas/model, shared abuse control, kill switch |
| Security weaknesses | Server-only secrets, input/output bounds, safe errors/rendering, secret review before publishing |
| Deployment mismatch/failure | Early build checks, environment/runtime verification, staged production smoke and rollback |
| Repository too large | Small text-first source, excludes, <8 MB internal target, inspect history and official size definition |
| Coverage gaps | Risk-focused financial/date/error/storage tests and end-to-end critical paths; record results |
| Deadline | Early vertical slice; feature freeze Oct 31; optional scope removed first; daily usable milestone |
| Accessibility gaps | Native controls, accessible form/error design early, axe and manual review before release |
| Browser data loss | Versioned validation, handled quota/corruption, no silent overwrite, optional backup, clear limitations |
| Regeneration destroys edits | Revision guard and explicit candidate acceptance; preserve current version/actuals |
| Platform eligibility | Public FAQ requires Antigravity; seek challenge-specific organizer clarification before development approval |
| Unverified rules/deadline | Obtain official challenge page; treat supplied constraints as strict working requirements meanwhile |
| Invalid GitHub credentials | Reauthenticate outside chat; verify intended account/repository without printing tokens; no remote work until authorized |

## 16. MVP Definition of Done

- All nine essential feature groups work for wedding, birthday, and community events.
- Real server-side Gemini generation produces schema-valid, semantically checked plans; provenance is visible and estimates are labeled.
- Budget allocation is exact, editable, tracks actual paid spending, and exposes overruns.
- Tasks fit the planning interval, respect dependencies, can be edited/completed, and show progress.
- Vendor categories reflect context and retain statuses; no fabricated verified vendors or prices.
- Save/reopen/edit/reload works; requirement revisions do not silently erase existing work.
- Critical invalid-input, timeout, storage, and provider-output failures recover without losing the current plan.
- Typecheck, lint, production build, planned critical tests, and manual accessibility review pass; actual results are recorded.
- Release has verified abuse controls and no exposed keys; public URL and clean-clone README work.
- Main is the only branch; repository below supplied limit; demo under four minutes; eligibility and challenge rules reviewed.
- No claim of completion is based on this planning document alone. No official submission performed by the agent.

## 17. Recommended Next Steps

1. Review/approve this architecture, local-only persistence, and MVP scope. Development remains stopped until explicit approval.
2. Resolve the Antigravity/Codex eligibility conflict and confirm challenge-specific deadline/rules. The public FAQ is stronger evidence than assuming Codex is accepted.
3. Restore GitHub CLI login using the account's normal secure flow, confirm intended owner, then recheck repository existence. Do not paste credentials into chat.
4. Verify Gemini access, model, quotas/cost boundaries, and Vercel account/runtime support before the real-AI vertical slice. No secret inspection needed during planning.
5. After approval execute Phase 1: scaffold minimal stack; establish brief/storage contracts; build semantic shell/form; add scripts and a few meaningful validation tests; verify build and keyboard/mobile behavior. Stop scope expansion at the phase completion gate.
6. Request separate remote-work authorization only when local implementation is concrete and ready for publication/deployment. Do not create a remote or deploy under the current approval.

### Primary sources checked during planning

- [PromptWars Virtual public page and FAQ](https://promptwars.in/promptwarsVirtual.html): conflicting tool language, FAQ Antigravity requirement, and narrative submission information; challenge-specific supplied rules remain unverified.
- [Next.js installation](https://nextjs.org/docs/app/getting-started/installation): current framework installation and Node prerequisite reference.
- [Gemini structured output](https://ai.google.dev/gemini-api/docs/structured-output): schema-constrained generation and JavaScript validation integration; semantic validation remains application responsibility.
- [Gemini rate limits](https://ai.google.dev/gemini-api/docs/rate-limits): account/model/project quota verification required; no fixed free-tier assumption.
- [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing): check selected model's current charges before enabling generation; no cost estimate asserted in this plan.
- [Vercel Functions limits](https://vercel.com/docs/functions/limitations) and [deployment promotion](https://vercel.com/docs/deployments/promoting-a-deployment): verify selected plan/runtime limits and release procedure before deployment.

Planning sources may change; recheck implementation-specific SDK syntax, model availability, limits, and event rules when work begins.

