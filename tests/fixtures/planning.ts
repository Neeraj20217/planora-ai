import { composePlan } from "@/lib/domain/plan";
import {
  proposalSchema,
  type EventPlan,
  type Proposal,
} from "@/lib/schemas/plan";
import type { EventDetails } from "@/types";

export const NOW = new Date("2026-10-26T06:00:00Z");
export const brief: EventDetails = {
  eventType: "birthday",
  name: "Ananya’s birthday",
  date: "2099-11-01",
  location: "Hyderabad",
  guests: 50,
  budgetPaise: 3_000_000,
  currency: "INR",
  timezone: "Asia/Kolkata",
  theme: "Garden gathering",
  preferences: "Simple vegetarian food",
  specialRequirements: "Step-free access",
};
export const proposal: Proposal = proposalSchema.parse({
  overview:
    "A relaxed garden gathering in Hyderabad with vegetarian refreshments and step-free access for 50 guests.",
  recommendations: [
    {
      suggestion: "Confirm an accessible shared space first",
      rationale:
        "Step-free access and a comfortable location matter more than elaborate decoration.",
    },
  ],
  priorities: [
    {
      category: "catering",
      weight: 50,
      rationale:
        "Prioritize simple vegetarian refreshments for the guest count; request actual quotes.",
    },
    {
      category: "venue",
      weight: 15,
      rationale:
        "Consider a shared space only after confirming access and capacity.",
    },
  ],
  tasks: [
    {
      key: "access-check",
      title: "Confirm step-free access to the gathering space",
      leadDays: 7,
      priority: "high",
      dependsOn: [],
    },
    {
      key: "menu",
      title: "Choose a simple vegetarian menu",
      leadDays: 3,
      priority: "high",
      dependsOn: ["access-check"],
    },
  ],
  vendors: [
    {
      category: "catering",
      essential: true,
      rationale:
        "Confirm vegetarian food and water; self-provided refreshments may be suitable.",
    },
    {
      category: "decoration",
      essential: false,
      rationale: "Reuse simple garden decorations to preserve the budget.",
    },
  ],
  ideas: [
    {
      suggestion: "A shared-memory garden table",
      rationale:
        "Guests can contribute messages, fitting the relaxed theme without elaborate production.",
    },
  ],
  savings: [
    {
      suggestion: "Reuse decorations and borrow seating",
      rationale:
        "Existing resources can free funds for food, subject to actual availability.",
    },
  ],
  assumptions: [
    "A suitable accessible space is available, subject to confirmation.",
  ],
  warnings: [
    "Confirm food and space costs before committing to the suggested format.",
  ],
});

export function fixturePlan(
  overrides: Partial<EventDetails> = {},
  id = "a31b3123-95aa-4b8c-8704-7efcfd55b713",
): EventPlan {
  return {
    ...composePlan(
      { ...brief, ...overrides },
      proposal,
      "test-fixture",
      NOW,
      id as `${string}-${string}-${string}-${string}-${string}`,
    ),
    provenance: "test-fixture",
  };
}
