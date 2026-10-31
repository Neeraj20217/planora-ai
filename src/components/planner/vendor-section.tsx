"use client";

import { CATEGORY_LABELS, type EventPlan, type PlanVendor } from "@/lib/schemas/plan";

export interface VendorSectionProps {
  vendors: EventPlan["vendors"];
  onUpdateVendor: (
    category: PlanVendor["category"],
    status: PlanVendor["status"],
  ) => void;
}

export function VendorSection({
  vendors,
  onUpdateVendor,
}: VendorSectionProps) {
  return (
    <section id="vendors" className="plan-section">
      <p className="section-kicker">04 / Your supporting cast</p>
      <h2>People & services to arrange</h2>
      <p>
        Essential refers to the arrangement, not a requirement to hire.
        Self-provided space, DIY and volunteer help may be suitable. No
        businesses, prices or availability have been verified.
      </p>
      <div className="vendor-list">
        {vendors.map((vendor) => (
          <div className="vendor-row" key={vendor.category} data-status={vendor.status}>
            <div>
              <h3>
                {CATEGORY_LABELS[vendor.category]}{" "}
                <span
                  className={`vendor-kind ${
                    vendor.essential ? "vendor-essential" : "vendor-optional"
                  }`}
                >
                  {vendor.essential ? "Essential" : "Optional"}
                </span>
              </h3>
              <p>{vendor.rationale}</p>
            </div>
            <div>
              <span className={`vendor-status status-${vendor.status}`}>
                {vendor.status === "booked"
                  ? "Booked / arranged"
                  : vendor.status === "not-started"
                    ? "Not started"
                    : vendor.status === "not-needed"
                      ? "Not needed"
                      : vendor.status === "shortlisted"
                        ? "Shortlisted"
                        : "Contacted"}
              </span>
              <label htmlFor={`vendor-${vendor.category}`}>
                Selection status for {CATEGORY_LABELS[vendor.category]}
              </label>
              <select
                id={`vendor-${vendor.category}`}
                value={vendor.status}
                onChange={(event) =>
                  onUpdateVendor(
                    vendor.category,
                    event.target.value as PlanVendor["status"],
                  )
                }
              >
                <option value="not-started">Not started</option>
                <option value="shortlisted">Shortlisted</option>
                <option value="contacted">Contacted</option>
                <option value="booked">Booked / arranged</option>
                <option value="not-needed">Not needed</option>
              </select>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

