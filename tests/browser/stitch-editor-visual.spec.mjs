import { expect, test } from "@playwright/test";

function seededRouteProject({ viewEnabled = true, editEnabled = true, editToken = "valid" } = {}) {
  const performers = [
    { id: "a1", label: "A1", name: "A1", role: "groupA", color: "#2457c5" },
    { id: "a2", label: "A2", name: "A2", role: "groupA", color: "#3478f6" },
    { id: "b1", label: "B1", name: "B1", role: "groupB", color: "#c0265f" }
  ];
  return {
    title: "Editor Route Fixture",
    performanceType: "mixed",
    performers,
    partnerSets: [],
    stage: { width: 12, height: 8 },
    frontZone: { y: 5.6 },
    owner: { sessionId: "owner_fixture", createdAt: "2026-06-08T00:00:00.000Z" },
    account: { plan: "free" },
    cloudProjectId: "project-1",
    shareLinks: {
      view: { projectId: "project-1", token: "", enabled: viewEnabled },
      edit: { projectId: "project-1", token: editToken, enabled: editEnabled }
    },
    sections: [
      {
        id: "s1",
        name: "Intro",
        time: 4,
        moveDuration: 0,
        start: 4,
        end: 4,
        moveMode: "hold",
        notes: "시작",
        frontFocus: [],
        partnerSetId: "",
        positions: { a1: { x: 2, y: 2 }, a2: { x: 4, y: 2 }, b1: { x: 6, y: 2 } }
      },
      {
        id: "s2",
        name: "Cross",
        time: 12,
        moveDuration: 4,
        start: 8,
        end: 12,
        moveMode: "smooth",
        notes: "교차",
        frontFocus: [],
        partnerSetId: "",
        positions: { a1: { x: 8, y: 6 }, a2: { x: 5, y: 4 }, b1: { x: 7, y: 5 } }
      }
    ],
    updatedAt: "2026-06-08T00:00:00.000Z"
  };
}

async function routeCloudProject(page, plan) {
  await page.route("**/rest/v1/rpc/get_project_by_edit_token", async (route) => {
    const payload = route.request().postDataJSON?.() || {};
    await route.fulfill({ json: payload.p_token === plan.shareLinks?.edit?.token ? { id: "project-1", plan } : null });
  });
  await page.route("**/rest/v1/movemap_projects**", async (route) => {
    await route.fulfill({ json: [{ id: "project-1", plan }] });
  });
  await page.route("**/rest/v1/choreo_projects**", async (route) => {
    await route.fulfill({ json: [] });
  });
}

async function openSampleEditor(browser) {
  return openStitchMock(browser);
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

function collectBrowserIssues(page) {
  const issues = [];
  const shouldIgnore = (text) => text.includes("net::ERR_NETWORK_CHANGED");
  page.on("console", (message) => {
    const text = `${message.type()}: ${message.text()}`;
    if (message.type() === "error" && !shouldIgnore(text)) issues.push(text);
  });
  page.on("pageerror", (error) => {
    const text = `pageerror: ${error.message}`;
    if (!shouldIgnore(text)) issues.push(text);
  });
  return issues;
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

async function expectStitchMobileBaseline(page, selector = "[data-stitch-mobile-editor]") {
  const editor = page.locator(selector);
  await expect(editor.locator(".stitch-topbar")).toBeVisible();
  await expect(editor.locator(".stitch-stage-canvas")).toBeVisible();
  await expect(editor.locator(".stitch-stage-zoom-rail")).toBeVisible();
  await expect(editor.locator(".stitch-audience-label")).toContainText("관객");
  await expect(editor.locator(".token")).not.toHaveCount(0);
  await expect(editor.locator(".stitch-timecode")).toBeVisible();
  await expect(editor.locator(".formation-block.hold")).not.toHaveCount(0);
  await expect(editor.locator(".audio-lane")).toBeVisible();
  await expect(editor.locator(".audio-waveform")).toBeVisible();
  await expect(editor.locator(".mobile-action-bar")).toBeVisible();

  const metrics = await editor.evaluate((root) => {
    const rectFor = (selector) => {
      const node = root.querySelector(selector);
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      return { height: rect.height, width: rect.width, top: rect.top, bottom: rect.bottom };
    };
    return {
      stage: rectFor(".stage-frame"),
      timeline: rectFor(".timeline-editor"),
      rail: rectFor(".mobile-action-bar"),
      root: rectFor(":scope")
    };
  });
  expect(metrics.stage.height).toBeGreaterThan(metrics.timeline.height);
  expect(metrics.timeline.height).toBeGreaterThanOrEqual(180);
  expect(metrics.timeline.height).toBeLessThanOrEqual(250);
  expect(metrics.rail.height).toBeGreaterThanOrEqual(56);
}

async function dragElementHorizontally(page, locator, deltaX) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + deltaX, box.y + box.height / 2, { steps: 8 });
  await page.mouse.up();
}

