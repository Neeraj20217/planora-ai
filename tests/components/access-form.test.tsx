import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AccessForm } from "@/components/access-form";

describe("AccessForm UI and Accessibility", () => {
  it.each([null, { ok: false }, { error: { code: 7 } }])("does not claim access after invalid success JSON: %j", async raw => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(raw));
    render(<AccessForm />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Start evaluation session" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("invalid access response");
  });
  it("does not claim sign-out after a malformed success response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({}));
    render(<AccessForm />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Sign out" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Sign out could not be confirmed: the server returned an invalid response");
  });
  it("keeps trial cooldown separate from logout and respects HTTP-date Retry-After", async () => {
    const now = Date.parse("2026-10-31T00:00:00Z");
    vi.spyOn(Date, "now").mockReturnValue(now);
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ error: { code: "ACCESS_LIMIT" } }, { status: 429, headers: { "Retry-After": "Sat, 31 Oct 2026 00:02:00 GMT" } }))
      .mockResolvedValueOnce(Response.json({ ok: true }));
    render(<AccessForm />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Start evaluation session" }));
    await screen.findByRole("alert");
    await user.click(screen.getByRole("button", { name: "Start evaluation session" }));
    expect(screen.getByRole("alert")).toHaveTextContent("120 seconds");
    expect(fetchMock).toHaveBeenCalledOnce();
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Signed out");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it.each([401, 503])("reports a logout failure (%i) without invite errors or invalidating the invite field", async status => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ error: { code: "SESSION_REQUIRED", message: "private raw details" } }, { status }));
    render(<AccessForm />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Sign out" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Sign out could not be confirmed");
    expect(alert).not.toHaveTextContent(/invite|private raw details/i);
    expect(screen.getByLabelText("Invite code (required)")).not.toHaveAttribute("aria-invalid");
  });

  it("reports network logout failures without claiming successful revocation", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("private transport detail"));
    render(<AccessForm />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Sign out" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("may still have an active session");
  });

  it("distinguishes disabled trial access from quota exhaustion", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ error: { code: "ACCESS_UNAVAILABLE" } }, { status: 503 }));
    render(<AccessForm />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Start evaluation session" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("unavailable or disabled");
    expect(screen.getByRole("alert")).not.toHaveTextContent("limit reached");
  });
  it("renders accessible label positioned above the input with field container styling", () => {
    render(<AccessForm />);

    const label = screen.getByText("Invite code (required)");
    const input = screen.getByLabelText("Invite code (required)");

    expect(label).toBeInTheDocument();
    expect(label.tagName.toLowerCase()).toBe("label");
    expect(label).toHaveAttribute("for", "invite-code");

    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("id", "invite-code");
    expect(input).toHaveAttribute("type", "password");
    expect(input).toBeRequired();

    // Verify input is wrapped inside .field container
    const fieldContainer = input.closest(".field");
    expect(fieldContainer).not.toBeNull();
    expect(fieldContainer?.contains(label)).toBe(true);
    expect(fieldContainer?.contains(input)).toBe(true);

    // Verify label precedes input in DOM order (appearing above input)
    expect(label.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("associates security help description with input element via aria-describedby", () => {
    render(<AccessForm />);

    const input = screen.getByLabelText("Invite code (required)");
    const help = screen.getByText(/Do not share this code/);

    expect(help).toHaveAttribute("id", "invite-help");
    expect(input.getAttribute("aria-describedby")).toContain("invite-help");
  });

  it("groups action buttons with proper spacing and accessible roles", () => {
    render(<AccessForm />);

    const redeemBtn = screen.getByRole("button", { name: "Redeem invite" });
    const signoutBtn = screen.getByRole("button", { name: "Sign out" });

    expect(redeemBtn).toBeInTheDocument();
    expect(signoutBtn).toBeInTheDocument();
    expect(redeemBtn).toHaveAttribute("type", "submit");
    expect(signoutBtn).toHaveAttribute("type", "button");

    const actionsContainer = redeemBtn.closest(".access-actions");
    expect(actionsContainer).not.toBeNull();
    expect(actionsContainer?.contains(signoutBtn)).toBe(true);
  });

  it("supports keyboard navigation, focus management, and clears input upon submission", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ ok: true }, { status: 200 })
    );

    const user = userEvent.setup();
    render(<AccessForm />);

    const input = screen.getByLabelText("Invite code (required)");

    // Tab into the field
    await user.tab();
    // In jsdom with back-link present, first tab hits return link, second tab hits input
    if (document.activeElement !== input) {
      await user.tab();
    }
    expect(input).toHaveFocus();

    // Type and press Enter
    await user.type(input, "secret-test-code{enter}");

    // Code is immediately cleared from input for security
    expect(input).toHaveValue("");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/access/redeem",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ code: "secret-test-code" }),
      })
    );

    // Status message announced
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("Generation access granted");
    });

    fetchMock.mockRestore();
  });

  it("manages keyboard focus and accessible error alert on failed redemption", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ error: { code: "ACCESS_DENIED" } }, { status: 401 })
    );

    const user = userEvent.setup();
    render(<AccessForm />);

    const input = screen.getByLabelText("Invite code (required)");
    await user.type(input, "invalid-code");
    await user.click(screen.getByRole("button", { name: "Redeem invite" }));

    // Input cleared
    expect(input).toHaveValue("");

    // Error announced via alert role and input marked invalid
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Access could not be completed");
    expect(input).toHaveAttribute("aria-invalid", "true");

    // Input returned to keyboard focus for convenient correction
    await waitFor(() => {
      expect(input).toHaveFocus();
    });

    fetchMock.mockRestore();
  });

  it("activates evaluation access when clicking Start evaluation session", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ ok: true }, { status: 200 })
    );

    const user = userEvent.setup();
    render(<AccessForm />);

    const trialBtn = screen.getByRole("button", { name: "Start evaluation session" });
    expect(trialBtn).toBeInTheDocument();
    await user.click(trialBtn);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/access/trial",
      expect.objectContaining({
        method: "POST",
      })
    );

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("Evaluation access granted");
    });

    fetchMock.mockRestore();
  });
});
