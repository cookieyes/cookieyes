import { expect, test } from "@playwright/test";

const BASE_URL = `http://localhost:${process.env.CSP_FIXTURE_PORT ?? 5391}`;

function collectStyleCspViolations(page: import("@playwright/test").Page): string[] {
  const violations: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error" && /content security policy|refused/i.test(msg.text())) {
      violations.push(msg.text());
    }
  });
  return violations;
}

test.describe("banner and dialogs under a strict style-src CSP", () => {
  test("banner renders fully styled, zero violations", async ({ page }) => {
    const violations = collectStyleCspViolations(page);

    await page.goto(BASE_URL);
    await page.waitForSelector(".cy-banner");

    const banner = page.locator(".cy-banner");
    await expect(banner).toHaveCSS("position", "fixed");
    await expect(banner).toHaveCSS("border-radius", "6px");
    await expect(banner).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)");

    expect(violations).toEqual([]);
  });

  test("preferences dialog renders fully styled, zero violations", async ({ page }) => {
    const violations = collectStyleCspViolations(page);

    await page.goto(BASE_URL);
    await page.getByRole("button", { name: "Customise" }).click();
    const dialog = page.locator(".cy-dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveCSS("border-radius", "6px");
    await expect(dialog).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)");

    expect(violations).toEqual([]);
  });

  test("opt-out dialog renders fully styled, zero violations (CCPA)", async ({ page }) => {
    const violations = collectStyleCspViolations(page);

    await page.goto(`${BASE_URL}/?regulation=CCPA`);
    await page
      .getByRole("button", { name: "Do Not Sell or Share My Personal Information" })
      .click();
    const dialog = page.locator(".cy-dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveCSS("border-radius", "6px");

    expect(violations).toEqual([]);
  });

  test("dark color scheme applies correctly, zero violations", async ({ page }) => {
    const violations = collectStyleCspViolations(page);

    await page.goto(`${BASE_URL}/?colorScheme=dark`);
    await page.waitForSelector(".cy-banner");

    await expect(page.locator(".cy-banner")).toHaveCSS("background-color", "rgb(22, 27, 39)");
    expect(violations).toEqual([]);
  });
});
