import { z } from "zod";
import { isCalendarDate, todayInIndia } from "@/lib/domain/date";
import { MAX_BUDGET_PAISE, rupeesToPaise } from "@/lib/domain/money";

export const EVENT_TYPES = ["wedding", "birthday", "community"] as const;
export const EVENT_TYPE_LABELS = {
  wedding: "Wedding",
  birthday: "Birthday",
  community: "Community event",
} satisfies Record<(typeof EVENT_TYPES)[number], string>;

const calendarDateSchema = z
  .string()
  .refine(isCalendarDate, "Enter a real calendar date.");
const shortText = (max: number, label: string) =>
  z.string().trim().max(max, `${label} must be ${max} characters or fewer.`);
const requiredText = (max: number, label: string) =>
  shortText(max, label).min(1, `Enter ${label.toLowerCase()}.`);

/** Canonical domain contract: money is integer paise; no implicit numeric coercion. */
export const eventDetailsSchema = z
  .object({
    eventType: z.enum(EVENT_TYPES, { error: "Choose an event type." }),
    name: requiredText(120, "Event name"),
    date: calendarDateSchema,
    location: requiredText(200, "Location"),
    guests: z.number().int().min(1).max(10_000),
    budgetPaise: z.number().int().min(0).max(MAX_BUDGET_PAISE),
    currency: z.literal("INR"),
    timezone: z.literal("Asia/Kolkata"),
    theme: shortText(120, "Theme"),
    preferences: shortText(2_000, "Preferences"),
    specialRequirements: shortText(2_000, "Special requirements"),
  })
  .strict();

/** Versioned contract for future persistence; Phase 1 does not write browser storage. */
export const eventBriefSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.uuid(),
    revision: z.number().int().min(1),
    details: eventDetailsSchema,
  })
  .strict();

export function createEventFormSchema(asOfDate = todayInIndia()) {
  return z
    .object({
      eventType: z.enum(EVENT_TYPES, { error: "Choose an event type." }),
      name: requiredText(120, "Event name"),
      date: calendarDateSchema.refine(
        (value) => !isCalendarDate(value) || value >= asOfDate,
        "Choose today or a future date (India time).",
      ),
      location: requiredText(200, "Location"),
      guests: z
        .string()
        .trim()
        .regex(/^\d{1,5}$/, "Enter a whole number of guests from 1 to 10,000.")
        .transform(Number)
        .pipe(
          z
            .number()
            .int()
            .min(1, "Invite at least 1 guest.")
            .max(10_000, "Enter 10,000 guests or fewer."),
        ),
      budget: z
        .string()
        .trim()
        .refine(
          (value) => rupeesToPaise(value) !== null,
          "Enter an INR amount from 0 to 10,00,00,000, with up to 2 decimal places.",
        ),
      theme: shortText(120, "Theme"),
      preferences: shortText(2_000, "Preferences"),
      specialRequirements: shortText(2_000, "Special requirements"),
    })
    .strict()
    .transform(({ budget, ...details }) => ({
      ...details,
      budgetPaise: rupeesToPaise(budget)!,
      currency: "INR" as const,
      timezone: "Asia/Kolkata" as const,
    }))
    .pipe(eventDetailsSchema);
}

export type EventFormValues = z.input<ReturnType<typeof createEventFormSchema>>;
export type EventDetails = z.infer<typeof eventDetailsSchema>;
export type EventBrief = z.infer<typeof eventBriefSchema>;
export type EventType = EventDetails["eventType"];

export const EMPTY_EVENT_FORM: EventFormValues = {
  eventType: "birthday",
  name: "",
  date: "",
  location: "",
  guests: "",
  budget: "",
  theme: "",
  preferences: "",
  specialRequirements: "",
};
