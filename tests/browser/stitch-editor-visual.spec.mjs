import { expect, test } from "@playwright/test";

async function openSampleEditor(browser) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.addInitScript(() => {
    localStorage.removeItem("movemap-project");
    localStorage.removeItem("choreo-stage-planner-project");
  });
  await page.goto("/");
  await page.getByRole("button", { name: /샘플로 시작/ }).click();
  await expect(page.locator("[data-stitch-mobile-editor]")).toBeVisible();
  await expect(page.locator(".stage-area")).toBeVisible();
  await expect(page.locator(".timeline-editor")).toBeVisible();
  return page;
}

async function openStitchMock(browser) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.addInitScript(() => {
    localStorage.removeItem("movemap-project");
    localStorage.removeItem("choreo-stage-planner-project");
  });
  await page.goto("/stitch-mobile-mock");
  await expect(page.locator("[data-stitch-mobile-editor]")).toBeVisible();
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

async function expectSingleActionRail(page) {
  const rail = page.locator("[data-stitch-mobile-editor] .mobile-action-bar");
  const buttons = page.locator("[data-stitch-mobile-editor] .mobile-action-bar button");
  await expect(rail).toHaveCount(1);
  const box = await rail.boundingBox();
  expect(box).not.toBeNull();
  expect(box.height).toBeGreaterThanOrEqual(52);
  expect(box.height).toBeLessThanOrEqual(60);

  const firstButtonBox = await buttons.first().boundingBox();
  expect(firstButtonBox).not.toBeNull();
  expect(firstButtonBox.height).toBeGreaterThanOrEqual(44);
  await expect(rail.getByRole("button", { name: "음악" })).toHaveCount(0);
}

async function expectVisibleMeterGrid(page) {
  const editor = page.locator("[data-stitch-mobile-editor]");
  await expect(editor.locator(".stage-meter-badge")).toHaveText(/\d+m x \d+m/);
  const grid = editor.locator(".stage-grid line");
  const major = editor.locator(".stage-grid line.major");
  expect(await grid.count()).toBeGreaterThanOrEqual(20);
  expect(await major.count()).toBeGreaterThanOrEqual(4);
  const strokeMetrics = await editor.locator(".stage-grid").evaluate((gridNode) => {
    const minor = gridNode.querySelector("line.minor");
    const majorLine = gridNode.querySelector("line.major");
    const minorStyle = minor ? window.getComputedStyle(minor) : null;
    const majorStyle = majorLine ? window.getComputedStyle(majorLine) : null;
    return {
      minorStroke: minorStyle?.stroke || "",
      minorWidth: Number.parseFloat(minorStyle?.strokeWidth || "0"),
      majorStroke: majorStyle?.stroke || "",
      majorWidth: Number.parseFloat(majorStyle?.strokeWidth || "0")
    };
  });
  expect(strokeMetrics.minorStroke).not.toBe("none");
  expect(strokeMetrics.majorStroke).not.toBe("none");
  expect(strokeMetrics.minorWidth).toBeGreaterThan(0);
  expect(strokeMetrics.majorWidth).toBeGreaterThan(strokeMetrics.minorWidth);
}

async function expectPortraitMeterStage(page) {
  const editor = page.locator("[data-stitch-mobile-editor]");
  await expect(editor.locator(".stage-meter-badge")).toHaveText("5m x 6m");
  await expect(editor.locator(".stage")).toHaveAttribute("viewBox", "0 0 5 6");

  const metrics = await editor.locator(".stage-frame").evaluate((frame) => {
    const svg = frame.querySelector(".stage");
    const grid = frame.querySelectorAll(".stage-grid line");
    const major = frame.querySelectorAll(".stage-grid line.major");
    const rect = frame.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
      aspectRatio: window.getComputedStyle(frame).aspectRatio,
      gridCount: grid.length,
      majorCount: major.length,
      svgViewBox: svg?.getAttribute("viewBox") || ""
    };
  });

  expect(metrics.width).toBeGreaterThan(260);
  expect(metrics.height).toBeGreaterThan(metrics.width);
  expect(metrics.aspectRatio).toBe("5 / 6");
  expect(metrics.gridCount).toBe(13);
  expect(metrics.majorCount).toBe(4);
  expect(metrics.svgViewBox).toBe("0 0 5 6");
}

