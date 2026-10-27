import type { EventDetails } from "@/types";

export function daysBetween(start: string, end: string): number {
  // UTC midnight encodes calendar ordinals only; host timezone/DST never participates.
  return (
    (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) /
    86_400_000
  );
}
export function planningContext(details: EventDetails, asOfDate: string) {
  const daysRemaining = daysBetween(asOfDate, details.date);
  const perGuestPaise = Math.floor(details.budgetPaise / details.guests);
  const warnings: string[] = [];
  if (daysRemaining <= 7)
    warnings.push(
      daysRemaining === 0
        ? "Same-day event: confirm only immediately available essentials. A full service or booking may not be feasible."
        : "Short notice: confirm space, food and responsibilities first. Supplier availability must be checked.",
    );
  if (details.budgetPaise === 0)
    warnings.push(
      "No spending budget: use existing resources, volunteer help or in-kind contributions. Do not assume services are free or available.",
    );
  else if (perGuestPaise < 50_000)
    warnings.push(
      "Limited funds per guest: consider a simpler format, fewer paid services or a smaller guest list. This is a planning heuristic, not a local price assessment.",
    );
  if (details.guests >= 200)
    warnings.push(
      "Large gathering: verify capacity, accessibility, sanitation, crowd flow and any local permission requirements.",
    );
  return {
    daysRemaining,
    perGuestPaise,
    perGuestRemainderPaise: details.budgetPaise % details.guests,
    urgency:
      daysRemaining === 0
        ? "same-day"
        : daysRemaining <= 7
          ? "urgent"
          : daysRemaining <= 30
            ? "soon"
            : "advance",
    warnings,
  };
}
