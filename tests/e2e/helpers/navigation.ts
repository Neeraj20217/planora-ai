import { expect, type Page } from "@playwright/test";

/** Follow the rendered responsive layout rather than duplicating CSS breakpoints. */
export async function navigationForViewport(page: Page) {
  const desktop = page.getByRole("navigation", { name: "Main navigation", exact: true });
  if (await desktop.isVisible()) return desktop;

  const mobile = page.getByRole("navigation", { name: "Mobile navigation", exact: true });
  if (!(await mobile.isVisible())) {
    const toggle = page.locator(".mobile-nav > summary");
    await expect(toggle).toBeVisible();
    await toggle.click();
  }
  await expect(mobile).toBeVisible();
  return mobile;
}
