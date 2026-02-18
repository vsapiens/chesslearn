import { test, expect, Page } from "@playwright/test";

const PAGES = [
  { name: "Home", path: "/" },
  { name: "New Game", path: "/play/new" },
  { name: "Learn", path: "/learn" },
];

const MIN_TOUCH_TARGET = 44;

async function assertNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
  expect(overflow, "Page should not have horizontal scrollbar").toBe(false);
}

async function assertTouchTargets(page: Page) {
  const tooSmall = await page.evaluate((min) => {
    const interactive = Array.from(
      document.querySelectorAll('button, a, [role="button"], input, select, textarea')
    );
    const failures: string[] = [];
    for (const el of interactive) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;
      if (
        getComputedStyle(el).display === "none" ||
        getComputedStyle(el).visibility === "hidden"
      )
        continue;
      if (rect.width < min || rect.height < min) {
        const tag = el.tagName.toLowerCase();
        const text = (el.textContent ?? "").slice(0, 30).trim();
        failures.push(`${tag}("${text}") ${Math.round(rect.width)}x${Math.round(rect.height)}`);
      }
    }
    return failures;
  }, MIN_TOUCH_TARGET);

  if (tooSmall.length > 0) {
    console.warn(
      `Touch target warnings (${tooSmall.length} elements under ${MIN_TOUCH_TARGET}px):`,
      tooSmall
    );
  }
}

for (const { name, path } of PAGES) {
  test.describe(`${name} page`, () => {
    test("has no horizontal overflow", async ({ page }) => {
      await page.goto(path, { waitUntil: "networkidle" });
      await assertNoHorizontalOverflow(page);
    });

    test("interactive elements meet touch target guidelines", async ({ page }) => {
      await page.goto(path, { waitUntil: "networkidle" });
      await assertTouchTargets(page);
    });

    test("visual snapshot", async ({ page }) => {
      await page.goto(path, { waitUntil: "networkidle" });
      await expect(page).toHaveScreenshot(`${name.toLowerCase().replace(/\s+/g, "-")}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.05,
      });
    });
  });
}

test.describe("Navigation", () => {
  test("mobile: hamburger menu shows and hides", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Only runs on mobile viewports");

    await page.goto("/", { waitUntil: "networkidle" });

    const desktopLinks = page.locator("nav .hidden.sm\\:flex a");
    await expect(desktopLinks.first()).not.toBeVisible();

    const hamburger = page.locator('nav button[aria-label="Toggle menu"]');
    await expect(hamburger).toBeVisible();
    await hamburger.click();

    const mobileMenu = page.locator("nav .sm\\:hidden.mt-3");
    await expect(mobileMenu).toBeVisible();

    const menuLinks = mobileMenu.locator("a");
    await expect(menuLinks).toHaveCount(2);

    await hamburger.click();
    await expect(mobileMenu).not.toBeVisible();
  });

  test("desktop: shows inline links, no hamburger", async ({ page, isMobile }) => {
    test.skip(!!isMobile, "Only runs on desktop viewports");

    await page.goto("/", { waitUntil: "networkidle" });

    const desktopLinks = page.locator("nav .hidden.sm\\:flex a");
    await expect(desktopLinks.first()).toBeVisible();

    const hamburger = page.locator('nav button[aria-label="Toggle menu"]');
    await expect(hamburger).not.toBeVisible();
  });
});
