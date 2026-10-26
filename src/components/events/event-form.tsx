"use client";

import { useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleCheck,
  Heart,
  CakeSlice,
  Users,
  Pencil,
} from "lucide-react";
import { Field } from "@/components/ui/field";
import {
  createEventFormSchema,
  EMPTY_EVENT_FORM,
  EVENT_TYPES,
  EVENT_TYPE_LABELS,
} from "@/lib/schemas/event";
import { formatEventDate, todayInIndia } from "@/lib/domain/date";
import { formatINR } from "@/lib/domain/money";
import type { EventDetails, EventFormValues } from "@/types";

const subscribeToHydration = () => () => {};
const clientHydrated = () => true;
const serverHydrated = () => false;

const typeDescriptions = {
  wedding: "A day to remember",
  birthday: "Another year, celebrated",
  community: "Better, together",
};
const typeIcons = { wedding: Heart, birthday: CakeSlice, community: Users };
type Errors = Partial<Record<keyof EventFormValues, string>>;
const labels: Record<keyof EventFormValues, string> = {
  eventType: "Event type",
  name: "Event name",
  date: "Event date",
  location: "Location",
  guests: "Number of guests",
  budget: "Total budget",
  theme: "Theme",
  preferences: "Personal preferences",
  specialRequirements: "Special requirements",
};

