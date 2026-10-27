import type { EventDetails } from "@/types";
import type { PlanTask, Proposal } from "@/lib/schemas/plan";
import { daysBetween } from "./context";

export function buildTimeline(
  details: EventDetails,
  asOfDate: string,
  suggestions: Proposal["tasks"],
) {
  const days = daysBetween(asOfDate, details.date);
  if (!Number.isInteger(days) || days < 0)
    throw new Error("Invalid planning interval");
  const lead =
    details.eventType === "wedding"
      ? 60
      : details.eventType === "community"
        ? 30
        : 7;
  const seeds = [
    {
      key: "brief",
      title: "Confirm priorities, budget and who is responsible",
      leadDays: days,
      priority: "high" as const,
      dependsOn: [] as string[],
    },
    {
      key: "requirements",
      title: "Check dietary needs, step-free access and special requirements",
      leadDays: days,
      priority: "high" as const,
      dependsOn: ["brief"],
    },
    {
      key: "space",
      title: "Confirm a suitable space and check capacity and availability",
      leadDays: lead,
      priority: "high" as const,
      dependsOn: ["brief"],
    },
    {
      key: "food",
      title: "Confirm food, water and refreshments within the spending limit",
      leadDays: Math.floor(lead / 2),
      priority: "high" as const,
      dependsOn: ["space", "requirements"],
    },
    {
      key: "invite",
      title: "Invite guests and confirm attendance",
      leadDays: lead,
      priority: "normal" as const,
      dependsOn: ["space"],
    },
    {
      key: "reconfirm",
      title: "Reconfirm helpers, suppliers and essential arrangements",
      leadDays: 1,
      priority: "high" as const,
      dependsOn: ["food", "invite"],
    },
    {
      key: "setup",
      title: "Set up, check accessibility and welcome guests",
      leadDays: 0,
      priority: "high" as const,
      dependsOn: ["reconfirm"],
    },
  ];
  const map = new Map(
    [
      ...seeds.map((task) => ({
        ...task,
        key: `core-${task.key}`,
        dependsOn: task.dependsOn.map((dep) => `core-${dep}`),
      })),
      ...suggestions.map((task) => ({
        ...task,
        key: `ai-${task.key}`,
        dependsOn: task.dependsOn.map((dep) => `ai-${dep}`),
      })),
    ].map((task) => [task.key, task]),
  );
  const tasks: PlanTask[] = [];
  const visiting = new Set<string>();
  const completed = new Map<string, PlanTask>();
  let compressed = false;
  function visit(id: string) {
    if (completed.has(id)) return;
    const task = map.get(id);
    if (!task || visiting.has(id)) throw new Error("Invalid dependency graph");
    visiting.add(id);
    task.dependsOn.forEach(visit);
    if (task.leadDays > days) compressed = true;
    const due = new Date(`${details.date}T00:00:00Z`);
    due.setUTCDate(due.getUTCDate() - Math.min(days, task.leadDays));
    let dueDate = due.toISOString().slice(0, 10);
    for (const dep of task.dependsOn) {
      const prerequisite = completed.get(dep)!;
      if (prerequisite.dueDate > dueDate) {
        dueDate = prerequisite.dueDate;
        compressed = true;
      }
    }
    const result: PlanTask = {
      id,
      title: task.title,
      dueDate,
      dependsOn: task.dependsOn,
      priority: days <= 7 ? "high" : task.priority,
      completed: false,
    };
    tasks.push(result);
    completed.set(id, result);
    visiting.delete(id);
  }
  map.forEach((_, id) => visit(id));
  return {
    tasks,
    warnings:
      compressed || days <= 7
        ? [
            "Some tasks share dates or have shortened lead times. Follow dependency order; compression does not guarantee bookings or feasibility. Reduce scope if essential arrangements cannot be confirmed.",
          ]
        : [],
  };
}
