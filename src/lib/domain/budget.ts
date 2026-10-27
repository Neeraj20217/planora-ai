import type { EventDetails } from "@/types";
import type { Category, Proposal } from "@/lib/schemas/plan";

const defaults: Record<
  EventDetails["eventType"],
  Partial<Record<Category, number>>
> = {
  wedding: {
    venue: 20,
    catering: 40,
    decoration: 10,
    photography: 10,
    logistics: 10,
    transport: 10,
  },
  birthday: {
    venue: 15,
    catering: 45,
    decoration: 10,
    entertainment: 15,
    logistics: 15,
  },
  community: {
    venue: 20,
    catering: 35,
    equipment: 15,
    logistics: 20,
    transport: 10,
  },
};

export function allocateBudget(
  details: EventDetails,
  priorities: Proposal["priorities"],
) {
  const total = BigInt(details.budgetPaise);
  const reserve = total / 10n;
  const spendable = total - reserve;
  const weights = new Map<Category, { weight: number; rationale: string }>();
  for (const [category, weight] of Object.entries(defaults[details.eventType]))
    weights.set(category as Category, {
      weight,
      rationale:
        "Starting allocation for this event type; adjust scope and obtain actual quotes before spending.",
    });
  for (const item of priorities) weights.set(item.category, item);
  if (![...weights.values()].some((item) => item.weight > 0)) {
    for (const [category, weight] of Object.entries(
      defaults[details.eventType],
    ))
      weights.set(category as Category, {
        weight,
        rationale:
          "Event-template weights used because no positive AI priority was provided.",
      });
  }
  const items = [...weights.entries()]
    .filter(([, item]) => item.weight > 0)
    .sort(([a], [b]) => a.localeCompare(b));
  const denominator = items.reduce(
    (sum, [, item]) => sum + BigInt(item.weight),
    0n,
  );
  const allocations = items.map(([category, item]) => ({
    category,
    rationale: item.rationale,
    units: (spendable * BigInt(item.weight)) / denominator,
    remainder: (spendable * BigInt(item.weight)) % denominator,
  }));
  let leftover =
    spendable - allocations.reduce((sum, item) => sum + item.units, 0n);
  const ranked = [...allocations].sort((a, b) =>
    a.remainder === b.remainder
      ? a.category.localeCompare(b.category)
      : a.remainder > b.remainder
        ? -1
        : 1,
  );
  for (const item of ranked) {
    if (leftover === 0n) break;
    item.units++;
    leftover--;
  }
  return [
    ...allocations.map(({ category, rationale, units }) => ({
      category,
      rationale,
      allocationPaise: Number(units),
    })),
    {
      category: "contingency" as const,
      allocationPaise: Number(reserve),
      rationale:
        "10% reserve (rounded down to the nearest paise). Planning allowance, not an expense or vendor quote.",
    },
  ];
}
