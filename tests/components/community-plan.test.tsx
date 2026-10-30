// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { planSchema, type EventPlan } from "@/lib/schemas/plan";
import { composePlan } from "@/lib/domain/plan";
import { PlanDashboard } from "@/components/planner/plan-dashboard";
import type { EventDetails } from "@/types";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));

const communityEventDetails: EventDetails = {
  eventType: "community",
  name: "Neighborhood Sustainability Fair",
  date: "2026-12-05",
  location: "Hyderabad",
  guests: 100,
  budgetPaise: 80_000 * 100, // INR 80,000 in paise = 8,000,000
  currency: "INR",
  timezone: "Asia/Kolkata",
  theme: "Neighborhood sustainability fair",
  preferences: "Community garden, zero-waste workshops",
  specialRequirements: "Volunteer management, sanitation, accessibility and basic first aid.",
};

function createCommunityPlan(): EventPlan {
  const proposal = {
    overview: "A community sustainability fair in Hyderabad bringing together neighbors for zero-waste workshops, tree planting, and civic action.",
    recommendations: [
      {
        suggestion: "Set up volunteer shifts for waste segregation and accessibility assistance",
        rationale: "Smooth management requires dedicated team members assigned to sanitation and first aid.",
      },
      {
        suggestion: "Coordinate with civic authorities for venue access and clean drinking water",
        rationale: "Community events require reliable utilities and accessibility compliance.",
      },
    ],
    priorities: [
      { category: "logistics" as const, weight: 35, rationale: "Waste bins, compost stations, first aid, and volunteer vests." },
      { category: "catering" as const, weight: 25, rationale: "Drinking water stations and sustainable community snacks." },
      { category: "venue" as const, weight: 20, rationale: "Park or community hall permit and accessible seating." },
      { category: "entertainment" as const, weight: 10, rationale: "PA system for announcements and sustainability workshops." },
    ],
    tasks: [
      { key: "permits", title: "Obtain park permit and accessibility clearance", leadDays: 30, priority: "high" as const, dependsOn: [] },
      { key: "volunteer-briefing", title: "Recruit volunteers and assign sanitation/first-aid leads", leadDays: 14, priority: "high" as const, dependsOn: ["permits"] },
      { key: "equipment-rental", title: "Arrange waste sorting bins, PA system, and shade tents", leadDays: 7, priority: "normal" as const, dependsOn: ["permits"] },
      { key: "day-prep", title: "Place accessibility signs and first-aid kits", leadDays: 1, priority: "high" as const, dependsOn: ["volunteer-briefing"] },
    ],
    vendors: [
      { category: "logistics" as const, essential: true, rationale: "Sanitation bins, first-aid kits, and sound system." },
      { category: "venue" as const, essential: true, rationale: "Public community space with step-free access." },
      { category: "catering" as const, essential: false, rationale: "Locally sourced tea, water, and refreshments." },
      { category: "entertainment" as const, essential: false, rationale: "Eco-workshop hosts and demonstration tools." },
    ],
    ideas: [
      { suggestion: "Community seed and sapling exchange table", rationale: "Encourages neighborhood greening with minimal budget expenditure." },
      { suggestion: "Interactive zero-waste sorting relay game", rationale: "Educates participants while keeping the venue spotless." },
    ],
    savings: [
      { suggestion: "Borrow PA system from neighborhood association", rationale: "Eliminates commercial audio equipment rental cost." },
    ],
    assumptions: ["Outdoor park venue includes potable water access and electricity."],
    warnings: ["Ensure shade tents and hydration points are clearly marked."],
  };

  const composed = composePlan(
    communityEventDetails,
    proposal,
    "gemini-3.5-flash-lite",
    new Date("2026-10-30T12:00:00Z"),
  );
  return planSchema.parse(composed);
}

