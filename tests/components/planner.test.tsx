import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GenerationPanel } from "@/components/planner/generation-panel";
import { PlanDashboard } from "@/components/planner/plan-dashboard";
import { brief, fixturePlan } from "../fixtures/planning";
import { formatINR } from "@/lib/domain/money";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
beforeEach(() => localStorage.clear());
describe("generation states", () => {
  it("discloses sharing and reports missing configuration while preserving the brief", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        Response.json({ error: { code: "NOT_CONFIGURED" } }, { status: 503 }),
      );
    const onGenerated = vi.fn();
    const user = userEvent.setup();
    render(<GenerationPanel details={brief} onGenerated={onGenerated} />);
    expect(screen.getByText(/sends this brief to Google Gemini/)).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Generate plan" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "not configured",
    );
    expect(onGenerated).not.toHaveBeenCalled();
    expect(fetchMock.mock.calls[0][1]!.body).toBe(JSON.stringify({ brief }));
  });
  it("validates a returned plan before displaying it", async () => {
    const plan = fixturePlan();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ plan }));
    const onGenerated = vi.fn();
    const user = userEvent.setup();
    render(<GenerationPanel details={brief} onGenerated={onGenerated} />);
    await user.click(screen.getByRole("button", { name: "Generate plan" }));
    await waitFor(() => expect(onGenerated).toHaveBeenCalledWith(plan));
  });
  it("rejects malformed or mismatched plan responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ plan: fixturePlan({ guests: 10 }) }),
    );
    const onGenerated = vi.fn();
    const user = userEvent.setup();
    render(<GenerationPanel details={brief} onGenerated={onGenerated} />);
    await user.click(screen.getByRole("button", { name: "Generate plan" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("did not match");
    expect(onGenerated).not.toHaveBeenCalled();
  });
  it("disables duplicate submission and announces generation", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() => new Promise(() => {}));
    const user = userEvent.setup();
    render(<GenerationPanel details={brief} onGenerated={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Generate plan" }));
    expect(screen.getByRole("status")).toHaveTextContent("Generating");
    expect(screen.getByRole("button")).toBeDisabled();
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
describe("interactive planning dashboard", () => {
  it("presents exact allocations and reserve percentages without implying actual spending", () => {
    const plan = fixturePlan();
    const original = JSON.stringify(plan);
    const { container } = render(<PlanDashboard initialPlan={plan} />);
    expect(screen.getByText(/Actual spending is not tracked/)).toBeVisible();
    const rows = container.querySelectorAll(".budget-line");
    plan.categories.forEach((category, index) => {
      const row = within(rows[index] as HTMLElement);
      expect(row.getByText(formatINR(category.allocationPaise))).toBeVisible();
      expect(row.getByText(`${(category.allocationPaise / plan.details.budgetPaise * 100).toFixed(2)}%`)).toBeVisible();
    });
    expect(screen.getByText("10% contingency target · rounded down")).toBeVisible();
    expect(JSON.stringify(plan)).toBe(original);
  });

  it("renders zero-budget allocation bars safely and keeps task progress accessible", () => {
    const { container } = render(<PlanDashboard initialPlan={fixturePlan({ budgetPaise: 0 })} />);
    expect(container.textContent).not.toMatch(/NaN|Infinity/);
    for (const bar of container.querySelectorAll<HTMLElement>(".allocation-track > span"))
      expect(bar.style.width).toBe("0%");
    expect(screen.getByRole("progressbar", { name: "Overall task completion" })).toHaveAttribute("value", "0");
  });

  it("tracks task completion and vendor status and saves them", async () => {
    const user = userEvent.setup();
    render(<PlanDashboard initialPlan={fixturePlan()} />);
    await user.click(screen.getAllByRole("checkbox")[0]);
    await user.selectOptions(
      screen.getByLabelText("Selection status for Venue & space"),
      "booked",
    );
    await user.click(screen.getByRole("button", { name: "Save plan" }));
    expect(screen.getByRole("status")).toHaveTextContent("Plan saved");
    const saved = JSON.parse(
      localStorage.getItem(`planora:plan:v1:${fixturePlan().id}`)!,
    );
    expect(saved.tasks[0].completed).toBe(true);
    expect(saved.vendors[0].status).toBe("booked");
  });
  it("leaves the visible plan intact when storage is full", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    const user = userEvent.setup();
    render(<PlanDashboard initialPlan={fixturePlan()} />);
    await user.click(screen.getByRole("button", { name: "Save plan" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Could not save");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      brief.name,
    );
    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    expect(screen.getAllByRole("checkbox")[0]).toBeChecked();
  });
});
