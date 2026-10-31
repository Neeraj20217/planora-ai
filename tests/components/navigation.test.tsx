import { describe, expect, it, vi } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Navigation } from "@/components/navigation";

vi.mock("next/navigation", () => ({ usePathname: () => "/events/new" }));

describe("Celebration Atelier navigation", () => {
  it("marks the current route and keeps the create action available", () => {
    render(<Navigation />);
    const desktop = screen.getByRole("navigation", { name: "Main navigation" });
    expect(within(desktop).getByRole("link", { name: "Create an event" }))
      .toHaveAttribute("aria-current", "page");
    expect(within(desktop).getByRole("link", { name: "Planning guide" }))
      .toHaveAttribute("href", "/guide");
  });

  it("closes the disclosure with Escape and returns focus to its trigger", async () => {
    const user = userEvent.setup();
    const { container } = render(<Navigation />);
    const details = container.querySelector("details")!;
    const summary = container.querySelector("summary")!;
    details.open = true;
    const mobile = screen.getByRole("navigation", { name: "Mobile navigation" });
    const link = within(mobile).getByRole("link", { name: "Planning guide" });
    link.focus();
    await user.keyboard("{Escape}");
    expect(details.open).toBe(false);
    expect(summary).toHaveFocus();
  });

  it("closes the mobile disclosure when a destination is chosen", () => {
    const { container } = render(<Navigation />);
    const details = container.querySelector("details")!;
    details.open = true;
    fireEvent.click(within(screen.getByRole("navigation", { name: "Mobile navigation" }))
      .getByRole("link", { name: "My events" }));
    expect(details.open).toBe(false);
  });
});
