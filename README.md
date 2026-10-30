# Planora AI

**GenAI Celebration & Event Planning Workspace**  
*PromptWars Virtual 2026 — Main Challenge 05*

[![Live Website](https://img.shields.io/badge/Live%20Website-planora--ai--iota.vercel.app-blue?style=flat-square)](https://planora-ai-iota.vercel.app)
[![Node.js](https://img.shields.io/badge/Node.js-24.x%20LTS-green?style=flat-square)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16.4.3-black?style=flat-square)](https://nextjs.org/)
[![Model](https://img.shields.io/badge/Google%20Gemini-3.5%20Flash--Lite-orange?style=flat-square)](https://ai.google.dev/)
[![Tests](https://img.shields.io/badge/Tests-222%20Passed-brightgreen?style=flat-square)](https://github.com/Neeraj20217/planora-ai)

---

## 1. Challenge & Problem Statement

**Target Challenge:** PromptWars Virtual 2026 — Main Challenge 05: Celebration & Event Planner  
**Submission Deadline:** November 1, 2026, 11:59 PM IST  
**Official Problem Statement:**
> *"Create a GenAI-powered planning assistant that helps users organize weddings, birthdays, and community events with budgets, timelines, vendor checklists, and personalized ideas."*

### Purpose and Philosophy
Organizing celebrations in India often involves managing fragmented spreadsheets, unpredictable vendor communication, and shifting guest expectations. **Planora AI** turns this chaos into structured clarity. Users enter basic event details—guest count, date, location, budget in INR, theme, and dietary/cultural preferences—and receive an actionable planning blueprint within seconds.

Planora AI establishes a strict architectural boundary: **GenAI proposes creative strategy, personalized priorities, and tailored vendor roles, while deterministic application code enforces exact mathematical allocations, calendar schedules, and input validation.**

---

## 2. Public Live Website

- **Production URL:** [https://planora-ai-iota.vercel.app](https://planora-ai-iota.vercel.app)
- **Repository:** [https://github.com/Neeraj20217/planora-ai](https://github.com/Neeraj20217/planora-ai)
- **Access Page:** [https://planora-ai-iota.vercel.app/access](https://planora-ai-iota.vercel.app/access)
- **Guide & Documentation:** [https://planora-ai-iota.vercel.app/guide](https://planora-ai-iota.vercel.app/guide)

---

## 3. Features Across Event Types

Planora AI supports the three mandatory event verticals defined in Challenge 05:

| Event Vertical | Key Planning Dimensions | Specialized AI Outputs |
| :--- | :--- | :--- |
| **Weddings** | Multi-day ceremony sequencing, family coordination, reception & catering logistics | High-touch vendor categories (Venue, Catering, Photography/Cinematography, Decor, Attire/Styling, Makeup, Sound/Mehendi); milestone dependencies; cultural traditions. |
| **Birthdays** | Milestone celebrations, themed parties, age-tailored entertainment, pacing | Experiential activities, theme cake design, entertainer/magician booking, photo booths, return gift pacing, and party timelines. |
| **Community Events** | Cultural festivals, neighbourhood gatherings, fundraisers, sports meets | High-volume logistical checklists (Audiovisual/Stage, Crowd Management & Permits, Sanitation/Waste, First Aid, Volunteer Coordination) and public engagement concepts. |

### Core Workflow Features
- **Accessible Multi-Step Form**: Fully keyboard-navigable form with screen-reader live regions, real-time validation, and currency formatting.
- **Review Before Generation**: Transparent data review disclosing exactly what brief data will be sent to Google Gemini before network transmission.
- **Deterministic Budget Breakdown**: Integer-paise mathematics with an automatic 10% contingency fund and largest-remainder category allocation.
- **Dependency-Aware Interactive Timeline**: Milestone scheduling with completion tracking, progress indicators, and overdue warnings.
- **Interactive Vendor Checklist**: Essential vs. optional vendor identification with editable engagement statuses (`researching`, `contacted`, `booked`).
- **Personalized Ideas & Trade-Offs**: Creative theme concepts, entertainment ideas, and actionable cost-saving tips tailored to event scale.
- **Offline Persistence & Zero Lock-In**: Client-side versioned `localStorage` (`planora:plan:v1:<uuid>`) with in-browser save and reopen, stale-write detection, and zero attendee tracking.
- **Offline Reference Fallback**: Pre-computed canonical sample plans accessible for all three verticals when quotas or operator kill switches are active.

---

## 4. Architecture & Gemini Integration

```text
[ Browser Client ]
  │
  ├── 1. Form Validation (Zod schema, keyboard focus, currency parsing)
  ├── 2. User Review & Explicit Sharing Notice
  └── 3. POST /api/plans/generate (with BotID telemetry & session cookie)
        │
[ Vercel Edge / Serverless (iad1) ]
  │
  ├── 4. Security Boundary (Exact-Origin, Host, Content-Type, Size <= 32 KiB)
  ├── 5. BotID Basic Verification (Edge humanity check, rejects headless bots)
  ├── 6. Upstash Redis (Atomic Primary Lua Scripts)
  │     ├── Check operator kill switch (generation-state == 'enabled')
  │     ├── Enforce IP burst rate (3 req/min)
  │     ├── Enforce session / trial quota (2 generations/day per IP)
  │     ├── Enforce global daily cap (40 provider attempts/day across site)
  │     └── Acquire concurrency lease (max 2 active leases)
  │
  ├── 7. Google Gemini 3.5 Flash-Lite (@google/genai SDK v2.31.0)
  │     ├── Temperature: 0.2 (deterministic output)
  │     ├── Structured Output Schema (Zod -> JSON Schema)
  │     └── Strict 30s call timeout / 38s overall pipeline deadline
  │
  ├── 8. Deterministic Domain Composition
  │     ├── Integer-paise budget allocation (Contingency + Largest Remainder)
  │     └── Topological timeline sorting (Prerequisites strictly precede tasks)
  │
  └── 9. Response -> Client Dashboard -> Explicit Save -> LocalStorage
```

### Server-Only Secret Protection
- **No Client Exposure**: The Gemini API key and Redis credentials reside exclusively in serverless environment variables. `import "server-only"` prevents accidental frontend bundling.
- **Fail-Closed Design**: Any configuration absence, quota exhaustion, or invalid token aborts the request before provider invocation ($0.00 cost leakage).

---

## 5. How AI Makes Contextual Decisions

Planora AI does not treat the LLM as an unconstrained text generator. Instead, the prompt orchestrator injects derived metadata into the context:

1. **Budget Pressure Index**:
   Calculates budget per guest in INR ($\text{Total Budget} / \text{Guests}$) and categorizes the event into budget tiers (Economy, Balanced, Premium, Luxury). Gemini uses this to decide whether to recommend full-service banquets or curated DIY/community arrangements.
2. **Timeline Urgency Metric**:
   Computes the calendar days between today (evaluated strictly in `Asia/Kolkata` time) and the event date. Urgency tiers (Urgent $< 14\text{ days}$, Compressed $< 45\text{ days}$, Standard $> 90\text{ days}$) determine timeline pacing and fast-track vendor lead times.
3. **Guest Scale Heuristics**:
   Differentiates intimate gatherings ($< 25\text{ guests}$), standard events ($25\text{--}150\text{ guests}$), and large-scale crowds ($150\text{--}10,000\text{ guests}$), adjusting crowd management, venue requirements, and catering ratios accordingly.
4. **Feasibility Warnings**:
   When a user requests an unrealistic combination (e.g., 500 guests on a ₹20,000 budget), Gemini generates explicit feasibility warnings and trade-off advice rather than hallucinating unattainable supplier rates.

---

## 6. Budget & Timeline Calculation Logic

### Exact Money Arithmetic (Integer Paise)
Floating-point arithmetic is banned in Planora AI financial calculations to avoid rounding discrepancies:
1. **Input Parsing**: Currency inputs are validated and converted into integer paise ($1\text{ INR} = 100\text{ paise}$).
2. **Contingency Partition**: Exactly $10\%$ is reserved for unexpected expenses:
   $$\text{ContingencyPaise} = \left\lfloor \frac{\text{TotalPaise}}{10} \right\rfloor$$
3. **Largest-Remainder Allocation (Hare-Niemeyer)**:
   The remaining $90\%$ of funds are distributed across vendor categories using relative weights provided by Gemini:
   $$\text{CategoryPaise}_i = \left\lfloor \text{DistributablePaise} \times \frac{\text{Weight}_i}{\sum \text{Weights}} \right\rfloor$$
   Fractional remainders are sorted descending, with category names providing deterministic tie-breaking, distributing single-paise increments until the exact total is reached.
4. **Invariant**: $\sum \text{CategoryPaise} + \text{ContingencyPaise} \equiv \text{TotalPaise}$.

### Topological Timeline Scheduling
1. **Planning Horizon**: Dates are date-only calendar values bound to `Asia/Kolkata` calendar days.
2. **Prerequisite Graph**: Core task templates and AI-generated milestones are topologically sorted. Prerequisite tasks (e.g., "Confirm Venue & Date") are mathematically guaranteed to precede dependent tasks (e.g., "Send Invitations" or "Finalize Decor").
3. **Past-Date Clamping**: In compressed timelines, tasks are clamped between today and the event date with warnings highlighting urgent actions.

---

## 7. Setup & Running Locally

### Prerequisites
- Node.js **24.x LTS** (`node -v` $\ge 24.0.0$)
- npm **11.x**

### Quickstart
```bash
# Clone the public repository
git clone https://github.com/Neeraj20217/planora-ai.git
cd planora-ai

# Install dependencies cleanly
npm ci

# Configure local development environment
cp .env.example .env.local
```

### Configure Local Gemini API
Edit `.env.local` to enable loopback development:
```env
GEMINI_API_KEY="your-google-gemini-api-key"
GEMINI_MODEL="gemini-3.5-flash-lite"
AI_ENABLE_LOCAL_GENERATION="true"
```
*(Note: Never commit `.env.local`. Hosted generation remains disabled locally).*

### Verify Model Access & Start
```bash
# Check Gemini model availability (does not expose key)
npm run ai:models

# Start local development server
npm run dev
```
Visit [http://localhost:3000](http://localhost:3000) to create and test events.

---

## 8. Security, Limitations & Assumptions

### Security Controls
- **Exact-Origin & Anti-CSRF**: Hosted API endpoints reject requests with mismatched `Origin`, external `Host`, or cross-site `Sec-Fetch-Site`.
- **BotID Verification**: Production endpoints require client challenge verification from `@vercel/botid` (`botid/client/core` and `botid/server`). Direct automated curls or headless scrapers are rejected with HTTP 403 `BOT_DENIED`.
- **Multi-Tier Redis Quotas**: Upstash Redis executes atomic Lua scripts on every admission:
  - 3 requests per minute per IP hash.
  - 2 admitted generation plans per evaluation session.
  - 40 global provider attempts per UTC day hard cap ($< 8\%$ of free tier).
  - Maximum 2 concurrent execution leases.
- **Kill Switch**: Atomic Redis key (`generation-state`) can halt hosted generation across all serverless lambdas instantly without redeploying.
- **Client Privacy**: Event briefs are stored exclusively in client-side `localStorage`. No user credentials, personal phone numbers, or emails are persisted on servers.

### Current Limitations & Assumptions
- **Vendor Marketplace**: Vendor entries represent category specifications and budget allocations, not guaranteed live commercial contracts or directory listings.
- **Free-Tier Boundaries**: Built strictly on Google Gemini free-tier quotas and free Vercel/Upstash infrastructure ($0.00 operational cost).
- **Single-Region Serverless**: Serverless lambdas operate in `iad1` (East US). Initial cold-start latency from transatlantic locations is ~3–5 seconds; subsequent warm requests complete in ~1–3 seconds.

---

## 9. Testing & Verification Results

### Automated Test Suites
Planora AI maintains exhaustive automated test coverage:
```bash
# Run unit, domain, component, and integration suites
npm test

# Run TypeScript type safety verification
npm run typecheck

# Run linter
npm run lint

# Run production build
npm run build
```

**Results:**
- **13 Test Files Passed** (100%)
- **222 Automated Tests Passed** (0 failures)
- TypeScript strict typecheck: 0 errors.
- ESLint: 0 warnings, 0 errors.
- Production build: Compiled cleanly with static & dynamic routes.

### Live Production Verification
- **Test Date:** October 30, 2026.
- **Model:** Google Gemini 3.5 Flash-Lite (`gemini-3.5-flash-lite`).
- **Live Tested Events:**
  1. **Wedding Celebration**: ₹800,000 budget, 250 guests, Hyderabad, floral theme with vegetarian catering and accessibility needs. Generated in **7 seconds**. Exact ₹800,000 allocation across 7 categories including ₹80,000 (10%) contingency, 10 timeline tasks, 4 vendor categories, personalized lounge/decor ideas, and browser persistence verified on production.
  2. **Birthday Celebration**: ₹30,000 budget, 25 guests, Hyderabad. Exact ₹30,000 allocation across 5 categories plus contingency, 9 timeline tasks, vendor checklist, and browser persistence verified on production.
- **Event Scope Note:** Live hosted generation was verified on production for **Wedding** and **Birthday** verticals; **Community** planning models and schemas are verified via automated component and integration test suites and offline reference fixtures.

---

## 10. Judge Evaluation Instructions

Competition judges can evaluate Planora AI using either of two supported paths:

### Option A: Live Gemini Generation (Interactive Trial)
1. Open the production website: **[https://planora-ai-iota.vercel.app](https://planora-ai-iota.vercel.app)**
2. Navigate to the **[Generation Access](https://planora-ai-iota.vercel.app/access)** page.
3. Click **"Start evaluation session"**.
   - *This grants an instant, code-free 8-hour trial session (allowing up to 2 live Gemini generations per connection).*
4. Navigate to **"Create an event"** (`/events/new`).
5. Choose an event type (**Birthday**, **Wedding**, or **Community Event**), fill in details, and click **"Review event details"**.
6. Click **"Generate plan"**. Gemini 3.5 Flash-Lite will synthesize your custom plan.
7. Interact with timeline checkboxes, adjust vendor statuses, and click **"Save plan"**. Refresh or return to "My events" to verify persistent local storage.

### Option B: Offline Reference Mode (Guaranteed Access)
If the shared daily evaluation quota is reached or hosted generation is closed:
1. Navigate to **"Create an event"** (`/events/new`).
2. Fill in event details and click **"Review event details"**.
3. Click **"Explore sample plan (offline reference)"**.
4. The application renders full, pre-computed canonical plans for Weddings, Birthdays, or Community events with honest provenance labeling (`Offline Reference Sample`), allowing full evaluation of UI, budget math, timelines, and vendor checklists.

---

## 11. Project Repository Structure

```text
planora-ai/
├── src/
│   ├── app/                      # Next.js App Router routes (/, /access, /guide, /events)
│   │   └── api/                  # Serverless API routes (/api/plans/generate, /api/access)
│   ├── components/               # React UI components
│   │   ├── events/               # Accessible event forms and dashboard views
│   │   ├── planner/              # Plan dashboard, timeline, budget, vendor checklist
│   │   └── ui/                   # Reusable accessible inputs and alerts
│   ├── lib/
│   │   ├── ai/                   # Gemini SDK adapter, prompts, and JSON schema
│   │   ├── domain/               # Integer-paise budget math, dates, context heuristics
│   │   ├── schemas/              # Zod contracts for briefs, proposals, and plans
│   │   ├── server/               # Server-only boundary guards, rate limiters, errors
│   │   │   └── hosted/           # Upstash Redis atomic Lua scripts, BotID runtime
│   │   └── storage/              # Versioned localStorage repository & hooks
│   └── types/                    # TypeScript interfaces
├── tests/                        # Vitest unit, component, integration, and security suites
├── docs/                         # Architecture documentation and release runbooks
├── scripts/                      # Credential-safe admin and discovery scripts
└── README.md                     # Competition submission documentation
```

---

*Built for PromptWars Virtual 2026 — Main Challenge 05. Powered by Google Gemini.*