async function expectOrderedMobileBands(page) {
  const boxes = await page.locator("[data-stitch-mobile-editor]").evaluate((root) => {
    const rootRect = root.getBoundingClientRect();
    const rectFor = (selector) => {
      const rect = root.querySelector(selector)?.getBoundingClientRect();
      return rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height, bottom: rect.bottom, right: rect.right } : null;
    };
    return {
      viewportHeight: window.innerHeight,
      editor: { x: rootRect.x, y: rootRect.y, width: rootRect.width, height: rootRect.height, bottom: rootRect.bottom, right: rootRect.right },
      status: rectFor(".mobile-status-bar"),
      stage: rectFor(".stage-area"),
      timeline: rectFor(".timeline-editor"),
      action: rectFor(".mobile-action-bar")
    };
  });

  expect(boxes.editor).not.toBeNull();
  expect(boxes.status).not.toBeNull();
  expect(boxes.stage).not.toBeNull();
  expect(boxes.timeline).not.toBeNull();
  expect(boxes.action).not.toBeNull();
  expect(boxes.status.bottom).toBeLessThanOrEqual(boxes.stage.y + 1);
  expect(boxes.stage.bottom).toBeLessThanOrEqual(boxes.timeline.y + 1);
  expect(boxes.timeline.bottom).toBeLessThanOrEqual(boxes.action.y + 1);
  expect(boxes.action.bottom).toBeLessThanOrEqual(boxes.viewportHeight + 1);
}

async function expectTimelineTrimSpace(page) {
  const workbenchBox = await page.locator("[data-stitch-mobile-editor] .timeline-workbench").boundingBox();
  const formationLaneBox = await page.locator("[data-stitch-mobile-editor] .timeline-lane").first().boundingBox();
  const audioLaneBox = await page.locator("[data-stitch-mobile-editor] .audio-lane").boundingBox();
  const formationBlockBox = await page.locator("[data-stitch-mobile-editor] .formation-block").first().boundingBox();
  const timelineBox = await page.locator("[data-stitch-mobile-editor] .timeline-editor").boundingBox();
  const actionRailBox = await page.locator("[data-stitch-mobile-editor] .mobile-action-bar").boundingBox();
  expect(workbenchBox).not.toBeNull();
  expect(formationLaneBox).not.toBeNull();
  expect(audioLaneBox).not.toBeNull();
  expect(formationBlockBox).not.toBeNull();
  expect(timelineBox).not.toBeNull();
  expect(actionRailBox).not.toBeNull();

  const rows = await page.locator("[data-stitch-mobile-editor] .timeline-track-row").evaluateAll((rowNodes) =>
    rowNodes.map((row) => ({
      track: row.getAttribute("data-track-row"),
      labelCount: row.querySelectorAll(":scope > .timeline-row-label").length,
      viewportCount: row.querySelectorAll(":scope > .timeline-viewport").length
    }))
  );
  expect(rows).toEqual([
    { track: "ruler", labelCount: 1, viewportCount: 1 },
    { track: "forms", labelCount: 1, viewportCount: 1 },
    { track: "audio", labelCount: 1, viewportCount: 1 }
  ]);

  expect(workbenchBox.height).toBeGreaterThanOrEqual(142);
  expect(workbenchBox.height).toBeLessThanOrEqual(146);
  expect(formationLaneBox.height).toBeGreaterThanOrEqual(66);
  expect(formationLaneBox.height).toBeLessThanOrEqual(70);
  expect(audioLaneBox.height).toBeGreaterThanOrEqual(50);
  expect(audioLaneBox.height).toBeLessThanOrEqual(54);
  expect(formationBlockBox.height).toBeGreaterThanOrEqual(54);
  expect(formationBlockBox.height).toBeLessThanOrEqual(58);

  const topInset = formationBlockBox.y - formationLaneBox.y;
  const bottomInset = formationLaneBox.y + formationLaneBox.height - formationBlockBox.y - formationBlockBox.height;
  expect(Math.abs(topInset - bottomInset)).toBeLessThanOrEqual(2);
  expect(topInset).toBeGreaterThanOrEqual(5);
  expect(bottomInset).toBeGreaterThanOrEqual(5);
  expect(formationLaneBox.y).toBeGreaterThanOrEqual(workbenchBox.y);
  expect(formationLaneBox.y + formationLaneBox.height).toBeLessThanOrEqual(workbenchBox.y + workbenchBox.height);
  expect(audioLaneBox.y).toBeGreaterThanOrEqual(workbenchBox.y);
  expect(audioLaneBox.y + audioLaneBox.height).toBeLessThanOrEqual(workbenchBox.y + workbenchBox.height);
  expect(formationBlockBox.y).toBeGreaterThanOrEqual(formationLaneBox.y);
  expect(formationBlockBox.y + formationBlockBox.height).toBeLessThanOrEqual(formationLaneBox.y + formationLaneBox.height);
  expect(timelineBox.y + timelineBox.height).toBeLessThanOrEqual(actionRailBox.y);
}