test.describe("Stitch main editor visual states", () => {
  test("share and edit link routes keep V2 route behavior", async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await routeCloudProject(page, seededRouteProject());
    await page.goto("/share/project-1");
    const shareRoot = page.locator("[data-v2-visual-editor]");
    await expect(shareRoot).toBeVisible();
    await expect(page.getByRole("button", { name: "저장" })).toHaveCount(0);
    await expect(shareRoot.locator("[data-v2-segment-kind='hold']")).toHaveCount(2);
    await expect(shareRoot.locator("[data-v2-action-bar]").getByRole("button", { name: "대형 추가" })).toBeDisabled();

    await page.goto("/edit/project-1?token=valid");
    await expect(page.getByText(/편집 링크 토큰이 맞지 않아/)).toHaveCount(0);
    const editRoot = page.locator("[data-v2-visual-editor]");
    await expect(editRoot).toBeVisible();
    await expect(editRoot.locator(".v2-topbar")).toBeVisible();
    await expect(editRoot.locator("[data-v2-action-bar]").getByRole("button", { name: "대형 추가" })).toBeEnabled();

    await page.goto("/edit/project-1?token=bad");
    await expect(page.getByText(/편집 링크 토큰이 맞지 않아/)).toBeVisible();
    await expect(page.getByRole("button", { name: "저장" })).toHaveCount(0);

    await routeCloudProject(page, seededRouteProject({ viewEnabled: false }));
    await page.goto("/share/project-1");
    await expect(page.getByText(/소유자가 이 보기 링크를 꺼두었습니다/)).toBeVisible();
    await expect(page.getByRole("button", { name: "저장" })).toHaveCount(0);
    await page.close();
  });

  test("captures mobile idle, timeline, formation, token, and menu states at 390px", async ({ browser }) => {
    let page = await openSampleEditor(browser);
    await expectStitchMobileBaseline(page, "[data-stitch-mobile-editor]");
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: "test-results/stitch-editor-mobile-idle-390.png", fullPage: false });
    await page.screenshot({ path: "test-results/stitch-editor-mobile-timeline-390.png", fullPage: false });
    await page.close();

    page = await openSampleEditor(browser);
    await page.locator(".formation-block.hold").first().click();
    await expect(page.locator(".formation-block.selected")).toBeVisible();
    await expect(page.locator(".formation-block.selected .formation-resize-handle.right")).toBeVisible();
    await expectStitchMobileBaseline(page, "[data-stitch-mobile-editor]");
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
    await expectStitchMobileBaseline(page, "[data-stitch-mobile-editor]");
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: "test-results/stitch-editor-mobile-token-selected-390.png", fullPage: false });
    await page.close();

    page = await openSampleEditor(browser);
    await expect(page.locator(".stitch-topbar").getByRole("button", { name: "더보기" })).toBeVisible();
    await expectStitchMobileBaseline(page, "[data-stitch-mobile-editor]");
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: "test-results/stitch-editor-mobile-menu-390.png", fullPage: false });
    await page.close();

    page = await openStitchMock(browser);
    await expectStitchMobileBaseline(page, "[data-stitch-mobile-editor]");
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: "test-results/stitch-editor-mobile-mock-390.png", fullPage: false });
    await page.close();
  });
});
