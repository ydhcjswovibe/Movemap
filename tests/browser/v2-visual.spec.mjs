import { expect, test } from "@playwright/test";

async function expectInsideViewport(page, locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(page.viewportSize().height + 1);
}

test.describe("visual-only v2 editor prototype", () => {
  test("renders the enhanced timeline visual at 390px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/v2");

    const root = page.locator("[data-v2-visual-editor]");
    const stage = page.locator("[data-v2-stage]");
    const timeline = page.locator("[data-v2-timeline]");
    const bottomRail = page.locator("[data-v2-bottom-rail]");

    await expect(root).toBeVisible();
    await expect(page.getByRole("heading", { name: "Finale Scene" })).toBeVisible();
    await expect(root.getByText("Saved")).toBeVisible();
    await expect(stage).toBeVisible();
    await expect(timeline).toBeVisible();
    await expect(bottomRail).toBeVisible();
    await expect(timeline.getByRole("button", { name: "대형 추가" })).toBeVisible();
    await expect(timeline.getByRole("button", { name: "음악 추가" })).toBeVisible();
    await expect(timeline.locator("[data-v2-waveform] span")).toHaveCount(48);
    await expect(root.getByText("BPM")).toHaveCount(0);

    const boxes = await root.evaluate((node) => {
      const rectFor = (selector) => {
        const rect = node.querySelector(selector)?.getBoundingClientRect();
        return rect ? { y: rect.y, height: rect.height, bottom: rect.bottom, center: rect.y + rect.height / 2 } : null;
      };
      return {
        stage: rectFor("[data-v2-stage]"),
        timeline: rectFor("[data-v2-timeline]"),
        formationLane: rectFor(".v2-lane-row"),
        musicLane: rectFor(".v2-audio-row"),
        introBlock: rectFor(".v2-intro-block"),
        moveBlock: rectFor(".v2-move-block"),
        waveform: rectFor("[data-v2-waveform]"),
        rail: rectFor("[data-v2-bottom-rail]"),
        viewportHeight: window.innerHeight
      };
    });

    expect(boxes.stage.height).toBeGreaterThan(boxes.timeline.height);
    expect(boxes.stage.height).toBeGreaterThanOrEqual(460);
    expect(boxes.timeline.height).toBeGreaterThanOrEqual(220);
    expect(boxes.timeline.height).toBeLessThanOrEqual(260);
    expect(Math.abs(boxes.formationLane.height - boxes.musicLane.height)).toBeLessThanOrEqual(1);
    expect(Math.abs(boxes.introBlock.center - boxes.formationLane.center)).toBeLessThanOrEqual(1);
    expect(Math.abs(boxes.moveBlock.center - boxes.formationLane.center)).toBeLessThanOrEqual(1);
    expect(boxes.moveBlock.height).toBeLessThan(boxes.introBlock.height);
    expect(Math.abs(boxes.waveform.center - boxes.musicLane.center)).toBeLessThanOrEqual(1);
    expect(boxes.timeline.bottom).toBeLessThanOrEqual(boxes.rail.y + 1);
    expect(boxes.rail.bottom).toBeLessThanOrEqual(boxes.viewportHeight + 1);

    const actionButtonBox = await bottomRail.getByRole("button").first().boundingBox();
    expect(actionButtonBox).not.toBeNull();
    expect(actionButtonBox.width).toBeGreaterThanOrEqual(44);
    expect(actionButtonBox.height).toBeGreaterThanOrEqual(44);

    await expectInsideViewport(page, timeline);
    await expectInsideViewport(page, bottomRail);
    await page.screenshot({ path: "test-results/v2-visual-mobile-390.png", fullPage: false });
  });

  test("centers the phone shell on desktop without stretching it", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/v2");

    const shellMetrics = await page.locator(".v2-phone-shell").evaluate((shell) => {
      const rect = shell.getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        width: rect.width,
        viewportWidth: window.innerWidth
      };
    });

    expect(shellMetrics.width).toBeLessThanOrEqual(392);
    expect(Math.abs(shellMetrics.left - (shellMetrics.viewportWidth - shellMetrics.width) / 2)).toBeLessThanOrEqual(2);
    await page.screenshot({ path: "test-results/v2-visual-desktop-1440.png", fullPage: false });
  });
});
