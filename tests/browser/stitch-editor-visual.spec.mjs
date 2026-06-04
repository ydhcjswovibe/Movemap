import { expect, test } from "@playwright/test";

async function openSampleEditor(browser) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.addInitScript(() => localStorage.clear());
  await page.goto("/");
  await page.getByRole("button", { name: /샘플로 시작/ }).click();
  await expect(page.locator(".stage-area")).toBeVisible();
  await expect(page.locator(".timeline-editor")).toBeVisible();
  return page;
}

async function expectNoHorizontalOverflow(page) {
  const overflow = await page.evaluate(() => {
    const root = document.scrollingElement || document.documentElement;
    return Math.max(root.scrollWidth, document.body.scrollWidth) - window.innerWidth;
  });
  expect(overflow).toBeLessThanOrEqual(2);
}

test.describe("Stitch main editor visual states", () => {
  test("captures mobile idle, timeline, formation, token, and menu states at 390px", async ({ browser }) => {
    let page = await openSampleEditor(browser);
    await expect(page.locator(".app")).toHaveAttribute("data-selection-state", "idle");
    await expect(page.locator(".app")).toHaveAttribute("data-timeline-state", "visible");
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: "test-results/stitch-editor-mobile-idle-390.png", fullPage: false });
    await page.screenshot({ path: "test-results/stitch-editor-mobile-timeline-390.png", fullPage: false });
    await page.close();

    page = await openSampleEditor(browser);
    await page.locator(".formation-block.segment").first().click();
    await expect(page.locator(".app")).toHaveAttribute("data-selection-state", "formation-selected");
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: "test-results/stitch-editor-mobile-formation-selected-390.png", fullPage: false });
    await page.close();

    page = await openSampleEditor(browser);
    await page.getByRole("button", { name: "사람" }).click();
    await expect(page.locator(".mobile-bottom-sheet")).toBeVisible();
    await page.locator(".mobile-bottom-sheet .performer").first().click();
    await expect(page.locator(".app")).toHaveAttribute("data-selection-state", "token-selected");
    await expect(page.locator(".mobile-bottom-sheet .performer.active")).toHaveCount(1);
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: "test-results/stitch-editor-mobile-token-selected-390.png", fullPage: false });
    await page.close();

    page = await openSampleEditor(browser);
    await page.locator(".mobile-global-actions").getByRole("button", { name: "더보기" }).click();
    await expect(page.locator(".app")).toHaveAttribute("data-menu-state", "expanded");
    await expect(page.locator(".mobile-global-actions .more-action-menu")).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: "test-results/stitch-editor-mobile-menu-390.png", fullPage: false });
    await page.close();
  });
});
