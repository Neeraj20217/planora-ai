import { describe, expect, it } from "vitest";
import { allocateBudget } from "@/lib/domain/budget";
import { buildTimeline } from "@/lib/domain/timeline";
import { planningContext } from "@/lib/domain/context";
import { planSchema, proposalSchema } from "@/lib/schemas/plan";
import { brief, fixturePlan, proposal } from "../fixtures/planning";

describe("exact allocation engine", () => {
  it.each([0, 1, 2, 9, 10, 11, 29, 100, 10001, 3_000_000, 10_000_000_000])(
    "allocates %i paise exactly with one contingency",
    (budgetPaise) => {
      const result = allocateBudget(
        { ...brief, budgetPaise },
        proposal.priorities,
      );
      expect(result.reduce((sum, item) => sum + item.allocationPaise, 0)).toBe(
        budgetPaise,
      );
      expect(
        result.every(
          (item) =>
            Number.isSafeInteger(item.allocationPaise) &&
            item.allocationPaise >= 0,
        ),
      ).toBe(true);
      expect(
        result.filter((item) => item.category === "contingency"),
      ).toHaveLength(1);
      expect(
        result.find((item) => item.category === "contingency")!.allocationPaise,
      ).toBe(Math.floor(budgetPaise / 10));
    },
  );
  it("is deterministic under reordered model weights and rounds ties consistently", () => {
    expect(
      allocateBudget({ ...brief, budgetPaise: 29 }, proposal.priorities),
    ).toEqual(
      allocateBudget(
        { ...brief, budgetPaise: 29 },
        [...proposal.priorities].reverse(),
      ),
    );
  });
  it("uses type-specific defaults for zero model weights", () => {
    const priorities = proposal.priorities.map((item) => ({
      ...item,
      weight: 0,
    }));
    const result = allocateBudget(brief, priorities);
    expect(result.reduce((sum, item) => sum + item.allocationPaise, 0)).toBe(
      brief.budgetPaise,
    );
  });
});

describe("context and timeline", () => {
  it("computes the supplied seven-day birthday example without AI arithmetic", () => {
    const result = planningContext(
      { ...brief, date: "2026-11-02" },
      "2026-10-26",
    );
    expect(result.daysRemaining).toBe(7);
    expect(result.perGuestPaise).toBe(60_000);
    expect(result.urgency).toBe("urgent");
    expect(result.warnings.join(" ")).toMatch(/Short notice/);
  });
  it("flags zero funds, high guest counts and infeasible short notice", () => {
    const result = planningContext(
      { ...brief, guests: 500, budgetPaise: 0, date: "2026-10-26" },
      "2026-10-26",
    );
    expect(result.warnings.join(" ")).toMatch(/No spending budget/);
    expect(result.warnings.join(" ")).toMatch(/Large gathering/);
    expect(result.urgency).toBe("same-day");
  });
  it.each(["wedding", "birthday", "community"] as const)(
    "composes a valid %s plan",
    (eventType) => {
      const plan = fixturePlan({ eventType });
      expect(planSchema.safeParse(plan).success).toBe(true);
      expect(
        plan.vendors.find((vendor) => vendor.category === "venue")!.essential,
      ).toBe(true);
      expect(
        plan.vendors.find((vendor) => vendor.category === "logistics")!
          .essential,
      ).toBe(true);
    },
  );
  it.each(["2026-10-26", "2026-10-27", "2026-11-02", "2027-01-01"])(
    "never schedules past tasks for %s and keeps dependencies ordered",
    (date) => {
      const { tasks } = buildTimeline(
        { ...brief, date },
        "2026-10-26",
        proposal.tasks,
      );
      const seen = new Map<string, string>();
      for (const task of tasks) {
        expect(task.dueDate >= "2026-10-26" && task.dueDate <= date).toBe(true);
        for (const dep of task.dependsOn) {
          expect(seen.has(dep)).toBe(true);
          expect(seen.get(dep)! <= task.dueDate).toBe(true);
        }
        seen.set(task.id, task.dueDate);
      }
    },
  );
  it("exposes compression instead of claiming that same-day bookings are feasible", () =>
    expect(
      buildTimeline(
        { ...brief, date: "2026-10-26" },
        "2026-10-26",
        proposal.tasks,
      ).warnings.join(" "),
    ).toMatch(/does not guarantee/));
  it("rejects missing/cyclic dependencies at the scheduler boundary", () =>
    expect(() =>
      buildTimeline(brief, "2026-10-26", [
        { ...proposal.tasks[0], dependsOn: ["missing"] },
      ]),
    ).toThrow());
});

describe("AI proposal and stored plan semantics", () => {
  it("rejects malformed response sections", () =>
    expect(
      proposalSchema.safeParse({ ...proposal, overview: "", ideas: [] })
        .success,
    ).toBe(false));
  it.each([-1, 1.5, 101])("rejects invalid weight %s", (weight) =>
    expect(
      proposalSchema.safeParse({
        ...proposal,
        priorities: [{ ...proposal.priorities[0], weight }],
      }).success,
    ).toBe(false),
  );
  it("rejects duplicate categories", () =>
    expect(
      proposalSchema.safeParse({
        ...proposal,
        vendors: [proposal.vendors[0], proposal.vendors[0]],
      }).success,
    ).toBe(false));
  it("rejects cyclic task dependencies", () =>
    expect(
      proposalSchema.safeParse({
        ...proposal,
        tasks: [
          { ...proposal.tasks[0], dependsOn: ["menu"] },
          proposal.tasks[1],
        ],
      }).success,
    ).toBe(false));
  it("rejects invented pricing fields and categories", () => {
    expect(
      proposalSchema.safeParse({
        ...proposal,
        vendors: [{ ...proposal.vendors[0], price: 100 }],
      }).success,
    ).toBe(false);
    expect(
      proposalSchema.safeParse({
        ...proposal,
        priorities: [{ ...proposal.priorities[0], category: "made-up" }],
      }).success,
    ).toBe(false);
  });
  it("rejects tampered stored allocations, dates and dependencies", () => {
    const plan = fixturePlan();
    expect(
      planSchema.safeParse({
        ...plan,
        categories: plan.categories.map((item, i) =>
          i === 0
            ? { ...item, allocationPaise: item.allocationPaise + 1 }
            : item,
        ),
      }).success,
    ).toBe(false);
    expect(
      planSchema.safeParse({
        ...plan,
        tasks: [
          { ...plan.tasks[0], dueDate: "2026-10-25" },
          ...plan.tasks.slice(1),
        ],
      }).success,
    ).toBe(false);
    expect(
      planSchema.safeParse({
        ...plan,
        tasks: [
          { ...plan.tasks[0], dependsOn: ["missing"] },
          ...plan.tasks.slice(1),
        ],
      }).success,
    ).toBe(false);
  });
});
