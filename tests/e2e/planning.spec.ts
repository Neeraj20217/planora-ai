import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { brief, fixturePlan } from "../fixtures/planning";

async function review(page: Page, name = brief.name, eventType = "Birthday") {
  await page.goto("/events/new");
  await page.getByText(eventType, { exact: true }).click();
  await page.getByLabel("Event name", { exact: true }).fill(name);
  await page.getByLabel("Event date", { exact: true }).fill(brief.date);
  await page.getByLabel("Location", { exact: true }).fill(brief.location);
  await page
    .getByLabel("Number of guests", { exact: true })
    .fill(String(brief.guests));
  await page.getByLabel("Total budget (INR)", { exact: true }).fill("30000");
  await page.getByLabel(/Theme/).fill(brief.theme);
  await page.getByLabel(/Personal preferences/).fill(brief.preferences);
  await page.getByLabel(/Special requirements/).fill(brief.specialRequirements);
  await page.getByRole("button", { name: "Review event details" }).click();
}

test("generation, task/vendor edits, saving, refresh and reopening multiple events", async ({
  page,
}) => {
  let count = 0;
  await page.route("**/api/plans/generate", async (route) => {
    count++;
    const details = route.request().postDataJSON().brief;
    const id =
      count === 1
        ? "a31b3123-95aa-4b8c-8704-7efcfd55b713"
        : "b31b3123-95aa-4b8c-8704-7efcfd55b713";
    await route.fulfill({
      json: { plan: fixturePlan(details, id), requestId: "browser-fixture" },
    });
  });
  await review(page);
  await page.getByRole("button", { name: "Generate plan" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(brief.name);
  await expect(page.getByText(/Test fixture — not live AI/)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "A budget with breathing room" }),
  ).toBeVisible();
  const initialAxe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(initialAxe.violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("checkbox").first().check();
  await page
    .getByLabel("Selection status for Venue & space")
    .selectOption("booked");
  await page.getByRole("button", { name: "Save plan" }).click();
  await expect(page).toHaveURL(/\/events\/a31b3123/);
  await page.reload();
  await expect(page.getByRole("checkbox").first()).toBeChecked();
  await expect(
    page.getByLabel("Selection status for Venue & space"),
  ).toHaveValue("booked");
  await page
    .getByRole("link", { name: "My events", exact: true })
    .first()
    .click();
  await page.getByRole("link", { name: `Open ${brief.name}` }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(brief.name);
  await review(page, "Community day", "Community event");
  await page.getByRole("button", { name: "Generate plan" }).click();
  await page.getByRole("button", { name: "Save plan" }).click();
  await expect(page).toHaveURL(/\/events\/b31b3123/);
  await page
    .getByRole("link", { name: "My events", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("link", { name: `Open ${brief.name}` }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Open Community day" }),
  ).toBeVisible();
});

test("real server safely reports missing credentials without losing the reviewed brief", async ({
  page,
}) => {
  await review(page);
  await page.getByRole("button", { name: "Generate plan" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "not configured",
  );
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "A lovely place to start.",
  );
  await page.getByRole("button", { name: "Edit event details" }).click();
  await expect(page.getByLabel("Event name", { exact: true })).toHaveValue(
    brief.name,
  );
});

test("invalid AI response is not saved and a retry can succeed", async ({
  page,
}) => {
  let calls = 0;
  await page.route("**/api/plans/generate", async (route) => {
    calls++;
    await route.fulfill({
      json:
        calls === 1
          ? { plan: {} }
          : { plan: fixturePlan(route.request().postDataJSON().brief) },
    });
  });
  await review(page);
  await page.getByRole("button", { name: "Generate plan" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "could not be validated",
  );
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  await page.getByRole("button", { name: "Generate plan" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(brief.name);
});

test("corrupt stored data is preserved and reported alongside valid plans", async ({
  page,
}) => {
  await page.goto("/");
  const plan = { ...fixturePlan(), revision: 1 };
  await page.evaluate((record) => {
    localStorage.setItem(
      `planora:plan:v1:${record.id}`,
      JSON.stringify(record),
    );
    localStorage.setItem("planora:plan:v1:broken", "damaged");
  }, plan);
  await page.reload();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "left untouched",
  );
  await page.getByRole("link", { name: `Open ${brief.name}` }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(brief.name);
  expect(
    await page.evaluate(() => localStorage.getItem("planora:plan:v1:broken")),
  ).toBe("damaged");
});

test("internal navigation warns before discarding unsaved task changes", async ({
  page,
}) => {
  await page.goto("/");
  const record = { ...fixturePlan(), revision: 1 };
  await page.evaluate(
    (plan) =>
      localStorage.setItem(`planora:plan:v1:${plan.id}`, JSON.stringify(plan)),
    record,
  );
  await page.goto(`/events/${record.id}`);
  await page.getByRole("checkbox").first().check();
  page.once("dialog", (dialog) => dialog.dismiss());
  await page
    .getByRole("link", { name: "My events", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(`/events/${record.id}`);
  await expect(page.getByRole("checkbox").first()).toBeChecked();
  await page.getByRole("button", { name: "Save changes" }).click();
  await page
    .getByRole("link", { name: "My events", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("link", { name: `Open ${brief.name}` }),
  ).toBeVisible();
});
