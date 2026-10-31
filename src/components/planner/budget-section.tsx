import { CATEGORY_LABELS, type EventPlan } from "@/lib/schemas/plan";
import { formatINR } from "@/lib/domain/money";

export interface BudgetSectionProps {
  categories: EventPlan["categories"];
  totalBudgetPaise: number;
  perGuestPaise: number;
}

export function BudgetSection({
  categories,
  totalBudgetPaise,
  perGuestPaise,
}: BudgetSectionProps) {
  return (
    <section id="budget" className="plan-section">
      <p className="section-kicker">02 / Every rupee, considered</p>
      <h2>A budget with breathing room</h2>
      <p className="allocation-notice">Planned allocation · Actual spending is not tracked</p>
      <p>
        Estimated allocations, not vendor quotes. Includes a 10% contingency
        reserve, rounded down to a paise. About{" "}
        {formatINR(perGuestPaise)} per guest before contingency.
      </p>
      <div className="budget-lines" role="list">
        {categories.map((category) => (
          <div
            className={`budget-line${category.category === "contingency" ? " budget-reserve" : ""}`}
            role="listitem"
            key={category.category}
          >
            <div>
              <h3>{CATEGORY_LABELS[category.category]}</h3>
              {category.category === "contingency" ? (
                <span className="reserve-label">10% contingency target · rounded down</span>
              ) : null}
              <p>{category.rationale}</p>
            </div>
            <div className="allocation-value">
              <strong>{formatINR(category.allocationPaise)}</strong>
              <span>
                {(totalBudgetPaise === 0
                  ? 0
                  : (category.allocationPaise / totalBudgetPaise) * 100
                ).toFixed(2)}
                %
              </span>
            </div>
            <div className="allocation-track" aria-hidden="true">
              <span
                style={{
                  width: `${
                    totalBudgetPaise === 0
                      ? 0
                      : (category.allocationPaise / totalBudgetPaise) * 100
                  }%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="budget-total">
        Total allocated{" "}
        <strong>
          {formatINR(
            categories.reduce(
              (sum, category) => sum + category.allocationPaise,
              0,
            ),
          )}
        </strong>
      </p>
    </section>
  );
}

