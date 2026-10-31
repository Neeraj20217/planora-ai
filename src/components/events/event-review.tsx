"use client";

import type { Ref } from "react";
import { CircleCheck, Pencil } from "lucide-react";
import { GenerationPanel } from "@/components/planner/generation-panel";
import { EVENT_TYPE_LABELS } from "@/lib/schemas/event";
import { formatEventDate } from "@/lib/domain/date";
import { formatINR } from "@/lib/domain/money";
import type { EventDetails } from "@/types";
import type { EventPlan } from "@/lib/schemas/plan";

export interface EventReviewProps {
  details: EventDetails;
  onEdit: () => void;
  onGenerated: (plan: EventPlan) => void;
  headingRef?: Ref<HTMLHeadingElement>;
}

export function EventReview({
  details,
  onEdit,
  onGenerated,
  headingRef,
}: EventReviewProps) {
  return (
    <section className="review-section" aria-labelledby="review-title">
      <CircleCheck
        aria-hidden="true"
        className="review-check"
        size={36}
        strokeWidth={1.5}
      />
      <h1 id="review-title" ref={headingRef} tabIndex={-1}>
        A lovely place to start.
      </h1>
      <p className="intro">
        Review your event details. You can go back and make them yours.
      </p>
      <h2 className="review-name">{details.name}</h2>
      <dl className="review-details">
        <div>
          <dt>Celebration</dt>
          <dd>{EVENT_TYPE_LABELS[details.eventType]}</dd>
        </div>
        <div>
          <dt>Date</dt>
          <dd>{formatEventDate(details.date)}</dd>
        </div>
        <div>
          <dt>Location</dt>
          <dd>{details.location}</dd>
        </div>
        <div>
          <dt>Guests</dt>
          <dd>{details.guests.toLocaleString("en-IN")}</dd>
        </div>
        <div>
          <dt>Total budget</dt>
          <dd>{formatINR(details.budgetPaise)}</dd>
        </div>
        <div>
          <dt>Theme</dt>
          <dd>{details.theme || "Open to ideas"}</dd>
        </div>
        <div className="wide">
          <dt>Personal preferences</dt>
          <dd>{details.preferences || "None added"}</dd>
        </div>
        <div className="wide">
          <dt>Special requirements</dt>
          <dd>{details.specialRequirements || "None added"}</dd>
        </div>
      </dl>
      <p className="scope-note" role="status">
        Your brief has been checked. It isn’t saved or sent anywhere until you
        choose Generate plan. Review the sharing notice below before
        generating. Save the finished plan to keep it in this browser.
      </p>
      <button
        type="button"
        className="button button-primary"
        onClick={onEdit}
      >
        <Pencil aria-hidden="true" size={17} /> Edit event details
      </button>
      <GenerationPanel
        details={details}
        onGenerated={onGenerated}
      />
    </section>
  );
}

