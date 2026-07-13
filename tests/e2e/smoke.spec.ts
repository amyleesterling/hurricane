import { expect, test } from "@playwright/test";
test("archive loads and opens a storm specimen", async ({ page }) => {
  await page.goto("");
  await expect(
    page.getByRole("heading", { name: "THE STORM CHOIR" }),
  ).toBeVisible();
  await expect(page.getByTestId("globe")).toBeVisible();
  await page.getByRole("button", { name: "Enter the archive" }).click();
  await expect(page.getByLabel("Timeline controls")).toBeVisible();
  await page.screenshot({ path: "docs/screenshot.png" });
  await page.getByRole("button", { name: /Great Portrait/ }).click();
  await page.locator(".portrait-tile").first().click();
  await expect(page.getByText(/SPECIMEN/)).toBeVisible();
});