describe("Community Event plan assertions & schema compliance", () => {
  beforeEach(() => localStorage.clear());

  it("uses plan.categories directly to verify exact INR 80,000 budget and contingency", () => {
    const plan = createCommunityPlan();

    // 1. Invariant: plan.categories exists (not plan.budget.categories)
    expect(plan.categories).toBeDefined();
    expect(Array.isArray(plan.categories)).toBe(true);

    // 2. Budget sum equals INR 80,000 (8,000,000 paise)
    const sumPaise = plan.categories.reduce((acc, cat) => acc + cat.allocationPaise, 0);
    expect(sumPaise).toBe(80_000 * 100);

    // 3. Contingency is included as exactly 10% (800,000 paise = INR 8,000)
    const contingency = plan.categories.find((c) => c.category === "contingency");
    expect(contingency).toBeDefined();
    expect(contingency!.allocationPaise).toBe(800_000);
    expect(contingency!.rationale).toContain("10% reserve");
  });

  it("verifies timeline tasks, dependencies, vendor checklist and personalized ideas", () => {
    const plan = createCommunityPlan();

    // Provenance equals "gemini"
    expect(plan.provenance).toBe("gemini");
    expect(plan.model).toBe("gemini-3.5-flash-lite");

    // Timeline tasks exist with valid date ordering and prerequisite rules
    expect(plan.tasks.length).toBeGreaterThanOrEqual(4);
    for (const task of plan.tasks) {
      expect(task.dueDate >= plan.asOfDate).toBe(true);
      expect(task.dueDate <= communityEventDetails.date).toBe(true);
      for (const depId of task.dependsOn) {
        const dep = plan.tasks.find((t) => t.id === depId);
        expect(dep).toBeDefined();
        expect(dep!.dueDate <= task.dueDate).toBe(true);
      }
    }

    // Vendor checklist is relevant to community events
    expect(plan.vendors.length).toBeGreaterThanOrEqual(3);
    const logisticsVendor = plan.vendors.find((v) => v.category === "logistics");
    expect(logisticsVendor).toBeDefined();
    expect(logisticsVendor!.essential).toBe(true);

    // Personalized ideas match the brief
    expect(plan.ideas.length).toBeGreaterThanOrEqual(2);
    expect(plan.ideas.some((i) => i.suggestion.toLowerCase().includes("seed") || i.suggestion.toLowerCase().includes("zero-waste"))).toBe(true);
  });

  it("supports task completion interactions, vendor status changes, saving and reopening", async () => {
    const user = userEvent.setup();
    const plan = createCommunityPlan();

    render(<PlanDashboard initialPlan={plan} />);

    // 1. Task completion interaction
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes[0]).not.toBeChecked();
    await user.click(checkboxes[0]);
    expect(checkboxes[0]).toBeChecked();

    // 2. Vendor status interaction
    const vendorSelect = screen.getByLabelText("Selection status for Coordination & essentials");
    expect(vendorSelect).toHaveValue("not-started");
    await user.selectOptions(vendorSelect, "booked");
    expect(vendorSelect).toHaveValue("booked");

    // 3. Save plan to localStorage
    const saveButton = screen.getByRole("button", { name: "Save plan" });
    await user.click(saveButton);
    expect(await screen.findByRole("status")).toHaveTextContent("Plan saved");

    // 4. Verify saved record in localStorage
    const rawSaved = localStorage.getItem(`planora:plan:v1:${plan.id}`);
    expect(rawSaved).not.toBeNull();
    const parsedSaved = JSON.parse(rawSaved!) as EventPlan;

    expect(parsedSaved.tasks[0].completed).toBe(true);
    expect(parsedSaved.vendors.find((v) => v.category === "logistics")?.status).toBe("booked");
    expect(parsedSaved.categories.reduce((s, c) => s + c.allocationPaise, 0)).toBe(80_000 * 100);

    // 5. Reopen saved plan and confirm state persistence
    const { unmount } = render(<PlanDashboard initialPlan={parsedSaved} />);
    const reopenedCheckboxes = screen.getAllByRole("checkbox");
    expect(reopenedCheckboxes[0]).toBeChecked();
    unmount();
  });
});
