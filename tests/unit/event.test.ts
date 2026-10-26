import { describe, expect, it } from "vitest";
import {
  createEventFormSchema,
  eventBriefSchema,
  eventDetailsSchema,
  EMPTY_EVENT_FORM,
  EVENT_TYPES,
} from "@/lib/schemas/event";
import { isCalendarDate, todayInIndia } from "@/lib/domain/date";
import { rupeesToPaise } from "@/lib/domain/money";

const schema = createEventFormSchema("2026-10-26");
const valid = {
  ...EMPTY_EVENT_FORM,
  name: "  Our celebration  ",
  date: "2026-11-01",
  location: " Hyderabad ",
  guests: "50",
  budget: "30000.29",
};

describe("event form contract", () => {
  it.each(EVENT_TYPES)(
    "accepts %s and normalizes the canonical brief",
    (eventType) => {
      const output = schema.parse({ ...valid, eventType });
      expect(output).toMatchObject({
        name: "Our celebration",
        location: "Hyderabad",
        guests: 50,
        budgetPaise: 3_000_029,
        currency: "INR",
        timezone: "Asia/Kolkata",
        eventType,
      });
      expect(output).not.toHaveProperty("budget");
      expect(eventDetailsSchema.safeParse(output).success).toBe(true);
    },
  );
  it.each(["", "   "])("rejects a blank required name (%j)", (name) =>
    expect(schema.safeParse({ ...valid, name }).success).toBe(false),
  );
  it("rejects missing location", () =>
    expect(schema.safeParse({ ...valid, location: "" }).success).toBe(false));
  it.each(["0", "-1", "1.5", "NaN", "10001", "1e2", ""])(
    "rejects invalid guest input %j",
    (guests) =>
      expect(schema.safeParse({ ...valid, guests }).success).toBe(false),
  );
  it.each(["1", "10000"])("accepts guest boundary %s", (guests) =>
    expect(schema.safeParse({ ...valid, guests }).success).toBe(true),
  );
  it.each(["2026-10-25", "2026-02-30", "2026-13-01", "", "tomorrow"])(
    "rejects past or impossible date %j",
    (date) => expect(schema.safeParse({ ...valid, date }).success).toBe(false),
  );
  it("accepts same-day events", () =>
    expect(schema.safeParse({ ...valid, date: "2026-10-26" }).success).toBe(
      true,
    ));
  it("enforces optional text limits", () => {
    expect(schema.safeParse({ ...valid, theme: "x".repeat(121) }).success).toBe(
      false,
    );
    expect(
      schema.safeParse({ ...valid, preferences: "x".repeat(2001) }).success,
    ).toBe(false);
    expect(
      schema.safeParse({ ...valid, specialRequirements: "x".repeat(2001) })
        .success,
    ).toBe(false);
  });
  it("rejects unsupported types and extra properties", () => {
    expect(
      schema.safeParse({ ...valid, eventType: "conference" }).success,
    ).toBe(false);
    expect(schema.safeParse({ ...valid, unexpected: "value" }).success).toBe(
      false,
    );
  });
  it("allows an explicitly zero budget", () =>
    expect(schema.parse({ ...valid, budget: "0" }).budgetPaise).toBe(0));
});

describe("money input", () => {
  it.each([
    ["0", 0],
    ["0.01", 1],
    ["0.29", 29],
    ["1.1", 110],
    ["30000.99", 3_000_099],
    ["100000000", 10_000_000_000],
  ])("converts %s exactly to %i paise", (input, expected) =>
    expect(rupeesToPaise(input as string)).toBe(expected),
  );
  it.each([
    "",
    "-1",
    "NaN",
    "Infinity",
    "1e4",
    "1,000",
    "1.001",
    "100000000.01",
    "999999999999999999",
    ".5",
  ])("rejects ambiguous/unsafe money %j", (value) =>
    expect(rupeesToPaise(value)).toBeNull(),
  );
});

describe("calendar dates", () => {
  it("handles leap days without rolling invalid dates forward", () => {
    expect(isCalendarDate("2028-02-29")).toBe(true);
    expect(isCalendarDate("2027-02-29")).toBe(false);
    expect(isCalendarDate("0000-01-01")).toBe(false);
  });
  it("uses the Indian calendar date around UTC midnight boundaries", () => {
    expect(todayInIndia(new Date("2026-10-25T18:29:59Z"))).toBe("2026-10-25");
    expect(todayInIndia(new Date("2026-10-25T18:30:00Z"))).toBe("2026-10-26");
  });
});

describe("future persistence contract", () => {
  const brief = {
    schemaVersion: 1,
    id: "a31b3123-95aa-4b8c-8704-7efcfd55b713",
    revision: 1,
    details: schema.parse(valid),
  };
  it("round-trips a versioned brief", () =>
    expect(eventBriefSchema.parse(JSON.parse(JSON.stringify(brief)))).toEqual(
      brief,
    ));
  it("rejects unknown versions and noninteger stored money", () => {
    expect(
      eventBriefSchema.safeParse({ ...brief, schemaVersion: 2 }).success,
    ).toBe(false);
    expect(
      eventBriefSchema.safeParse({
        ...brief,
        details: { ...brief.details, budgetPaise: 0.5 },
      }).success,
    ).toBe(false);
  });
});
