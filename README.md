# Planora AI

A celebration-planning workspace for weddings, birthdays, and community events.

**Current status: Phase 1 foundation complete.** You can enter, validate, review, and edit an event brief. Briefs exist only in the current page's memory: refreshing or leaving discards them. AI generation, saving/reopening plans, budget tracking, timelines, and vendor management are not implemented yet.

## Challenge and approach

Target: PromptWars Virtual 2026, Main Challenge 05 — Celebration & Event Planner.

User-supplied problem statement: “Create a GenAI-powered planning assistant that helps users organize weddings, birthdays, and community events with budgets, timelines, vendor checklists, and personalized ideas.”

The planned solution combines contextual Gemini suggestions with deterministic financial and scheduling logic. Phase 1 establishes trustworthy inputs and accessible navigation before introducing AI. See [the development plan](docs/DEVELOPMENT_PLAN.md) for the full proposal and [the Phase 1 report](docs/PHASE_1_REPORT.md) for verified results.

## Implemented features

- Next.js App Router with TypeScript strict mode and Tailwind CSS.
- Responsive overview, event creation, planning guide, and not-found recovery pages.
- Wedding, birthday, and community-event radio choices with native keyboard behavior.
- Event name, date, location, guest count, budget in INR, theme, personal preferences, and special requirements.
- Zod input validation with error summary, associated field errors, and first-invalid-field focus.
- Review/edit flow that preserves entered values while this page stays open.
- Reusable domain types, canonical event-details schema, and a versioned future-storage contract.
- Locally bundled fonts, Lucide icons, semantic navigation, skip link, visible focus, and reduced-motion support.
- Unit/component tests plus desktop/mobile production-browser checks and automated axe scans.

## Requirements and local setup

Verified with Node.js **24.19.0** and npm **11.17.0**. Use Node 24.x. Git is needed to clone the public repository. No API key, account login, database, or environment file is needed to run Phase 1.

```powershell
git clone https://github.com/Neeraj20217/planora-ai.git
cd planora-ai
npm ci
npm run dev
```

For the existing checkout:

```powershell
Set-Location D:\Coding\Codex\planora-ai
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Routes: `/` (overview), `/events/new` (brief form), `/guide` (planning guide).

Dependencies are pinned with `package-lock.json`. Important versions: Next.js 16.4.3, React 19.3.1, Tailwind 4.3.3, Zod 4.6.7, TypeScript 6.0.3, Vitest 5.0.5. ESLint uses the official Next plugin directly with TypeScript, React Hooks, and accessibility plugins to avoid outdated transitive peer ranges in the aggregate config.

Both development and production build scripts explicitly use Webpack. On the verified Windows machine, Application Control blocks native SWC; Next.js successfully uses its supported WebAssembly compiler fallback with Webpack. The first fallback use can require a network download into Next.js's user cache. No policy changes or native-binary exclusions are needed.

## Verification

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

`typecheck` generates Next route types before running `tsc --noEmit`, so it also works before the first build. `test:e2e` requires a completed production build and starts/stops a local production server on port 3100. Leave that port free. Playwright tests use desktop Chromium and mobile Chromium emulation; they do not establish Safari/iOS compatibility. Browser binaries, reports, and traces stay outside tracked source. `npm run test:watch` is available for local test iteration.

Production build locally:

```powershell
npm run build
npm start
```

This serves the application locally; it is not a cloud deployment.

## Architecture and logic

```text
App Router server layout/pages
  └─ EventForm client component
       ├─ Field component (labels, hints, linked errors)
       ├─ Zod form schema → normalized EventDetails
       ├─ Date-only validation in Asia/Kolkata
       └─ Exact decimal-string → integer-paise conversion
            └─ In-memory review → edit
```

`src/lib/schemas/event.ts` is the shared contract. Types are inferred from schemas rather than duplicated. Guests must be an integer from 1 through 10,000. Dates must be real calendar dates on or after today in India; current date is rechecked on submit. Budgets must be from INR 0 through INR 10 crore, without commas, using at most two decimal places. Money is converted using integer arithmetic, not decimal multiplication. Names/locations and optional text have explicit length limits.

`eventDetailsSchema` validates the canonical domain shape; `eventBriefSchema` wraps it in version/UUID/revision metadata for later persistence. Stored date contracts deliberately permit historic dates, whereas a new form rejects past dates. No storage adapter or AI endpoint is implemented in Phase 1.

```text
src/app/                 overview, layout, styles, event route, guide, 404
src/components/          navigation, event form, reusable field
src/lib/domain/          date and money primitives
src/lib/schemas/         form/domain/versioned brief contracts
src/types/               schema-inferred public types
tests/unit/              input boundaries, money, dates, contract tests
tests/components/        form validation, review/edit, focus and recovery
tests/e2e/               production navigation, form flows, axe, mobile layout
docs/                    development plan and phase report
```

## Contextual AI decision-making — planned

Later phases will derive preparation time and budget pressure deterministically, then request structured Gemini suggestions with rationale and explicit assumptions. Schema/semantic validation will precede acceptance. Exact allocation totals, timeline boundaries, and progress will remain application logic. No live contextual AI claims are made for this foundation release. No Google SDK or AI integration has been added.

## Security, privacy, and accessibility

The form does not call external services or write browser storage. React renders user input as text. No API credentials are needed or tracked. Ignore rules exclude environments, dependencies, build output, local tool artifacts, and test reports. Future server handlers must independently enforce the shared schema; browser validation alone is not a security boundary.

Automated accessibility checks cover the initial form and validation-error state. Keyboard checks cover navigation, skip link, radio selection, first-error focus, and review focus. Automated checks are partial evidence, not a claim of complete WCAG conformance; screen-reader and broader browser reviews remain future quality work.

## Deployment and submission — deferred

Vercel is the planned host. Before a later authorized release: verify owner/project/runtime, run quality checks, configure server-only credentials when AI exists, stage/test production, and promote the tested build. No deployment or competition submission was performed for Phase 1.

Work only on `main`. Keep source, history, and submission archive below the user-supplied 10 MB limit; generated dependencies/builds/videos do not belong in Git. The supplied three-attempt limit applies to official submissions, not commits or tests. Prepare a demonstration under four minutes only when the working MVP is ready.

## Assumptions and limitations

- Single organizer, English UI, INR, date-only events in Asia/Kolkata.
- No saving, persistence, account system, real AI, vendor lookup, prices, or booking functionality yet.
- No sensitive guest details should be entered. User-entered content is lost on refresh/navigation by design in this foundation phase.
- The full development plan describes future scope; its original environment findings are historical. Authentication and publication status are updated in the Phase 1 report.
- Hackathon-specific rules and the supplied November 1 deadline remain subject to official confirmation. The public [PromptWars FAQ](https://promptwars.in/promptwarsVirtual.html) requires Google Antigravity despite broader wording elsewhere. Codex eligibility has not been established.
- No deployment, submission, or Phase 2 work is authorized by this release.
