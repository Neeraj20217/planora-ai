import { planSchema, type EventPlan } from "@/lib/schemas/plan";

export const PLAN_PREFIX = "planora:plan:v1:";
export const STORAGE_EVENT = "planora:plans-changed";
export type PlanStorage = Pick<
  Storage,
  "getItem" | "setItem" | "key" | "length"
>;
export class StorageError extends Error {}
const MAX_RECORD = 131_072;

function decode(raw: string, storageKey: string) {
  if (raw.length > MAX_RECORD)
    throw new StorageError("Saved data is too large to open safely.");
  const plan = planSchema.parse(JSON.parse(raw));
  if (`${PLAN_PREFIX}${plan.id}` !== storageKey || plan.revision < 1)
    throw new StorageError("Invalid saved record.");
  return plan;
}

export function readPlans(storage: PlanStorage): {
  plans: EventPlan[];
  warnings: string[];
} {
  const plans: EventPlan[] = [];
  let invalid = 0;
  try {
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key?.startsWith(PLAN_PREFIX)) keys.push(key);
    }
    if (keys.length > 50)
      throw new StorageError(
        "This browser contains more saved plans than this version can safely manage.",
      );
    for (const key of keys.sort()) {
      const raw = storage.getItem(key);
      if (raw === null) continue;
      try {
        plans.push(decode(raw, key));
      } catch {
        invalid++;
      }
    }
  } catch (error) {
    throw error instanceof StorageError
      ? error
      : new StorageError(
          "Browser storage is unavailable. Enable storage for this site and retry. Existing records have not been changed.",
        );
  }
  return {
    plans: plans.sort((a, b) => b.generatedAt.localeCompare(a.generatedAt)),
    warnings: invalid
      ? [
          `${invalid} saved record(s) could not be opened. They were left untouched; valid plans are still available.`,
        ]
      : [],
  };
}

export function savePlan(plan: EventPlan, storage: PlanStorage): EventPlan {
  try {
    planSchema.parse(plan);
    const key = `${PLAN_PREFIX}${plan.id}`;
    const raw = storage.getItem(key);
    if (raw !== null) {
      let existing: EventPlan;
      try {
        existing = decode(raw, key);
      } catch {
        throw new StorageError(
          "The existing saved record is unreadable and will not be overwritten.",
        );
      }
      if (plan.revision === 0 || existing.revision !== plan.revision)
        throw new StorageError(
          "Another tab changed this plan. Reopen it before saving; your current changes remain on this page.",
        );
    } else {
      if (plan.revision !== 0)
        throw new StorageError(
          "The saved record is missing. Reopen your events before saving again.",
        );
      let records = 0;
      for (let index = 0; index < storage.length; index++)
        if (storage.key(index)?.startsWith(PLAN_PREFIX)) records++;
      if (records >= 50)
        throw new StorageError(
          "This browser has reached the 50-plan limit. Keep this plan open; it has not been saved.",
        );
    }
    const next = planSchema.parse({ ...plan, revision: plan.revision + 1 });
    const encoded = JSON.stringify(next);
    if (encoded.length > MAX_RECORD)
      throw new StorageError(
        "This plan is too large to save. It remains available on this page.",
      );
    storage.setItem(key, encoded);
    return next;
  } catch (error) {
    throw error instanceof StorageError
      ? error
      : new StorageError(
          "Could not save to browser storage. It may be full or blocked. Your plan remains on this page; nothing was overwritten.",
        );
  }
}
