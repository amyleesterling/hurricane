import { expect, test } from "@playwright/test";
test("archive loads and opens a storm specimen", async ({ page }) => {
  test.setTimeout(120_000);
  const runtimeErrors: string[] = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  await page.goto("");
  await expect(
    page.getByRole("heading", { name: "THE STORM CHOIR" }),
  ).toBeVisible();
  await expect(page.getByTestId("globe")).toBeVisible();
  await page.getByRole("button", { name: "Enter the archive" }).click();
  await expect(page.getByLabel("Timeline controls")).toBeVisible();
  await expect(
    page.getByText("4,943 storm records", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Filters +" }).click();
  await expect(
    page.getByText("Western Pacific · typhoons", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Filters −" }).click();
  const search = page.getByLabel("Find a storm");
  await search.fill("typhoon");
  await expect(
    page.getByText("1,460 storm records", { exact: true }),
  ).toBeVisible();
  await search.fill("");
  const globe = page.getByTestId("globe");
  const bounds = await globe.boundingBox();
  expect(bounds).not.toBeNull();
  if (bounds) {
    await page.mouse.move(bounds.x + bounds.width * 0.55, bounds.y + 260);
    await page.mouse.down();
    await page.mouse.move(bounds.x + bounds.width * 0.66, bounds.y + 300, {
      steps: 2,
    });
    await page.mouse.up();
  }
  await expect(globe.locator("canvas")).toBeVisible();
  expect(
    await page.getByText("An error occurred while rendering.").count(),
  ).toBe(0);
  await page.screenshot({ path: "docs/screenshot.png" });
  await page.getByRole("button", { name: /Great Portrait/ }).click();
  await page.locator(".portrait-tile").first().click();
  await expect(page.getByText(/SPECIMEN/)).toBeVisible();
  await expect(page.getByText(/VISUAL RECONSTRUCTION/)).toBeVisible();
  expect(runtimeErrors).toEqual([]);
});
