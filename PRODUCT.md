# Product

<!-- impeccable:product-schema 1 -->

## Platform
web

## Stack
User-approved Next.js App Router, TypeScript, Tailwind CSS, Lucide, and Zod. Vitest, React Testing Library and Playwright; official server-only Google GenAI SDK for Phase 2.

## Users
Individual organizers of weddings, birthdays, and community events, using desktop, tablet, or mobile.

## Product Purpose
Turn event requirements into actionable, editable planning artifacts with budgets, timelines, vendor categories, and personalized ideas. Phase 2 adds checked generation, an interactive dashboard and browser-local saved plans.

## Capabilities and Constraints
INR by default; date-only events interpreted in Asia/Kolkata. Financial values use integer paise. Gemini generation is server-only and requires an operator-configured key plus explicit loopback activation. Versioned localStorage stores generated plans. Live AI remains unverified because credentials were absent. No deployment, submission or Phase 3 work is authorized. Only the main Git branch is allowed; tracked repository must stay below 10 MB.

## Evidence on Hand
docs/DEVELOPMENT_PLAN.md and the user's explicit Phase 1 and Phase 2 approvals. No customer testimonials or verified vendor data are available. The Gemini integration is implemented; live AI verification remains pending.

## Accessibility & Inclusion
Semantic HTML, visible keyboard focus, associated labels and errors, readable contrast, responsive layout, and reduced-motion support.

## Open Decisions
No user-pinned visual identity. Visual choices for this implementation are engineering design decisions, not claims of an approved brand system. Hackathon platform eligibility remains unresolved as documented in the plan.