async function expectTimelineContentUnclipped(page) {
  const violations = await page.locator("[data-stitch-mobile-editor] .timeline-workbench").evaluate((workbench) => {
    const within = (parent, child) => {
      const parentBox = parent.getBoundingClientRect();
      const childBox = child.getBoundingClientRect();
      return (
        childBox.top >= parentBox.top - 0.5 &&
        childBox.bottom <= parentBox.bottom + 0.5 &&
        childBox.left >= parentBox.left - 0.5 &&
        childBox.right <= parentBox.right + 0.5
      );
    };
    const withinY = (parent, child) => {
      const parentBox = parent.getBoundingClientRect();
      const childBox = child.getBoundingClientRect();
      return childBox.top >= parentBox.top - 0.5 && childBox.bottom <= parentBox.bottom + 0.5;
    };
    const violations = [];
    const timelineEditor = workbench.closest(".timeline-editor");
    const labels = workbench.querySelectorAll(".timeline-row-label");
    const rulerLane = workbench.querySelector(".timeline-ruler-viewport");
    const formationLane = workbench.querySelector(".timeline-lane");
    const audioLane = workbench.querySelector(".audio-lane");
    const formationBlock = workbench.querySelector(".formation-block.segment");
    const audioContent = audioLane?.querySelector(".audio-waveform, .timeline-empty-audio");
    for (const label of labels) {
      if (timelineEditor && !within(timelineEditor, label)) violations.push(`label ${label.textContent || "ruler"}`);
    }
    if (rulerLane && !within(workbench, rulerLane)) violations.push("ruler lane");
    if (formationLane && !within(workbench, formationLane)) violations.push("formation lane");
    if (audioLane && !within(workbench, audioLane)) violations.push("audio lane");
    if (formationLane && formationBlock && !withinY(formationLane, formationBlock)) violations.push("formation block");
    if (audioLane && audioContent && !withinY(audioLane, audioContent)) violations.push("audio content");
    for (const child of formationBlock?.children || []) {
      if (!within(formationBlock, child)) violations.push(`block child ${child.tagName}`);
    }
    return violations;
  });

  expect(violations).toEqual([]);
}

async function expectAudioLaneHasNoLegacyBadge(page) {
  const audioPseudoMetrics = await page.locator("[data-stitch-mobile-editor] .audio-lane").evaluate((lane) => {
    const before = window.getComputedStyle(lane, "::before");
    const after = window.getComputedStyle(lane, "::after");
    return {
      beforeDisplay: before.display,
      beforeContent: before.content,
      afterDisplay: after.display,
      afterContent: after.content
    };
  });
  expect(audioPseudoMetrics.beforeDisplay).toBe("none");
  expect(audioPseudoMetrics.beforeContent).toBe("none");
  expect(audioPseudoMetrics.afterDisplay).toBe("none");
  expect(audioPseudoMetrics.afterContent).toBe("none");
}

