import { test, expect } from "@playwright/test";
import { brief } from "../../tests/fixtures/planning";
import { planSchema } from "../../src/lib/schemas/plan";

test("keyless real mock endpoint, checked plan, explicit save and reopen", async ({
  page,
}) => {
  const external: string[] = [];
  await page.route("**/*", async (route) => {
    if (new URL(route.request().url()).origin !== "http://127.0.0.1:3200") {
      external.push("blocked");
      await route.abort();
    } else await route.continue();
  });
  await page.goto("/events/new");
  await expect(page.getByTestId("mock-only-banner")).toContainText("TEST ONLY");
  await page.getByText("Birthday", { exact: true }).click();
  await page
    .getByLabel("Event name", { exact: true })
    .fill("Synthetic mock birthday");
  await page.getByLabel("Event date", { exact: true }).fill(brief.date);
  await page.getByLabel("Location", { exact: true }).fill(brief.location);
  await page.getByLabel("Number of guests", { exact: true }).fill("50");
  await page.getByLabel("Total budget (INR)", { exact: true }).fill("30000");
  await page.getByRole("button", { name: "Review event details" }).click();
  const response = page.waitForResponse((r) =>
    r.url().endsWith("/api/plans/generate"),
  );
  await page.getByRole("button", { name: "Generate plan" }).click();
  const result = await response;
  expect(result.status()).toBe(200);
  const plan = planSchema.parse((await result.json()).plan);
  expect(plan.model).toBe("test-only-deterministic");
  expect(
    plan.categories.reduce((sum, row) => sum + row.allocationPaise, 0),
  ).toBe(3000000);
  expect(plan.overview).toContain("TEST ONLY");
  await page.getByRole("checkbox").first().check();
  await page.getByRole("button", { name: "Save plan" }).click();
  await expect(page).toHaveURL(/\/events\/[a-f0-9-]+$/);
  await page.reload();
  await expect(page.getByRole("checkbox").first()).toBeChecked();
  await expect(page.getByTestId("mock-only-banner")).toBeVisible();
  expect(external).toEqual([]);
});

test("local artifact access stays closed and cross-origin requests are rejected", async ({
  request,
}) => {
  const access = await request.post("/api/access/redeem", {
    headers: { origin: "http://127.0.0.1:3200" },
    data: { code: "synthetic-invalid" },
  });
  expect(access.status()).toBe(503);
  expect(access.headers()["set-cookie"]).toBeUndefined();
  const plan = await request.post("/api/plans/generate", {
    headers: { origin: "https://foreign.invalid" },
    data: { brief },
  });
  expect(plan.status()).toBe(403);
  expect((await plan.json()).error.code).toBe("ORIGIN");
});
