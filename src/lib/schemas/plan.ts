import { z } from "zod";
import { eventDetailsSchema } from "./event";
import { isCalendarDate } from "@/lib/domain/date";

export const CATEGORIES = [
  "venue",
  "catering",
  "decoration",
  "photography",
  "entertainment",
  "transport",
  "equipment",
  "logistics",
] as const;
export const CATEGORY_LABELS: Record<string, string> = {
  venue: "Venue & space",
  catering: "Food & refreshments",
  decoration: "Decoration",
  photography: "Photography",
  entertainment: "Entertainment",
  transport: "Transportation",
  equipment: "Event equipment",
  logistics: "Coordination & essentials",
  contingency: "Contingency",
};
const text = (max = 600) => z.string().trim().min(1).max(max);
const key = z.string().regex(/^[a-z][a-z0-9-]{0,39}$/);
const advice = z.object({ suggestion: text(), rationale: text() }).strict();
export const proposalShape = z
  .object({
    overview: text(1200),
    recommendations: z.array(advice).min(1).max(8),
    priorities: z
      .array(
        z
          .object({
            category: z.enum(CATEGORIES),
            weight: z.number().int().min(0).max(100),
            rationale: text(),
          })
          .strict(),
      )
      .min(1)
      .max(8),
    tasks: z
      .array(
        z
          .object({
            key,
            title: text(160),
            leadDays: z.number().int().min(0).max(3650),
            priority: z.enum(["high", "normal"]),
            dependsOn: z.array(key).max(8),
          })
          .strict(),
      )
      .min(1)
      .max(18),
    vendors: z
      .array(
        z
          .object({
            category: z.enum(CATEGORIES),
            essential: z.boolean(),
            rationale: text(),
          })
          .strict(),
      )
      .min(1)
      .max(8),
    ideas: z.array(advice).min(1).max(6),
    savings: z.array(advice).min(1).max(6),
    assumptions: z.array(text()).min(1).max(8),
    warnings: z.array(text()).max(8),
  })
  .strict();

export const proposalSchema = proposalShape.superRefine((value, ctx) => {
  for (const field of ["priorities", "vendors"] as const) {
    if (
      new Set(value[field].map((item) => item.category)).size !==
      value[field].length
    )
      ctx.addIssue({
        code: "custom",
        path: [field],
        message: "Duplicate categories.",
      });
  }
  const tasks = new Map(value.tasks.map((task) => [task.key, task]));
  if (tasks.size !== value.tasks.length)
    ctx.addIssue({
      code: "custom",
      path: ["tasks"],
      message: "Duplicate task keys.",
    });
  const visiting = new Set<string>();
  const done = new Set<string>();
  const visit = (id: string): boolean => {
    if (visiting.has(id) || !tasks.has(id)) return false;
    if (done.has(id)) return true;
    visiting.add(id);
    for (const dep of tasks.get(id)!.dependsOn) if (!visit(dep)) return false;
    visiting.delete(id);
    done.add(id);
    return true;
  };
  if (value.tasks.some((task) => !visit(task.key)))
    ctx.addIssue({
      code: "custom",
      path: ["tasks"],
      message: "Missing or cyclic task dependency.",
    });
});

const date = z.string().refine(isCalendarDate);
export const taskSchema = z
  .object({
    id: text(80),
    title: text(160),
    dueDate: date,
    priority: z.enum(["high", "normal"]),
    dependsOn: z.array(text(80)).max(30),
    completed: z.boolean(),
  })
  .strict();
export const vendorSchema = z
  .object({
    category: z.enum(CATEGORIES),
    essential: z.boolean(),
    rationale: text(),
    status: z.enum([
      "not-started",
      "shortlisted",
      "contacted",
      "booked",
      "not-needed",
    ]),
  })
  .strict();
const planShape = z
  .object({
    schemaVersion: z.literal(1),
    id: z.uuid(),
    revision: z.number().int().min(0).max(1_000_000),
    details: eventDetailsSchema,
    generatedAt: z.iso.datetime(),
    asOfDate: date,
    model: text(128),
    promptVersion: z.literal("planora-2"),
    provenance: z.enum(["gemini", "test-fixture"]),
    overview: text(1200),
    recommendations: z.array(advice).min(1).max(8),
    ideas: z.array(advice).min(1).max(6),
    savings: z.array(advice).min(1).max(6),
    assumptions: z.array(text()).min(1).max(10),
    warnings: z.array(text()).max(40),
    categories: z
      .array(
        z
          .object({
            category: z.enum([...CATEGORIES, "contingency"]),
            allocationPaise: z.number().int().min(0).max(10_000_000_000),
            rationale: text(),
          })
          .strict(),
      )
      .min(2)
      .max(9),
    tasks: z.array(taskSchema).min(1).max(40),
    vendors: z.array(vendorSchema).min(1).max(8),
  })
  .strict();

export const planSchema = planShape.superRefine((plan, ctx) => {
  if (plan.asOfDate > plan.details.date)
    ctx.addIssue({ code: "custom", message: "Planning date follows event." });
  if (
    new Set(plan.categories.map((item) => item.category)).size !==
      plan.categories.length ||
    plan.categories.filter((item) => item.category === "contingency").length !==
      1 ||
    plan.categories.reduce((sum, item) => sum + item.allocationPaise, 0) !==
      plan.details.budgetPaise
  )
    ctx.addIssue({
      code: "custom",
      path: ["categories"],
      message: "Invalid allocation totals or categories.",
    });
  if (
    new Set(plan.vendors.map((item) => item.category)).size !==
    plan.vendors.length
  )
    ctx.addIssue({
      code: "custom",
      path: ["vendors"],
      message: "Duplicate vendor categories.",
    });
  const tasks = new Map(plan.tasks.map((task) => [task.id, task]));
  if (tasks.size !== plan.tasks.length)
    ctx.addIssue({
      code: "custom",
      path: ["tasks"],
      message: "Duplicate tasks.",
    });
  const seen = new Set<string>();
  for (const task of plan.tasks) {
    if (
      task.dueDate < plan.asOfDate ||
      task.dueDate > plan.details.date ||
      task.dependsOn.some(
        (id) => !seen.has(id) || tasks.get(id)!.dueDate > task.dueDate,
      )
    )
      ctx.addIssue({
        code: "custom",
        path: ["tasks"],
        message: "Invalid schedule/dependency order.",
      });
    seen.add(task.id);
  }
});
export type Proposal = z.infer<typeof proposalSchema>;
export type EventPlan = z.infer<typeof planSchema>;
export type Category = (typeof CATEGORIES)[number];
export type PlanTask = z.infer<typeof taskSchema>;
export type PlanVendor = z.infer<typeof vendorSchema>;