async function expectRulerLooksLikeTimeStrip(page) {
  const rulerStyle = await page.locator("[data-stitch-mobile-editor] .timeline-ruler-viewport").evaluate((ruler) => {
    const style = window.getComputedStyle(ruler);
    const playhead = ruler.querySelector(".timeline-playhead");
    const playheadStyle = playhead ? window.getComputedStyle(playhead) : null;
    const playheadCapStyle = playhead ? window.getComputedStyle(playhead, "::before") : null;
    const playheadAfterStyle = playhead ? window.getComputedStyle(playhead, "::after") : null;
    return {
      backgroundColor: style.backgroundColor,
      borderTopWidth: style.borderTopWidth,
      borderBottomWidth: style.borderBottomWidth,
      overflow: style.overflow,
      playheadWidth: playheadStyle?.width || "",
      playheadBackground: playheadStyle?.backgroundColor || "",
      playheadCapDisplay: playheadCapStyle?.display || "",
      playheadCapContent: playheadCapStyle?.content || "",
      playheadAfterDisplay: playheadAfterStyle?.display || "",
      playheadAfterContent: playheadAfterStyle?.content || ""
    };
  });

  expect(rulerStyle.backgroundColor).toBe("rgba(0, 0, 0, 0)");
  expect(rulerStyle.borderTopWidth).toBe("0px");
  expect(rulerStyle.borderBottomWidth).toBe("0px");
  expect(rulerStyle.overflow).toBe("hidden");
  expect(Number.parseFloat(rulerStyle.playheadWidth)).toBeGreaterThanOrEqual(1.5);
  expect(rulerStyle.playheadBackground).not.toBe("rgb(5, 231, 119)");
  expect(rulerStyle.playheadCapDisplay).toBe("none");
  expect(rulerStyle.playheadCapContent).toBe("none");
  expect(rulerStyle.playheadAfterDisplay).toBe("none");
  expect(rulerStyle.playheadAfterContent).toBe("none");
}

async function expectPlayheadExtendsAcrossTracks(page) {
  const playheadMetrics = await page.locator("[data-stitch-mobile-editor] .timeline-playhead").evaluateAll((nodes) =>
    nodes.map((node) => {
      const rect = node.getBoundingClientRect();
      const style = window.getComputedStyle(node);
      return {
        height: rect.height,
        width: rect.width,
        background: style.backgroundColor
      };
    })
  );

  expect(playheadMetrics.length).toBeGreaterThanOrEqual(3);
  for (const metric of playheadMetrics) {
    expect(metric.height).toBeGreaterThanOrEqual(9);
    expect(metric.width).toBeGreaterThanOrEqual(1.5);
    expect(metric.background).not.toBe("rgba(0, 0, 0, 0)");
  }
}

async function expectFormationBlockTextVisible(page) {
  const blockPseudoMetrics = await page.locator("[data-stitch-mobile-editor] .formation-block.hold").first().evaluate((block) => {
    const before = window.getComputedStyle(block, "::before");
    const after = window.getComputedStyle(block, "::after");
    return {
      beforeDisplay: before.display,
      beforeContent: before.content,
      afterDisplay: after.display,
      afterContent: after.content
    };
  });
  expect(blockPseudoMetrics.beforeDisplay).toBe("none");
  expect(blockPseudoMetrics.beforeContent).toBe("none");
  expect(blockPseudoMetrics.afterDisplay).toBe("none");
  expect(blockPseudoMetrics.afterContent).toBe("none");

  const blockTextMetrics = await page.locator("[data-stitch-mobile-editor] .formation-block.hold").evaluateAll((blocks) =>
    blocks.slice(0, 3).map((block) => {
      const metrics = {};
      for (const selector of ["span", "strong", "em"]) {
        const node = block.querySelector(selector);
        const style = node ? window.getComputedStyle(node) : null;
        metrics[selector] = {
          text: node?.textContent || "",
          display: style?.display || "",
          clientWidth: node?.clientWidth || 0,
          scrollWidth: node?.scrollWidth || 0,
          clientHeight: node?.clientHeight || 0,
          scrollHeight: node?.scrollHeight || 0,
          contained: node ? (() => {
            const nodeRect = node.getBoundingClientRect();
            const blockRect = block.getBoundingClientRect();
            return (
              nodeRect.top >= blockRect.top - 0.5 &&
              nodeRect.bottom <= blockRect.bottom + 0.5 &&
              nodeRect.left >= blockRect.left - 0.5 &&
              nodeRect.right <= blockRect.right + 0.5
            );
          })() : false
        };
      }
      return metrics;
    })
  );

  expect(blockTextMetrics.length).toBeGreaterThanOrEqual(3);
  for (const metrics of blockTextMetrics) {
    for (const selector of ["span", "strong", "em"]) {
      expect(metrics[selector].text.length).toBeGreaterThan(0);
      expect(metrics[selector].display).not.toBe("none");
      expect(metrics[selector].clientHeight).toBeGreaterThan(0);
      expect(metrics[selector].scrollHeight).toBeLessThanOrEqual(metrics[selector].clientHeight + 1);
      expect(metrics[selector].contained).toBe(true);
    }
  }

  const pauseBlock = blockTextMetrics.find((metrics) => metrics.strong.text === "Pause");
  if (pauseBlock) {
    expect(pauseBlock.strong.scrollWidth).toBeLessThanOrEqual(pauseBlock.strong.clientWidth + 2);
    expect(pauseBlock.em.scrollWidth).toBeLessThanOrEqual(pauseBlock.em.clientWidth + 2);
  }
}

