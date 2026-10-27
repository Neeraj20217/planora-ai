"use client";

import Link from "next/link";
import { CalendarHeart, Plus } from "lucide-react";
import { useSavedPlans } from "@/lib/storage/use-saved-plans";
import { formatEventDate } from "@/lib/domain/date";
import { EVENT_TYPE_LABELS } from "@/lib/schemas/event";
import { formatINR } from "@/lib/domain/money";

export function SavedEvents() {
  const { ready, plans, error, warnings } = useSavedPlans();
  if (!ready) return <p role="status">Opening saved events…</p>;
  return (
    <>
      {error ? (
        <p role="alert" className="error-summary">
          {error}
        </p>
      ) : null}
      {warnings.map((warning) => (
        <p className="error-summary" role="alert" key={warning}>
          {warning}
        </p>
      ))}
      {plans.length ? (
        <ul className="saved-events">
          {plans.map((plan) => (
            <li key={plan.id}>
              <div>
                <h3>
                  <Link href={`/events/${plan.id}`}>{plan.details.name}</Link>
                </h3>
                <p>
                  {EVENT_TYPE_LABELS[plan.details.eventType]} ·{" "}
                  {formatEventDate(plan.details.date)} · {plan.details.location}
                </p>
                <p>
                  {plan.details.guests} guests ·{" "}
                  {formatINR(plan.details.budgetPaise)} ·{" "}
                  {plan.tasks.filter((task) => task.completed).length}/
                  {plan.tasks.length} tasks complete
                </p>
              </div>
              <Link
                href={`/events/${plan.id}`}
                className="button button-secondary"
                aria-label={`Open ${plan.details.name}`}
              >
                Open plan
              </Link>
            </li>
          ))}
        </ul>
      ) : !error ? (
        <div className="empty-events">
          <CalendarHeart aria-hidden="true" size={38} strokeWidth={1.25} />
          <h3>Your next celebration starts here.</h3>
          <p>
            No saved events yet. Create an event, generate a plan, then save it
            in this browser.
          </p>
          <Link href="/events/new" className="button button-secondary">
            <Plus aria-hidden="true" size={17} /> Create an event
          </Link>
        </div>
      ) : null}
      <p className="scope-note">
        Saved on this browser and site only. Keep sensitive guest information
        out of your plans.
      </p>
    </>
  );
}
