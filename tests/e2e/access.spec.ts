import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("invite access is accessible, clears codes and supports logout without browser storage", async ({
  page,
}) => {
  const synthetic = "test-invite-never-a-real-secret";
  await page.route("**/api/access/redeem", async (route) => {
    expect(route.request().method()).toBe("POST");
    expect(route.request().postDataJSON()).toEqual({ code: synthetic });
    await route.fulfill({ json: { ok: true } });
  });
  await page.route("**/api/access/logout", (route) =>
    route.fulfill({ json: { ok: true } }),
  );
  await page.goto("/access");
  const field = page.getByLabel("Invite code (required)");
  await field.fill(synthetic);
  await page.getByRole("button", { name: "Redeem invite" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Generation access granted",
  );
  await expect(field).toHaveValue("");
  expect(page.url()).not.toContain(synthetic);
  expect(
    await page.evaluate(() =>
      JSON.stringify({ ...localStorage, ...sessionStorage }),
    ),
  ).not.toContain(synthetic);
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("status")).toContainText("Signed out");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("invalid access is announced and returns keyboard focus without echoing a code", async ({
  page,
}) => {
  await page.route("**/api/access/redeem", (route) =>
    route.fulfill({
      status: 401,
      json: { error: { message: "ignored raw details" } },
    }),
  );
  await page.goto("/access");
  const field = page.getByLabel("Invite code (required)");
  await field.fill("synthetic-invalid");
  await page.getByRole("button", { name: "Redeem invite" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Access could not be completed",
  );
  await expect(field).toBeFocused();
  await expect(field).toHaveValue("");
  await expect(page.getByRole("main").getByRole("alert")).not.toContainText(
    "ignored raw details",
  );
});

test("real unconfigured access routes remain closed", async ({ page }) => {
  await page.goto("/access");
  const result = await page.evaluate(async () => {
    const response = await fetch("/api/access/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "synthetic-invalid" }),
    });
    return {
      status: response.status,
      cookie: response.headers.get("set-cookie"),
    };
  });
  expect(result.status).toBe(503);
  expect(result.cookie).toBeNull();
});

test("invite code label is stacked above input with visible border and proper button spacing", async ({
  page,
}) => {
  await page.goto("/access");
  const label = page.getByText("Invite code (required)");
  const input = page.getByLabel("Invite code (required)");
  const redeemBtn = page.getByRole("button", { name: "Redeem invite" });
  const signoutBtn = page.getByRole("button", { name: "Sign out" });

  const labelBox = await label.boundingBox();
  const inputBox = await input.boundingBox();
  const redeemBox = await redeemBtn.boundingBox();
  const signoutBox = await signoutBtn.boundingBox();

  expect(labelBox).not.toBeNull();
  expect(inputBox).not.toBeNull();
  expect(redeemBox).not.toBeNull();
  expect(signoutBox).not.toBeNull();

  // 1. Label is strictly positioned ABOVE the input field (not beside it)
  expect(labelBox!.y + labelBox!.height).toBeLessThanOrEqual(inputBox!.y + 1);

  // 2. Input has visible border and proper minimum height
  const inputStyles = await input.evaluate((el) => {
    const computed = window.getComputedStyle(el);
    return {
      borderWidth: computed.borderWidth,
      borderStyle: computed.borderStyle,
      borderColor: computed.borderColor,
      height: computed.height,
      minHeight: computed.minHeight,
      display: computed.display,
      backgroundColor: computed.backgroundColor,
    };
  });

  expect(inputStyles.display).toBe("block");
  expect(parseFloat(inputStyles.borderWidth)).toBeGreaterThanOrEqual(1);
  expect(inputStyles.borderStyle).toBe("solid");
  expect(inputStyles.borderColor).not.toBe("transparent");
  expect(parseFloat(inputStyles.height)).toBeGreaterThanOrEqual(44);

  // 3. Buttons have appropriate spacing and do not overlap
  const horizontalSeparation = signoutBox!.x >= redeemBox!.x + redeemBox!.width;
  const verticalSeparation = signoutBox!.y >= redeemBox!.y + redeemBox!.height;
  expect(horizontalSeparation || verticalSeparation).toBe(true);

  // Save screenshot evidence for verification
  await page.screenshot({
    path: `C:/Users/NeerajK/.gemini/antigravity-ide/brain/76fc060f-7008-47e1-a9e0-f1947f5b1ecc/scratch/access-page-${page.viewportSize()?.width || "unknown"}.png`,
  });
});