export function EventForm({ initialToday }: { initialToday: string }) {
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    clientHydrated,
    serverHydrated,
  );
  const [values, setValues] = useState<EventFormValues>({
    ...EMPTY_EVENT_FORM,
  });
  const [errors, setErrors] = useState<Errors>({});
  const [reviewed, setReviewed] = useState<EventDetails | null>(null);
  const [minimumDate, setMinimumDate] = useState(initialToday);
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  const formHeading = useRef<HTMLHeadingElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function update(key: keyof EventFormValues, value: string) {
    setValues((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => ({ ...previous, [key]: undefined }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const currentToday = todayInIndia();
    setMinimumDate(currentToday);
    const result = createEventFormSchema(currentToday).safeParse(values);
    if (!result.success) {
      const nextErrors: Errors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof EventFormValues;
        if (!nextErrors[key]) nextErrors[key] = issue.message;
      }
      setErrors(nextErrors);
      const firstKey = Object.keys(nextErrors)[0];
      const firstControl = formRef.current?.elements.namedItem(firstKey);
      if (firstControl instanceof HTMLElement) firstControl.focus();
      return;
    }
    setErrors({});
    setReviewed(result.data);
    requestAnimationFrame(() => reviewHeading.current?.focus());
  }

  function editBrief() {
    setReviewed(null);
    requestAnimationFrame(() => formHeading.current?.focus());
  }

  const describedBy = (key: keyof EventFormValues, hasHint = false) =>
    [hasHint ? `${key}-hint` : "", errors[key] ? `${key}-error` : ""]
      .filter(Boolean)
      .join(" ") || undefined;
  const errorEntries = Object.entries(errors).filter(([, message]) => message);

  return (
    <div className="page-wrap">
      <Link href="/" className="back-link">
        <ArrowLeft aria-hidden="true" size={16} /> My events
      </Link>
      <div className="form-layout">
        <div className="form-main">
          {reviewed ? (
            <section className="review-section" aria-labelledby="review-title">
              <CircleCheck
                aria-hidden="true"
                className="review-check"
                size={36}
                strokeWidth={1.5}
              />
              <h1 id="review-title" ref={reviewHeading} tabIndex={-1}>
                A lovely place to start.
              </h1>
              <p className="intro">
                Review your event details. You can go back and make them yours.
              </p>
              <h2 className="review-name">{reviewed.name}</h2>
              <dl className="review-details">
                <div>
                  <dt>Celebration</dt>
                  <dd>{EVENT_TYPE_LABELS[reviewed.eventType]}</dd>
                </div>
                <div>
                  <dt>Date</dt>
                  <dd>{formatEventDate(reviewed.date)}</dd>
                </div>
                <div>
                  <dt>Location</dt>
                  <dd>{reviewed.location}</dd>
                </div>
                <div>
                  <dt>Guests</dt>
                  <dd>{reviewed.guests.toLocaleString("en-IN")}</dd>
                </div>
                <div>
                  <dt>Total budget</dt>
                  <dd>{formatINR(reviewed.budgetPaise)}</dd>
                </div>
                <div>
                  <dt>Theme</dt>
                  <dd>{reviewed.theme || "Open to ideas"}</dd>
                </div>
                <div className="wide">
                  <dt>Personal preferences</dt>
                  <dd>{reviewed.preferences || "None added"}</dd>
                </div>
                <div className="wide">
                  <dt>Special requirements</dt>
                  <dd>{reviewed.specialRequirements || "None added"}</dd>
                </div>
              </dl>
              <p className="scope-note" role="status">
                Your brief has been checked. It stays on this page only and
                isn’t saved or sent anywhere. AI planning and saving aren’t
                available yet.
              </p>
              <button
                type="button"
                className="button button-primary"
                onClick={editBrief}
              >
                <Pencil aria-hidden="true" size={17} /> Edit event details
              </button>
            </section>
          ) : (
            <>
              <h1 ref={formHeading} tabIndex={-1}>
                Let’s make it an occasion.
              </h1>
              <p className="intro">
                Tell us what you have in mind. A few thoughtful details are all
                you need to begin.
              </p>
              <noscript>
                <p className="scope-note">
                  Enable JavaScript to enter and review your event details. The
                  form stays disabled so your details cannot be submitted to a
                  URL.
                </p>
              </noscript>
              <form ref={formRef} onSubmit={submit} noValidate>
                <fieldset disabled={!hydrated}>
                  <legend className="sr-only">Event details</legend>
                  <p className="required-note">
                    All fields are required unless marked optional.
                  </p>
                  {errorEntries.length > 0 ? (
                    <div className="error-summary" role="alert">
                      <h2>Let’s check a few details</h2>
                      <ul>
                        {errorEntries.map(([key, message]) => (
                          <li key={key}>
                            <a href={`#${key}`}>
                              {labels[key as keyof EventFormValues]}: {message}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <fieldset className="event-type-group">
                    <legend>What are we celebrating?</legend>
                    <div className="event-types">
                      {EVENT_TYPES.map((type) => {
                        const Icon = typeIcons[type];
                        return (
                          <label className="event-type" key={type}>
                            <input
                              type="radio"
                              name="eventType"
                              value={type}
                              checked={values.eventType === type}
                              onChange={() => update("eventType", type)}
                              required
                            />
                            <span className="event-type-content">
                              <span className="type-top">
                                <Icon
                                  aria-hidden="true"
                                  size={24}
                                  strokeWidth={1.5}
                                />
                                <span className="selected-mark">
                                  <Check aria-hidden="true" size={14} />
                                </span>
                              </span>
                              <span className="type-name">
                                {EVENT_TYPE_LABELS[type]}
                              </span>
                              <span className="type-description">
                                {typeDescriptions[type]}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                  <fieldset className="form-section">
                    <legend>The essentials</legend>
                    <div className="form-fields">
                      <Field id="name" label="Event name" error={errors.name}>
                        <input
                          id="name"
                          name="name"
                          value={values.name}
                          onChange={(e) => update("name", e.target.value)}
                          placeholder="e.g. Ananya’s birthday"
                          maxLength={120}
                          required
                          autoComplete="off"
                          aria-invalid={Boolean(errors.name)}
                          aria-describedby={describedBy("name")}
                        />
                      </Field>
                      <div className="grid gap-5 sm:grid-cols-2">
                        <Field
                          id="date"
                          label="Event date"
                          hint="Today or later, in India time."
                          error={errors.date}
                        >
                          <input
                            id="date"
                            name="date"
                            type="date"
                            min={minimumDate}
                            value={values.date}
                            onChange={(e) => update("date", e.target.value)}
                            required
                            aria-invalid={Boolean(errors.date)}
                            aria-describedby={describedBy("date", true)}
                          />
                        </Field>
                        <Field
                          id="location"
                          label="Location"
                          hint="A city or neighbourhood is enough."
                          error={errors.location}
                        >
                          <input
                            id="location"
                            name="location"
                            value={values.location}
                            onChange={(e) => update("location", e.target.value)}
                            placeholder="e.g. Hyderabad"
                            maxLength={200}
                            required
                            autoComplete="off"
                            aria-invalid={Boolean(errors.location)}
                            aria-describedby={describedBy("location", true)}
                          />
                        </Field>
                      </div>
                      <div className="grid gap-5 sm:grid-cols-2">
                        <Field
                          id="guests"
                          label="Number of guests"
                          hint="An estimate is fine. Up to 10,000."
                          error={errors.guests}
                        >
                          <input
                            id="guests"
                            name="guests"
                            type="number"
                            min={1}
                            max={10_000}
                            step={1}
                            inputMode="numeric"
                            value={values.guests}
                            onChange={(e) => update("guests", e.target.value)}
                            placeholder="e.g. 50"
                            required
                            aria-invalid={Boolean(errors.guests)}
                            aria-describedby={describedBy("guests", true)}
                          />
                        </Field>
                        <Field
                          id="budget"
                          label="Total budget (INR)"
                          hint="Enter rupees, without commas. Zero is okay."
                          error={errors.budget}
                        >
                          <input
                            id="budget"
                            name="budget"
                            type="text"
                            inputMode="decimal"
                            maxLength={12}
                            value={values.budget}
                            onChange={(e) => update("budget", e.target.value)}
                            placeholder="e.g. 30000"
                            required
                            aria-invalid={Boolean(errors.budget)}
                            aria-describedby={describedBy("budget", true)}
                          />
                        </Field>
                      </div>
                    </div>
                  </fieldset>
                  <fieldset className="form-section">
                    <legend>Make it personal</legend>
                    <p className="section-description">
                      The little things that make this celebration feel like
                      you.
                    </p>
                    <div className="form-fields">
                      <Field
                        id="theme"
                        label="Theme"
                        optional
                        error={errors.theme}
                      >
                        <input
                          id="theme"
                          name="theme"
                          value={values.theme}
                          onChange={(e) => update("theme", e.target.value)}
                          placeholder="e.g. A relaxed garden gathering"
                          maxLength={120}
                          aria-invalid={Boolean(errors.theme)}
                          aria-describedby={describedBy("theme")}
                        />
                      </Field>
                      <Field
                        id="preferences"
                        label="Personal preferences"
                        optional
                        error={errors.preferences}
                      >
                        <textarea
                          id="preferences"
                          name="preferences"
                          rows={3}
                          value={values.preferences}
                          onChange={(e) =>
                            update("preferences", e.target.value)
                          }
                          placeholder="Favourite food, activities, colours, or traditions…"
                          maxLength={2000}
                          aria-invalid={Boolean(errors.preferences)}
                          aria-describedby={describedBy("preferences")}
                        />
                      </Field>
                      <Field
                        id="specialRequirements"
                        label="Special requirements"
                        optional
                        hint="Dietary needs, step-free access, quiet spaces, or anything else to consider. Please leave out sensitive personal information."
                        error={errors.specialRequirements}
                      >
                        <textarea
                          id="specialRequirements"
                          name="specialRequirements"
                          rows={3}
                          value={values.specialRequirements}
                          onChange={(e) =>
                            update("specialRequirements", e.target.value)
                          }
                          placeholder="What would help everyone feel welcome?"
                          maxLength={2000}
                          aria-invalid={Boolean(errors.specialRequirements)}
                          aria-describedby={describedBy(
                            "specialRequirements",
                            true,
                          )}
                        />
                      </Field>
                    </div>
                  </fieldset>
                  <div className="form-actions">
                    <p>
                      This brief stays on this page only. Nothing is saved or
                      sent.
                    </p>
                    <button className="button button-primary" type="submit">
                      Review event details{" "}
                      <ArrowRight aria-hidden="true" size={18} />
                    </button>
                  </div>
                </fieldset>
              </form>
            </>
          )}
        </div>
        <aside className="form-aside" aria-label="A little planning guidance">
          <div className="aside-flower">
            <Heart aria-hidden="true" size={30} strokeWidth={1.25} />
          </div>
          <h2>
            Start with what
            <br />
            matters to you.
          </h2>
          <p>
            You don’t need every answer yet. Begin with the people, place, and
            budget. The rest can take shape from there.
          </p>
          <div className="aside-divider" />
          <h3>A thoughtful starting point</h3>
          <ul className="guidance-list">
            <li>
              <Check aria-hidden="true" size={16} /> Give your event a name
              you’ll recognise.
            </li>
            <li>
              <Check aria-hidden="true" size={16} /> Include everyone in your
              guest estimate.
            </li>
            <li>
              <Check aria-hidden="true" size={16} /> Set a budget that feels
              comfortable.
            </li>
          </ul>
          <Link href="/guide" className="text-link">
            Read the planning guide <ArrowRight aria-hidden="true" size={15} />
          </Link>
        </aside>
      </div>
    </div>
  );
}
