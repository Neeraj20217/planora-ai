import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EventForm } from "@/components/events/event-form";

function fillRequiredFields() {
  fireEvent.change(screen.getByLabelText("Event name"), {
    target: { value: "Ananya’s birthday" },
  });
  fireEvent.change(screen.getByLabelText("Event date"), {
    target: { value: "2099-11-01" },
  });
  fireEvent.change(screen.getByLabelText("Location"), {
    target: { value: "Hyderabad" },
  });
  fireEvent.change(screen.getByLabelText("Number of guests"), {
    target: { value: "50" },
  });
  fireEvent.change(screen.getByLabelText("Total budget (INR)"), {
    target: { value: "30000.29" },
  });
}

describe("accessible event form", () => {
  it("offers all three event types with a keyboard-operable radio group", async () => {
    const user = userEvent.setup();
    render(<EventForm initialToday="2026-10-26" />);
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    await user.click(screen.getByRole("radio", { name: /Wedding/ }));
    expect(screen.getByRole("radio", { name: /Wedding/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Birthday/ })).not.toBeChecked();
  });

  it("announces validation errors, associates them to inputs, and focuses the first invalid field", async () => {
    const user = userEvent.setup();
    render(<EventForm initialToday="2026-10-26" />);
    await user.click(
      screen.getByRole("button", { name: "Review event details" }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Let’s check a few details",
    );
    expect(screen.getByLabelText("Event name")).toHaveFocus();
    expect(screen.getByLabelText("Event name")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByLabelText("Event name")).toHaveAccessibleDescription(
      "Enter event name.",
    );
  });

  it("reviews a valid brief, then preserves values when editing", async () => {
    const user = userEvent.setup();
    render(<EventForm initialToday="2026-10-26" />);
    fillRequiredFields();
    await user.click(
      screen.getByRole("button", { name: "Review event details" }),
    );
    const heading = screen.getByRole("heading", {
      level: 1,
      name: "A lovely place to start.",
    });
    await waitFor(() => expect(heading).toHaveFocus());
    expect(screen.getByRole("status")).toHaveTextContent(
      "isn’t saved or sent anywhere",
    );
    expect(screen.getByText("₹30,000.29")).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "Edit event details" }),
    );
    expect(screen.getByLabelText("Event name")).toHaveValue(
      "Ananya’s birthday",
    );
    expect(screen.getByLabelText("Total budget (INR)")).toHaveValue("30000.29");
  });

  it("keeps entered details after an error and clears the corrected field error", async () => {
    const user = userEvent.setup();
    render(<EventForm initialToday="2026-10-26" />);
    fillRequiredFields();
    fireEvent.change(screen.getByLabelText("Number of guests"), {
      target: { value: "2.5" },
    });
    await user.click(
      screen.getByRole("button", { name: "Review event details" }),
    );
    expect(screen.getByLabelText("Event name")).toHaveValue(
      "Ananya’s birthday",
    );
    expect(screen.getByLabelText("Number of guests")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    fireEvent.change(screen.getByLabelText("Number of guests"), {
      target: { value: "50" },
    });
    expect(screen.getByLabelText("Number of guests")).toHaveAttribute(
      "aria-invalid",
      "false",
    );
    await user.click(
      screen.getByRole("button", { name: "Review event details" }),
    );
    expect(
      screen.getByRole("heading", { name: "A lovely place to start." }),
    ).toBeVisible();
  });
});