async function expectFormationSelectionControls(page) {
  const firstBlock = page.locator("[data-stitch-mobile-editor] .formation-block.hold").first();
  await firstBlock.click();
  await expect(firstBlock).toHaveClass(/selected/);
  await expect(firstBlock.locator(".formation-resize-handle.right")).toBeVisible();

  const secondBlock = page.locator("[data-stitch-mobile-editor] .formation-block.hold").nth(1);
  if (await secondBlock.count()) {
    await secondBlock.click();
    await expect(secondBlock).toHaveClass(/selected/);
    await expect(firstBlock).not.toHaveClass(/selected/);
  }

  const laneBox = await page.locator("[data-stitch-mobile-editor] .audio-lane").boundingBox();
  expect(laneBox).not.toBeNull();
  await page.locator("[data-stitch-mobile-editor] .audio-lane").click({ position: { x: 20, y: Math.min(20, laneBox.height - 4) } });
  await expect(page.locator("[data-stitch-mobile-editor] .formation-block.selected")).toHaveCount(0);
}

async function expectCompactStage(page) {
  await expect(page.locator("[data-stitch-mobile-editor] .stage-toolbar")).toHaveCount(0);
  const frameBox = await page.locator("[data-stitch-mobile-editor] .stage-frame").boundingBox();
  expect(frameBox).not.toBeNull();
  expect(frameBox.height).toBeLessThanOrEqual(352);
  const tokenVisualMetrics = await page.locator("[data-stitch-mobile-editor] .token").first().evaluate((token) => {
    const svg = token.ownerSVGElement;
    const svgBox = svg.getBoundingClientRect();
    const viewBox = svg.viewBox.baseVal;
    const scale = svgBox.width / viewBox.width;
    const circles = [...token.querySelectorAll("circle")];
    const visibleCircle = circles.find((circle) => {
      const fill = circle.getAttribute("fill");
      return fill && fill !== "transparent";
    });
    const selectedRing = circles.find((circle) => circle.classList.contains("stitch-token-ring"));
    const strokeWidth = Number(visibleCircle?.getAttribute("stroke-width") || 0);
    const computedStrokeWidth = Number.parseFloat(window.getComputedStyle(visibleCircle).strokeWidth || "0");
    const radius = Number(visibleCircle?.getAttribute("r") || 0);
    const selectedRingStrokeWidth = Number(selectedRing?.getAttribute("stroke-width") || 0);
    const selectedRingRadius = Number(selectedRing?.getAttribute("r") || 0);

    return {
      radius,
      strokeWidth,
      computedStrokeWidth,
      paintedPixelDiameter: (radius * 2 + strokeWidth) * scale,
      selectedRingFill: selectedRing ? window.getComputedStyle(selectedRing).fill : "",
      selectedRingPixelDiameter: selectedRing
        ? (selectedRingRadius * 2 + selectedRingStrokeWidth) * scale
        : 0
    };
  });
  expect(tokenVisualMetrics.radius).toBeGreaterThanOrEqual(0.18);
  expect(tokenVisualMetrics.radius).toBeLessThanOrEqual(0.45);
  expect(tokenVisualMetrics.strokeWidth).toBeLessThanOrEqual(0.12);
  expect(tokenVisualMetrics.computedStrokeWidth).toBeCloseTo(tokenVisualMetrics.strokeWidth, 3);
  expect(tokenVisualMetrics.paintedPixelDiameter).toBeLessThanOrEqual(24);
  if (tokenVisualMetrics.selectedRingPixelDiameter > 0) {
    expect(tokenVisualMetrics.selectedRingFill).toBe("none");
  }
  expect(tokenVisualMetrics.selectedRingPixelDiameter).toBeLessThanOrEqual(32);
  const tokenLabelMetrics = await page.locator("[data-stitch-mobile-editor] .token text").first().evaluate((node) => ({
    attributeFontSize: Number(node.getAttribute("font-size")),
    computedFontSize: Number.parseFloat(getComputedStyle(node).fontSize)
  }));
  expect(tokenLabelMetrics.computedFontSize).toBeCloseTo(tokenLabelMetrics.attributeFontSize, 3);
  expect(tokenLabelMetrics.computedFontSize).toBeLessThanOrEqual(0.6);
}

