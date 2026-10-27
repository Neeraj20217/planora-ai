import type { EventDetails } from "@/types";
import { planSchema, type Proposal, type PlanVendor } from "@/lib/schemas/plan";
import { allocateBudget } from "./budget";
import { buildTimeline } from "./timeline";
import { planningContext } from "./context";
import { todayInIndia } from "./date";

export function composePlan(
  details: EventDetails,
  proposal: Proposal,
  model: string,
  now = new Date(),
  id = crypto.randomUUID(),
) {
  const asOfDate = todayInIndia(now);
  const context = planningContext(details, asOfDate);
  if (context.daysRemaining < 0) throw new Error("Past event");
  const timeline = buildTimeline(details, asOfDate, proposal.tasks);
  const vendors = new Map<PlanVendor["category"], PlanVendor>();
  vendors.set("venue", {
    category: "venue",
    essential: true,
    rationale:
      "Confirm space and capacity, whether self-provided or hired. No availability has been checked.",
    status: "not-started",
  });
  vendors.set("logistics", {
    category: "logistics",
    essential: true,
    rationale:
      details.eventType === "community"
        ? "Assign volunteers, equipment, sanitation and access responsibilities; verify local requirements."
        : "Assign someone to coordinate essentials and special requirements; a paid organizer is optional.",
    status: "not-started",
  });
  for (const vendor of proposal.vendors)
    vendors.set(vendor.category, {
      ...vendor,
      essential:
        ["venue", "logistics"].includes(vendor.category) || vendor.essential,
      status: "not-started",
    });
  return planSchema.parse({
    schemaVersion: 1,
    id,
    revision: 0,
    details,
    generatedAt: now.toISOString(),
    asOfDate,
    model,
    promptVersion: "planora-2",
    provenance: "gemini",
    overview: proposal.overview,
    recommendations: proposal.recommendations,
    ideas: proposal.ideas,
    savings: proposal.savings,
    assumptions: [
      ...proposal.assumptions,
      "Allocations are estimates, not verified market prices. Supplier names, ratings, availability and bookings have not been verified.",
    ],
    warnings: [
      ...new Set([
        ...context.warnings,
        ...timeline.warnings,
        ...proposal.warnings,
      ]),
    ],
    categories: allocateBudget(details, proposal.priorities),
    tasks: timeline.tasks,
    vendors: [...vendors.values()],
  });
}
