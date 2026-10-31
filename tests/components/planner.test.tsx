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
  it("identifies network failures without retrying or exposing raw transport details", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("private network detail"));
    render(<GenerationPanel details={brief} onGenerated={vi.fn()} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Generate plan" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Check your connection");
    expect(screen.getByRole("alert")).not.toHaveTextContent("private network detail");
    expect(fetchMock).toHaveBeenCalledOnce();
  });
  it.each([null, { plan: null }])("reports invalid server responses distinctly: %j", async raw => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(raw));
    const generated = vi.fn();
    render(<GenerationPanel details={brief} onGenerated={generated} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Generate plan" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("could not be validated");
    expect(generated).not.toHaveBeenCalled();
  });
  it("does not retry generation after malformed trial success", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ error: { code: "SESSION_REQUIRED" } }, { status: 401 }))
      .mockResolvedValueOnce(Response.json({ ok: false }));
    render(<GenerationPanel details={brief} onGenerated={vi.fn()} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Generate plan" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("could not be validated");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it("honors a longer Retry-After until the next manual click", async () => {
    const start = Date.now();
    const clock = vi.spyOn(Date, "now").mockReturnValue(start);
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () => Response.json({ error: { code: "ACCESS_LIMIT" } }, { status: 429, headers: { "Retry-After": "120" } }));
    render(<GenerationPanel details={brief} onGenerated={vi.fn()} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Generate plan" }));
    await screen.findByRole("alert");
    clock.mockReturnValue(start + 61000);
    await user.click(screen.getByRole("button", { name: "Generate plan" }));
    expect(screen.getByRole("alert")).toHaveTextContent("59 seconds");
    expect(fetchMock).toHaveBeenCalledOnce();
    clock.mockReturnValue(start + 121000);
    expect(fetchMock).toHaveBeenCalledOnce();
    await user.click(screen.getByRole("button", { name: "Generate plan" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });
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
    expect(screen.getByRole("button", { name: "Planning your celebration…" })).toBeDisabled();
    expect(fetchMock).toHaveBeenCalledOnce();
  });
  it("allocates a fresh independent timeout signal for recovered generation after trial access", async () => {
    const plan = fixturePlan();
    const capturedSignals: AbortSignal[] = [];
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      if (init?.signal) capturedSignals.push(init.signal);
      if (String(url).endsWith("/api/plans/generate") && capturedSignals.length === 1) {
        return Response.json({ error: { code: "SESSION_REQUIRED" } }, { status: 401 });
      }
      if (String(url).endsWith("/api/access/trial")) {
        return Response.json({ ok: true }, { status: 200 });
      }
      if (String(url).endsWith("/api/plans/generate") && capturedSignals.length === 3) {
        return Response.json({ plan }, { status: 200 });
      }
      return Response.json({ error: { code: "UNKNOWN" } }, { status: 500 });
    });

    const onGenerated = vi.fn();
    render(<GenerationPanel details={brief} onGenerated={onGenerated} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Generate plan" }));

    await waitFor(() => expect(onGenerated).toHaveBeenCalledWith(plan));
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(capturedSignals).toHaveLength(3);
    // Distinct signal instances for initial generation, trial activation, and recovered generation
    expect(capturedSignals[0]).not.toBe(capturedSignals[2]);
    expect(capturedSignals[1]).not.toBe(capturedSignals[2]);
  });
  it("aborts in-flight request cleanly when unmounted and classifies timeout errors", async () => {
    let capturedSignal: AbortSignal | null | undefined;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
      capturedSignal = init?.signal;
      return new Promise(() => {});
    });
    const { unmount } = render(<GenerationPanel details={brief} onGenerated={vi.fn()} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Generate plan" }));
    expect(capturedSignal).toBeDefined();
    expect(capturedSignal?.aborted).toBe(false);
    unmount();
    expect(capturedSignal?.aborted).toBe(true);

    // Verify a timed-out request signal without unmount is classified as timeout
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
      const signal = init?.signal as AbortSignal;
      Object.defineProperty(signal, "aborted", { value: true, configurable: true });
      throw new DOMException("The operation was aborted", "TimeoutError");
    });
    render(<GenerationPanel details={brief} onGenerated={vi.fn()} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Generate plan" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Generation timed out");
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


describe("judge access and offline fallback", () => {
  it("opens a labeled sample without any access or Gemini request", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const generated = vi.fn();
    render(<GenerationPanel details={brief} onGenerated={generated} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Explore sample plan (offline reference)" }));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(generated.mock.calls[0][0].provenance).toBe("test-fixture");
    expect(generated.mock.calls[0][0].details).toEqual(brief);
  });

  it("activates one trial for absent access and accepts a strictly valid plan", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ error: { code: "SESSION_REQUIRED" } }, { status: 401 }))
      .mockResolvedValueOnce(Response.json({ ok: true }))
      .mockResolvedValueOnce(Response.json({ plan: fixturePlan() }));
    const generated = vi.fn();
    render(<GenerationPanel details={brief} onGenerated={generated} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Generate plan" }));
    await waitFor(() => expect(generated).toHaveBeenCalledOnce());
    expect(fetchMock.mock.calls.map(call => call[0])).toEqual(["/api/plans/generate", "/api/access/trial", "/api/plans/generate"]);
  });

  it("uses the retried response status and blocks immediate retries after a quota rejection", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ error: { code: "SESSION_REQUIRED" } }, { status: 401 }))
      .mockResolvedValueOnce(Response.json({ ok: true }))
      .mockResolvedValueOnce(Response.json({ error: { code: "ACCESS_LIMIT" } }, { status: 429 }));
    render(<GenerationPanel details={brief} onGenerated={vi.fn()} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Generate plan" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("allowance");
    await user.click(screen.getByRole("button", { name: "Generate plan" }));
    expect(screen.getByRole("alert")).toHaveTextContent("wait a minute");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("does not display arbitrary trial server text or generate after trial rejection", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ error: { code: "SESSION_REQUIRED" } }, { status: 401 }))
      .mockResolvedValueOnce(Response.json({ error: { code: "BOT_DENIED", message: "private server detail" } }, { status: 403 }));
    render(<GenerationPanel details={brief} onGenerated={vi.fn()} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Generate plan" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("access check could not verify");
    expect(screen.getByRole("alert")).not.toHaveTextContent("private server detail");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("button", { name: "Explore sample plan (offline reference)" })).toBeEnabled();
  });
});
