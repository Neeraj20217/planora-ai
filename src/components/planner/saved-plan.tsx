"use client";

import Link from "next/link";
import { useSavedPlans } from "@/lib/storage/use-saved-plans";
import { PlanDashboard } from "./plan-dashboard";

export function SavedPlan({ id }: { id: string }) {
  const { ready, plans, error, warnings } = useSavedPlans();
  if (!ready)
    return (
      <div className="page-wrap">
        <p role="status">Opening your saved plan…</p>
      </div>
    );
  const plan = plans.find((item) => item.id === id);
  if (!plan)
    return (
      <div className="page-wrap">
        <h1>This plan couldn’t be opened.</h1>
        <p role="alert">
          {error ||
            warnings[0] ||
            "It may be saved in another browser or site address, or it has not been saved yet. No records were changed."}
        </p>
        <Link href="/" className="button button-primary">
          Back to my events
        </Link>
      </div>
    );
  return <PlanDashboard initialPlan={plan} savedRevision={plan.revision} />;
}