test.describe("Stitch main editor visual states", () => {
  test("captures mobile idle, timeline, formation, token, and menu states at 390px", async ({ browser }) => {
    let page = await openSampleEditor(browser);
    await expect(page.locator(".app")).toHaveAttribute("data-selection-state", "idle");
    await expect(page.locator(".app")).toHaveAttribute("data-timeline-state", "visible");
    await expectCompactStage(page);
    await expectOrderedMobileBands(page);
    await expectTimelineTrimSpace(page);
    await expectTimelineContentUnclipped(page);
    await expectAudioLaneHasNoLegacyBadge(page);
    await expectRulerLooksLikeTimeStrip(page);
    await expectPlayheadExtendsAcrossTracks(page);
    await expectFormationBlockTextVisible(page);
    await expectFormationSelectionControls(page);
    await expectVisibleMeterGrid(page);
    await expectSingleActionRail(page);
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: "test-results/stitch-editor-mobile-idle-390.png", fullPage: false });
    await page.screenshot({ path: "test-results/stitch-editor-mobile-timeline-390.png", fullPage: false });
    await page.close();

    page = await openSampleEditor(browser);
    await page.locator(".formation-block.segment").first().click();
    await expect(page.locator(".formation-block.selected")).toBeVisible();
    await expect(page.locator(".formation-block.selected .formation-resize-handle.right")).toBeVisible();
    await expectOrderedMobileBands(page);
    await expectTimelineTrimSpace(page);
    await expectTimelineContentUnclipped(page);
    await expectAudioLaneHasNoLegacyBadge(page);
    await expectVisibleMeterGrid(page);
    await expectSingleActionRail(page);
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: "test-results/stitch-editor-mobile-formation-selected-390.png", fullPage: false });
    await page.close();

    page = await openSampleEditor(browser);
    const firstToken = page.locator("[data-stitch-mobile-editor] .token").first();
    const firstTokenBox = await firstToken.boundingBox();
    expect(firstTokenBox).not.toBeNull();
    await firstToken.dispatchEvent("pointerdown", {
      pointerId: 31,
      pointerType: "touch",
      isPrimary: true,
      bubbles: true,
      cancelable: true,
      clientX: firstTokenBox.x + firstTokenBox.width / 2,
      clientY: firstTokenBox.y + firstTokenBox.height / 2,
      buttons: 1
    });
    await expect(page.locator(".app")).toHaveAttribute("data-selection-state", "token-selected");
    await expectCompactStage(page);
    await expect(page.locator(".mobile-bottom-sheet")).toHaveCount(0);
    await expectOrderedMobileBands(page);
    await expectVisibleMeterGrid(page);
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: "test-results/stitch-editor-mobile-token-selected-390.png", fullPage: false });
    await page.close();

    page = await openSampleEditor(browser);
    await page.locator(".mobile-global-actions").getByRole("button", { name: "더보기" }).click();
    await expect(page.locator(".app")).toHaveAttribute("data-menu-state", "expanded");
    await expect(page.locator(".mobile-global-actions .more-action-menu")).toBeVisible();
    await expectOrderedMobileBands(page);
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: "test-results/stitch-editor-mobile-menu-390.png", fullPage: false });
    await page.close();

    page = await openStitchMock(browser);
    await expectCompactStage(page);
    await expectPortraitMeterStage(page);
    await expectOrderedMobileBands(page);
    await expectTimelineTrimSpace(page);
    await expectTimelineContentUnclipped(page);
    await expectAudioLaneHasNoLegacyBadge(page);
    await expectRulerLooksLikeTimeStrip(page);
    await expectPlayheadExtendsAcrossTracks(page);
    await expectFormationBlockTextVisible(page);
    await expectFormationSelectionControls(page);
    await expectSingleActionRail(page);
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: "test-results/stitch-editor-mobile-mock-390.png", fullPage: false });
    await page.close();
  });
});
