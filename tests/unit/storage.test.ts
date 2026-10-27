import { beforeEach, describe, expect, it } from "vitest";
import {
  PLAN_PREFIX,
  readPlans,
  savePlan,
  type PlanStorage,
} from "@/lib/storage/plans";
import { fixturePlan } from "../fixtures/planning";

beforeEach(() => localStorage.clear());
describe("versioned browser persistence", () => {
  it("saves and reopens a complete plan without losing paise, tasks or vendor status", () => {
    const original = fixturePlan();
    original.tasks[0].completed = true;
    original.vendors[0].status = "booked";
    const saved = savePlan(original, localStorage);
    expect(saved.revision).toBe(1);
    expect(readPlans(localStorage).plans).toEqual([saved]);
    expect(savePlan(saved, localStorage).revision).toBe(2);
  });
  it("supports multiple independent events", () => {
    savePlan(fixturePlan(), localStorage);
    savePlan(
      fixturePlan(
        { name: "Our wedding", eventType: "wedding" },
        "b31b3123-95aa-4b8c-8704-7efcfd55b713",
      ),
      localStorage,
    );
    expect(readPlans(localStorage).plans).toHaveLength(2);
  });
  it("isolates corruption and unknown versions without deleting them", () => {
    const saved = savePlan(fixturePlan(), localStorage);
    localStorage.setItem(`${PLAN_PREFIX}broken`, "not JSON");
    localStorage.setItem(
      `${PLAN_PREFIX}future`,
      JSON.stringify({ ...saved, schemaVersion: 2 }),
    );
    expect(readPlans(localStorage).plans).toEqual([saved]);
    expect(readPlans(localStorage).warnings).toHaveLength(1);
    expect(localStorage.getItem(`${PLAN_PREFIX}broken`)).toBe("not JSON");
  });
  it("rejects stale multi-tab writes and preserves the newer record", () => {
    const saved = savePlan(fixturePlan(), localStorage);
    const newer = savePlan(saved, localStorage);
    expect(() => savePlan(saved, localStorage)).toThrow(/Another tab/);
    expect(readPlans(localStorage).plans[0]).toEqual(newer);
  });
  it("does not overwrite a corrupted record", () => {
    const plan = fixturePlan();
    localStorage.setItem(`${PLAN_PREFIX}${plan.id}`, "damaged");
    expect(() => savePlan(plan, localStorage)).toThrow(
      /will not be overwritten/,
    );
    expect(localStorage.getItem(`${PLAN_PREFIX}${plan.id}`)).toBe("damaged");
  });
  it("reports denied storage and quota failure safely", () => {
    const denied: PlanStorage = {
      get length(): number {
        throw new Error("blocked");
      },
      key: () => null,
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
    };
    expect(() => readPlans(denied)).toThrow(/storage is unavailable/);
    expect(() =>
      savePlan(fixturePlan(), {
        ...localStorage,
        length: 0,
        key: () => null,
        getItem: () => null,
        setItem: () => {
          throw new Error("QuotaExceededError");
        },
      }),
    ).toThrow(/Could not save/);
  });
  it("does not store an invalid plan", () =>
    expect(() =>
      savePlan({ ...fixturePlan(), schemaVersion: 2 } as never, localStorage),
    ).toThrow());
});
