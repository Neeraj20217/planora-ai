import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("navigation, empty state, and guide work without claiming saved plans", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Your events" }),
  ).toBeVisible();
  await expect(page.getByText(/No saved events yet/)).toBeVisible();
  await page.getByRole("link", { name: "Planning guide", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: /A little structure/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Planning guide", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page
    .getByRole("link", { name: "Create an event", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/events\/new$/);
});

test("invalid submit is announced and the first invalid control receives focus", async ({
  page,
}) => {
  await page.goto("/events/new");
  await page.getByRole("button", { name: "Review event details" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toBeVisible();
  await expect(page.getByLabel("Event name", { exact: true })).toBeFocused();
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});

test("each event type can be reviewed and edited without external requests", async ({
  page,
}) => {
  const externalRequests: string[] = [];
  page.on("request", (request) => {
    if (!new URL(request.url()).hostname.match(/^(127\.0\.0\.1|localhost)$/))
      externalRequests.push(request.url());
  });
  for (const type of ["Wedding", "Birthday", "Community event"]) {
    await page.goto("/events/new");
    await page.getByText(type, { exact: true }).click();
    await expect(
      page.getByRole("radio", { name: new RegExp(type) }),
    ).toBeChecked();
    await page
      .getByLabel("Event name", { exact: true })
      .fill("Our celebration");
    await page.getByLabel("Event date", { exact: true }).fill("2099-11-01");
    await page.getByLabel("Location", { exact: true }).fill("Hyderabad");
    await page.getByLabel("Number of guests", { exact: true }).fill("50");
    await page
      .getByLabel("Total budget (INR)", { exact: true })
      .fill("30000.29");
    await page.getByRole("button", { name: "Review event details" }).click();
    await expect(
      page.getByRole("heading", { name: "A lovely place to start." }),
    ).toBeFocused();
    await expect(page.getByText("₹30,000.29")).toBeVisible();
    await expect(page.getByText(type, { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Edit event details" }).click();
    await expect(page.getByLabel("Event name", { exact: true })).toHaveValue(
      "Our celebration",
    );
  }
  expect(externalRequests).toEqual([]);
});

test("layout fits the viewport and passes automated accessibility checks", async ({
  page,
}) => {
  await page.goto("/events/new");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
});

test("unknown addresses have a recovery link", async ({ page }) => {
  const response = await page.goto("/missing-event");
  expect(response?.status()).toBe(404);
  await page.getByRole("link", { name: "Back to my events" }).click();
  await expect(page).toHaveURL("/");
});

test("JavaScript-disabled form cannot submit brief data into the URL", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${baseURL}/events/new`);
  await expect(
    page.getByText(/Enable JavaScript to enter and review/),
  ).toBeVisible();
  for (const control of await page
    .locator("form input, form textarea, form button")
    .all()) {
    await expect(control).toBeDisabled();
  }
  expect(new URL(page.url()).search).toBe("");
  await context.close();
});
