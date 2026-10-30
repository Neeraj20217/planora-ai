"use client";

import Link from "next/link";
import {
  CalendarHeart,
  Plus,
  ArrowRight,
  Calendar,
  MapPin,
  Users,
  IndianRupee,
  CheckCircle2,
} from "lucide-react";
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
        <ul className="saved-events" aria-label="Saved events list">
          {plans.map((plan) => {
            const totalTasks = plan.tasks.length;
            const completedTasks = plan.tasks.filter((task) => task.completed).length;
            const progressPercent =
              totalTasks > 0
                ? Math.round((completedTasks / totalTasks) * 100)
                : 0;

            return (
              <li key={plan.id} className="saved-event-card">
                <div className="saved-event-body">
                  <div className="saved-event-top">
                    <span
                      className={`event-type-badge event-badge-${plan.details.eventType}`}
                    >
                      {EVENT_TYPE_LABELS[plan.details.eventType]}
                    </span>
                    <span className="saved-event-date">
                      <Calendar aria-hidden="true" size={13} />
                      {formatEventDate(plan.details.date)}
                    </span>
                  </div>

                  <h3 className="saved-event-title">
                    <Link href={`/events/${plan.id}`}>{plan.details.name}</Link>
                  </h3>

                  <div className="saved-event-details">
                    <span className="detail-item">
                      <MapPin aria-hidden="true" size={14} />
                      {plan.details.location}
                    </span>
                    <span className="detail-item">
                      <Users aria-hidden="true" size={14} />
                      {plan.details.guests.toLocaleString("en-IN")} guests
                    </span>
                    <span className="detail-item">
                      <IndianRupee aria-hidden="true" size={14} />
                      {formatINR(plan.details.budgetPaise)}
                    </span>
                  </div>

                  <div
                    className="saved-event-progress"
                    aria-label={`Task progress: ${completedTasks} of ${totalTasks} tasks complete (${progressPercent}%)`}
                  >
                    <div className="progress-info">
                      <span className="progress-label">
                        <CheckCircle2 aria-hidden="true" size={13} />
                        Preparation progress
                      </span>
                      <span className="progress-stat">
                        {completedTasks} / {totalTasks} tasks ({progressPercent}%)
                      </span>
                    </div>
                    <div className="progress-track" aria-hidden="true">
                      <div
                        className="progress-fill"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="saved-event-action">
                  <Link
                    href={`/events/${plan.id}`}
                    className="button button-secondary"
                    aria-label={`Open ${plan.details.name}`}
                  >
                    Open plan <ArrowRight aria-hidden="true" size={15} />
                  </Link>
                </div>
              </li>
            );
          })}
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
