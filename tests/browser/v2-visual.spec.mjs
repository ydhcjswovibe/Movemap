import { expect, test } from "@playwright/test";

const STORAGE_KEY = "movemap-project";
const LEGACY_STORAGE_KEY = "choreo-stage-planner-project";
const V2_TIMELINE_PIXELS_PER_SECOND = 56;
const V2_TIMELINE_TIME_STEP = 0.1;

function seededV2Project() {
  const performers = [
    { id: "a1", label: "A1", name: "A1", role: "groupA", color: "#2457c5" },
    { id: "a2", label: "A2", name: "A2", role: "groupA", color: "#3478f6" },
    { id: "b1", label: "B1", name: "B1", role: "groupB", color: "#c0265f" },
    { id: "b2", label: "B2", name: "B2", role: "groupB", color: "#e84a7f" }
  ];
  return {
    title: "V2 Connected Fixture",
    performanceType: "mixed",
    performers,
    partnerSets: [],
    stage: { width: 12, height: 8 },
    frontZone: { y: 5.6 },
    stageReferences: [],
    owner: { sessionId: "owner_fixture", createdAt: "2026-06-08T00:00:00.000Z" },
    account: { plan: "free" },
    shareLinks: {
      view: { projectId: "", token: "", enabled: true },
      edit: { projectId: "", token: "", enabled: true }
    },
    sections: [
      {
        id: "intro",
        name: "Intro V",
        time: 0,
        moveDuration: 0,
        start: 0,
        end: 0,
        moveMode: "hold",
        notes: "시작",
        frontFocus: [],
        partnerSetId: "",
        positions: {
          a1: { x: 2, y: 2 },
          a2: { x: 4, y: 2 },
          b1: { x: 6, y: 2 },
          b2: { x: 8, y: 2 }
        }
      },
      {
        id: "diamond",
        name: "Diamond Form",
        time: 12,
        moveDuration: 4,
        start: 8,
        end: 12,
        moveMode: "smooth",
        notes: "교차",
        frontFocus: [],
        partnerSetId: "",
        positions: {
          a1: { x: 6, y: 2 },
          a2: { x: 4, y: 4 },
          b1: { x: 8, y: 4 },
          b2: { x: 6, y: 6 }
        }
      }
    ],
    updatedAt: "2026-06-08T00:00:00.000Z"
  };
}

function seededLongTimelineProject() {
  const project = seededV2Project();
  return {
    ...project,
    title: "V2 Long Timeline Fixture",
    sections: [
      {
        ...project.sections[0],
        id: "intro",
        name: "Intro V",
        time: 0,
        moveDuration: 0,
        start: 0,
        end: 0
      },
      {
        ...project.sections[1],
        id: "wide",
        name: "Wide Cross",
        time: 36,
        moveDuration: 8,
        start: 28,
        end: 36
      },
      {
        ...project.sections[1],
        id: "finale",
        name: "Finale Stack",
        time: 84,
        moveDuration: 12,
        start: 72,
        end: 84,
        positions: {
          a1: { x: 3, y: 3 },
          a2: { x: 5, y: 5 },
          b1: { x: 7, y: 5 },
          b2: { x: 9, y: 3 }
        }
      }
    ]
  };
}

function seededWaveformProject() {
  const project = seededV2Project();
  return {
    ...project,
    audio: {
      fileName: "fixture-song.mp3",
      size: 123456,
      type: "audio/mpeg",
      fingerprint: "fixture-song-123456",
      waveform: {
        version: 1,
        samplesPerSecond: 2,
        duration: 2,
        fingerprint: "fixture-song-123456",
        generatedAt: "2026-06-11T00:00:00.000Z",
        peaks: [0, 128, 255, 64]
      }
    }
  };
}

function seededLongWaveformProject() {
  const project = seededLongTimelineProject();
  return {
    ...project,
    audio: {
      fileName: "long-fixture-song.mp3",
      size: 987654,
      type: "audio/mpeg",
      fingerprint: "long-fixture-song-987654",
      waveform: {
        version: 1,
        samplesPerSecond: 10,
        duration: 90,
        fingerprint: "long-fixture-song-987654",
        generatedAt: "2026-06-11T00:00:00.000Z",
        peaks: Array.from({ length: 900 }, (_, index) => index % 256)
      }
    }
  };
}

function seededCompactMoveProject() {
  const project = seededV2Project();
  return {
    ...project,
    sections: [
      project.sections[0],
      {
        ...project.sections[1],
        time: 6,
        moveDuration: 2,
        start: 4,
        end: 6
      }
    ]
  };
}

async function seedProject(page, project = seededV2Project()) {
  await page.addInitScript(({ storageKey, legacyStorageKey, plan }) => {
    localStorage.setItem(storageKey, JSON.stringify(plan));
    localStorage.removeItem(legacyStorageKey);
  }, { storageKey: STORAGE_KEY, legacyStorageKey: LEGACY_STORAGE_KEY, plan: project });
}

async function routeCloudProject(page, plan, projectId = "v2-edit-project") {
  await page.route("**/rest/v1/rpc/get_project_by_edit_token", async (route) => {
    const payload = route.request().postDataJSON?.() || {};
    await route.fulfill({ json: payload.p_token === plan.shareLinks?.edit?.token ? { id: projectId, plan } : null });
  });
  await page.route("**/rest/v1/movemap_projects**", async (route) => {
    await route.fulfill({ json: [{ id: projectId, plan }] });
  });
  await page.route("**/rest/v1/choreo_projects**", async (route) => {
    await route.fulfill({ json: [] });
  });
}

async function expectInsideViewport(page, locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(page.viewportSize().height + 1);
}

async function storedProject(page) {
  return page.evaluate((storageKey) => JSON.parse(localStorage.getItem(storageKey)), STORAGE_KEY);
}

async function waveformSampleHeights(root) {
  return root.locator("[data-v2-waveform] span:not(.v2-track-playhead)").evaluateAll((nodes) => (
    nodes.slice(0, 8).map((node) => getComputedStyle(node).getPropertyValue("--sample-height").trim())
  ));
}

async function touchDrag(page, locator, deltaX, deltaY = 0, steps = 8) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  const x = box.x + Math.min(box.width / 2, 120);
  const y = box.y + box.height / 2;
  const client = await page.context().newCDPSession(page);
  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y, radiusX: 1, radiusY: 1, id: 1 }]
  });
  for (let step = 1; step <= steps; step += 1) {
    await client.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{
        x: x + (deltaX * step) / steps,
        y: y + (deltaY * step) / steps,
        radiusX: 1,
        radiusY: 1,
        id: 1
      }]
    });
  }
  await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

async function mouseDragAt(page, box, startOffsetX, startOffsetY, deltaX, deltaY = 0, steps = 6) {
  const startX = box.x + startOffsetX;
  const startY = box.y + startOffsetY;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + deltaX, startY + deltaY, { steps });
  await page.mouse.up();
}

async function pointerDragAt(locator, box, startOffsetX, startOffsetY, deltaX, deltaY = 0, pointerType = "touch", steps = 6) {
  const pointerId = pointerType === "touch" ? 701 : 702;
  const startX = box.x + startOffsetX;
  const startY = box.y + startOffsetY;
  await locator.dispatchEvent("pointerdown", {
    bubbles: true,
    button: 0,
    buttons: 1,
    clientX: startX,
    clientY: startY,
    isPrimary: true,
    pointerId,
    pointerType
  });
  for (let step = 1; step <= steps; step += 1) {
    await locator.dispatchEvent("pointermove", {
      bubbles: true,
      button: 0,
      buttons: 1,
      clientX: startX + (deltaX * step) / steps,
      clientY: startY + (deltaY * step) / steps,
      isPrimary: true,
      pointerId,
      pointerType
    });
  }
  await locator.dispatchEvent("pointerup", {
    bubbles: true,
    button: 0,
    buttons: 0,
    clientX: startX + deltaX,
    clientY: startY + deltaY,
    isPrimary: true,
    pointerId,
    pointerType
  });
}

async function expectPlayheadChangesAfter(page, root, action) {
  const playhead = root.locator('[data-v2-playhead="formation"]');
  const before = await playhead.evaluate((node) => getComputedStyle(node).left);
  await action();
  await expect.poll(() => playhead.evaluate((node) => getComputedStyle(node).left)).not.toBe(before);
}

async function v2TimelineNavigationState(root) {
  return root.locator(".v2-formation-lane .v2-timeline-viewport").evaluate((viewport) => {
    const content = viewport.querySelector(".v2-timeline-content");
    const playhead = viewport.querySelector('[data-v2-playhead="formation"]');
    const rect = viewport.getBoundingClientRect();
    const playheadRect = playhead?.getBoundingClientRect();
    const transform = content ? getComputedStyle(content).transform : "";
    const matrix = transform && transform !== "none" ? new DOMMatrixReadOnly(transform) : null;
    return {
      transform,
      scrollX: matrix ? -matrix.m41 : 0,
      playheadLeft: playhead ? getComputedStyle(playhead).left : "",
      playheadViewportX: playheadRect ? playheadRect.left - rect.left : null,
      playheadCenterOffset: playheadRect ? (playheadRect.left + playheadRect.width / 2) - (rect.left + rect.width / 2) : null,
      timecode: viewport.closest("[data-v2-visual-editor]")?.querySelector(".v2-timecode")?.textContent || ""
    };
  });
}

function secondsFromV2Timecode(label) {
  const parts = String(label || "").match(/\d+/g)?.map(Number) || [];
  if (parts.length >= 4) return parts[0] * 3600 + parts[1] * 60 + parts[2] + parts[3] / 100;
  if (parts.length >= 3) return parts[0] * 60 + parts[1] + parts[2] / 10;
  return 0;
}

async function expectV2TimelineScrubs(root, action) {
  const before = await v2TimelineNavigationState(root);
  await action();
  await expect.poll(async () => (await v2TimelineNavigationState(root)).timecode).not.toBe(before.timecode);
  await expect.poll(async () => (await v2TimelineNavigationState(root)).playheadLeft).not.toBe(before.playheadLeft);
}

async function expectV2TimelinePansWithoutScrub(page, root, action) {
  const timingBefore = await v2TimingSnapshot(page);
  const before = await v2TimelineNavigationState(root);
  await action();
  await expect.poll(async () => (await v2TimelineNavigationState(root)).transform).not.toBe(before.transform);
  const after = await v2TimelineNavigationState(root);
  expect(after.timecode).toBe(before.timecode);
  expect(await v2TimingSnapshot(page)).toEqual(timingBefore);
}

async function v2TimingSnapshot(page) {
  const project = await storedProject(page);
  if (project?.sections) {
    return project.sections.map((section) => ({
      id: section.id,
      time: section.time,
      start: section.start,
      end: section.end,
      moveDuration: section.moveDuration
    }));
  }
  return page.locator("[data-v2-visual-editor]").evaluate((root) => (
    Array.from(root.querySelectorAll("[data-v2-formation-block]")).map((block) => ({
      id: block.getAttribute("data-v2-formation-block"),
      kind: block.getAttribute("data-v2-segment-kind"),
      left: block.style.getPropertyValue("--segment-left"),
      width: block.style.getPropertyValue("--segment-width")
    }))
  ));
}

async function expectNoV2CompetingTimelineGesture(root) {
  await expect(root.locator("[data-v2-reorder-preview]")).toHaveCount(0);
  await expect(root.locator(".v2-floating-block-preview")).toHaveCount(0);
  await expect(root.locator("[data-v2-drop-action]")).toHaveCount(0);
}

async function v2TimelineHandleHitMap(page, selector, offsets = [-16, -8, 0, 8, 16]) {
  return page.evaluate(({ selector, offsets }) => {
    const handle = document.querySelector(selector);
    const handleRect = handle?.getBoundingClientRect();
    if (!handleRect) return [];
    const centerX = handleRect.left + handleRect.width / 2;
    const centerY = handleRect.top + handleRect.height / 2;
    return offsets.map((offset) => {
      const hit = document.elementFromPoint(centerX + offset, centerY);
      return {
        offset,
        hitHandle: hit?.getAttribute("data-v2-timeline-handle") || "",
        hitSectionId: hit?.getAttribute("data-v2-section-id") || "",
        hitSegmentKind: hit?.closest?.("[data-v2-segment-kind]")?.getAttribute("data-v2-segment-kind") || ""
      };
    });
  }, { selector, offsets });
}

async function v2ScrubState(page, root) {
  return {
    timecode: await root.locator(".v2-timecode").textContent(),
    playhead: await root.locator('[data-v2-playhead="formation"]').evaluate((node) => getComputedStyle(node).left),
    audioTime: await page.evaluate(() => document.querySelector("audio")?.currentTime ?? null),
    undoDisabled: await root.getByRole("button", { name: "실행 취소" }).isDisabled()
  };
}

async function expectV2ScrubWithoutMutation(page, root, action) {
  const timingBefore = await v2TimingSnapshot(page);
  const before = await v2ScrubState(page, root);
  await action();
  await expect.poll(() => v2ScrubState(page, root)).toMatchObject({
    undoDisabled: before.undoDisabled
  });
  const after = await v2ScrubState(page, root);
  expect(after.timecode).not.toBe(before.timecode);
  expect(after.playhead).not.toBe(before.playhead);
  if (after.audioTime !== null && before.audioTime !== null) {
    expect(after.audioTime).not.toBe(before.audioTime);
  }
  expect(await v2TimingSnapshot(page)).toEqual(timingBefore);
}

test.describe("connected v2 editor route", () => {
  test("renders real App project state and connected timeline at 390px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedProject(page);
    await page.goto("/v2");

    const root = page.locator("[data-v2-visual-editor]");
    const stage = page.locator("[data-v2-stage]");
    const timeline = page.locator("[data-v2-timeline]");
    const bottomRail = page.locator("[data-v2-bottom-rail]");

    await expect(root).toBeVisible();
    await expect(page.getByRole("heading", { name: "V2 Connected Fixture" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Finale Scene" })).toHaveCount(0);
    await expect(root.getByText("Saved")).toBeVisible();
    await expect(stage).toBeVisible();
    await expect(timeline).toBeVisible();
    await expect(bottomRail).toBeVisible();
    await expect(root.locator(".v2-zoom-rail")).toHaveCount(0);
    await expect(timeline.getByRole("button", { name: "타임라인 확대" })).toHaveText("+");
    await expect(timeline.getByRole("button", { name: "타임라인 축소" })).toHaveText("-");
    await expect(timeline.getByRole("button", { name: "대형 추가" })).toBeVisible();
    await expect(timeline.getByRole("button", { name: "음악 추가" })).toBeVisible();
    await expect(timeline.locator("[data-v2-waveform] span:not(.v2-track-playhead)")).toHaveCount(96);
    await expect(root.getByText("BPM")).toHaveCount(0);
    const infoLine = root.locator("[data-v2-stage-info-line]");
    await expect(infoLine).toBeVisible();
    await expect(infoLine).toContainText("Snap on · 12x8 · 1m grid");

    const tokenA1 = root.locator('[data-v2-performer-token="a1"]');
    const tokenB2 = root.locator('[data-v2-performer-token="b2"]');
    await expect(tokenA1).toHaveAttribute("aria-pressed", "false");
    await tokenA1.click();
    await expect(tokenA1).toHaveAttribute("aria-pressed", "true");
    await tokenB2.click();
    await expect(tokenA1).toHaveAttribute("aria-pressed", "false");
    await expect(tokenB2).toHaveAttribute("aria-pressed", "true");
    await expect(infoLine).toContainText("B2 · groupB");

    const introBlock = root.locator('[data-v2-formation-block="intro"][data-v2-segment-kind="hold"]');
    const diamondBlock = root.locator('[data-v2-formation-block="diamond"][data-v2-segment-kind="hold"]');
    const moveBlock = root.locator('[data-v2-formation-block="diamond"][data-v2-segment-kind="move"]');
    await expect(introBlock).toHaveAttribute("aria-pressed", "true");
    await expect(introBlock).toHaveAttribute("data-v2-segment-label", "F1");
    await expect(introBlock).toHaveAttribute("data-v2-segment-duration", "8s");
    await expect(introBlock.locator(".v2-segment-badge")).toHaveText("F1");
    await expect(introBlock.locator(".v2-segment-duration")).toHaveText("8s");
    await expect(moveBlock).toHaveAttribute("data-v2-segment-label", "M1");
    await expect(moveBlock).toHaveAttribute("data-v2-segment-duration", "4s");
    await expect(moveBlock.locator(".v2-segment-badge")).toHaveText("M1");
    await expect(moveBlock.locator(".v2-segment-duration")).toHaveText("4s");
    await expect(diamondBlock).toHaveAttribute("data-v2-segment-label", "F2");
    await expect(diamondBlock).toHaveAttribute("data-v2-segment-duration", "4s");
    await diamondBlock.click();
    await expect(introBlock).toHaveAttribute("aria-pressed", "false");
    await expect(diamondBlock).toHaveAttribute("aria-pressed", "true");
    await expect(tokenB2).toHaveAttribute("aria-pressed", "false");
    await expect(infoLine).toContainText("Diamond Form");

    await expect(root.locator('[data-v2-segment-kind="move"]')).toBeVisible();
    await expect(root.locator('[data-v2-playhead="ruler"]')).toBeVisible();
    await expect(root.locator('[data-v2-playhead="formation"]')).toBeVisible();
    await expect(root.locator('[data-v2-playhead="audio"]')).toBeVisible();
    await expect(root.locator(".v2-ruler span.is-micro")).not.toHaveCount(0);
    await expect(root.locator(".v2-ruler span.is-minor", { hasText: "5s" })).toHaveCount(1);
    await expect(root.locator(".v2-ruler span.is-major", { hasText: "0s" })).toHaveCount(1);
    await tokenB2.click();
    await expect(tokenB2).toHaveAttribute("aria-pressed", "true");
    await expect(infoLine).toContainText("B2 · groupB");

    const boxes = await root.evaluate((node) => {
      const rectFor = (selector) => {
        const rect = node.querySelector(selector)?.getBoundingClientRect();
        return rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height, bottom: rect.bottom, center: rect.y + rect.height / 2 } : null;
      };
      return {
        topbar: rectFor(".v2-topbar"),
        infoLine: rectFor("[data-v2-stage-info-line]"),
        stage: rectFor("[data-v2-stage]"),
        stageSurface: rectFor(".v2-stage-surface"),
        audienceStrip: rectFor(".v2-audience-strip"),
        audienceGuide: rectFor("[data-v2-audience-guide]"),
        transport: rectFor(".v2-transport"),
        playButton: rectFor(".v2-transport .v2-play-button"),
        timecode: rectFor(".v2-timecode"),
        timeline: rectFor("[data-v2-timeline]"),
        ruler: rectFor(".v2-ruler"),
        regularToken: rectFor(".v2-token:not(.is-selected)"),
        regularTokenTransform: getComputedStyle(node.querySelector(".v2-token:not(.is-selected)")).transform,
        selectedToken: rectFor(".v2-token.is-selected"),
        selectedTokenRing: getComputedStyle(node.querySelector(".v2-token.is-selected")).boxShadow,
        selectedTokenTransitionDuration: getComputedStyle(node.querySelector(".v2-token.is-selected")).transitionDuration,
        selectedTokenTransitionProperty: getComputedStyle(node.querySelector(".v2-token.is-selected")).transitionProperty,
        selectedTokenTransform: getComputedStyle(node.querySelector(".v2-token.is-selected")).transform,
        regularHoldTransform: getComputedStyle(node.querySelector('[data-v2-formation-block="intro"][data-v2-segment-kind="hold"]')).transform,
        selectedHoldTransitionDuration: getComputedStyle(node.querySelector('[data-v2-formation-block="diamond"][data-v2-segment-kind="hold"]')).transitionDuration,
        selectedHoldTransitionProperty: getComputedStyle(node.querySelector('[data-v2-formation-block="diamond"][data-v2-segment-kind="hold"]')).transitionProperty,
        selectedHoldTransform: getComputedStyle(node.querySelector('[data-v2-formation-block="diamond"][data-v2-segment-kind="hold"]')).transform,
        moveBlockTransitionProperty: getComputedStyle(node.querySelector(".v2-move-block")).transitionProperty,
        trackAddTransitionProperty: getComputedStyle(node.querySelector(".v2-track-add-button")).transitionProperty,
        bottomIconTransitionProperty: getComputedStyle(node.querySelector("[data-v2-bottom-rail] .v2-icon-button")).transitionProperty,
        formationLane: rectFor(".v2-lane-row"),
        musicLane: rectFor(".v2-audio-row"),
        holdBlock: rectFor('[data-v2-segment-kind="hold"]'),
        moveBlock: rectFor('[data-v2-segment-kind="move"]'),
        waveform: rectFor("[data-v2-waveform]"),
        rail: rectFor("[data-v2-bottom-rail]"),
        viewportHeight: window.innerHeight
      };
    });

    expect(boxes.infoLine.height).toBeGreaterThanOrEqual(28);
    expect(boxes.infoLine.height).toBeLessThanOrEqual(32);
    expect(Math.abs(boxes.infoLine.y - boxes.topbar.bottom)).toBeLessThanOrEqual(1);
    expect(boxes.stageSurface.y).toBeGreaterThanOrEqual(boxes.infoLine.bottom - 1);
    expect(Math.abs(boxes.audienceStrip.y - boxes.stageSurface.bottom)).toBeLessThanOrEqual(1);
    expect(Math.abs(boxes.audienceStrip.bottom - boxes.stage.bottom)).toBeLessThanOrEqual(1);
    expect(Math.abs(boxes.audienceStrip.bottom - boxes.transport.y)).toBeLessThanOrEqual(1);
    expect(boxes.audienceGuide.y).toBeGreaterThanOrEqual(boxes.stageSurface.bottom - 1);
    expect(boxes.transport.height).toBeGreaterThanOrEqual(48);
    expect(boxes.transport.height).toBeLessThanOrEqual(52);
    expect(boxes.playButton.width).toBeGreaterThanOrEqual(40);
    expect(boxes.playButton.height).toBeGreaterThanOrEqual(40);
    expect(boxes.timecode.height).toBeGreaterThanOrEqual(40);
    expect(Math.abs(boxes.stageSurface.width / boxes.stageSurface.height - 1.5)).toBeLessThanOrEqual(0.02);
    expect(Math.abs((boxes.stageSurface.width / 12) - (boxes.stageSurface.height / 8))).toBeLessThanOrEqual(0.5);
    expect(boxes.timeline.height).toBeGreaterThanOrEqual(238);
    expect(boxes.timeline.height).toBeLessThanOrEqual(246);
    expect(Math.abs(boxes.selectedToken.width - boxes.regularToken.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(boxes.selectedToken.height - boxes.regularToken.height)).toBeLessThanOrEqual(1);
    expect(boxes.selectedTokenRing).toContain("rgb");
    expect(boxes.selectedTokenTransitionDuration).toBe("0s");
    expect(boxes.selectedTokenTransitionProperty).toBe("none");
    expect(boxes.selectedTokenTransform).toBe(boxes.regularTokenTransform);
    expect(boxes.selectedHoldTransitionDuration).toBe("0s");
    expect(boxes.selectedHoldTransitionProperty).toBe("none");
    expect(boxes.selectedHoldTransform).toBe(boxes.regularHoldTransform);
    expect(boxes.moveBlockTransitionProperty).toBe("none");
    expect(boxes.trackAddTransitionProperty).toBe("none");
    expect(boxes.bottomIconTransitionProperty).toBe("none");
    expect(boxes.holdBlock.height).toBeGreaterThanOrEqual(boxes.formationLane.height * 0.8);
    expect(Math.abs(boxes.formationLane.height - boxes.musicLane.height)).toBeLessThanOrEqual(1);
    expect(Math.abs(boxes.moveBlock.center - boxes.formationLane.center)).toBeLessThanOrEqual(1);
    expect(boxes.moveBlock.height).toBeLessThan(boxes.holdBlock.height);
    expect(Math.abs(boxes.waveform.center - boxes.musicLane.center)).toBeLessThanOrEqual(1);
    expect(Math.abs(boxes.transport.bottom - boxes.timeline.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(boxes.ruler.y - boxes.timeline.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(boxes.formationLane.y - boxes.ruler.bottom)).toBeLessThanOrEqual(1);
    expect(Math.abs(boxes.musicLane.y - boxes.formationLane.bottom)).toBeLessThanOrEqual(1);
    expect(Math.abs(boxes.musicLane.bottom - boxes.timeline.bottom)).toBeLessThanOrEqual(1);
    expect(Math.abs(boxes.timeline.bottom - boxes.rail.y)).toBeLessThanOrEqual(1);
    expect(boxes.rail.bottom).toBeLessThanOrEqual(boxes.viewportHeight + 1);

    const actionButtonBox = await bottomRail.getByRole("button").first().boundingBox();
    expect(actionButtonBox).not.toBeNull();
    expect(actionButtonBox.width).toBeGreaterThanOrEqual(44);
    expect(actionButtonBox.height).toBeGreaterThanOrEqual(44);

    await expectInsideViewport(page, timeline);
    await expectInsideViewport(page, bottomRail);
    await page.screenshot({ path: "test-results/v2-stage-timeline-bottom-390x844.png", fullPage: false });
  });

  test("renders stored audio waveform peaks with played-region progress on v2", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedProject(page, seededWaveformProject());
    await page.goto("/v2");

    const root = page.locator("[data-v2-visual-editor]");
    const waveform = root.locator("[data-v2-waveform]");
    await expect(waveform).toHaveAttribute("data-v2-waveform-status", "ready");
    await expect.poll(() => waveform.locator("span:not(.v2-track-playhead)").count()).toBeGreaterThan(96);
    await expect.poll(() => waveformSampleHeights(root)).toEqual([
      "15px",
      "15px",
      "15px",
      "15px",
      "15px",
      "15px",
      "15px",
      "15px"
    ]);

    await root.locator(".v2-waveform-content").evaluate((node) => {
      node.style.setProperty("--waveform-played-percent", "42%");
    });
    await expect.poll(() => root.locator(".v2-waveform-content").evaluate((node) => (
      getComputedStyle(node).getPropertyValue("--waveform-played-percent").trim()
    ))).toBe("42%");
  });

  test("caps stored audio waveform DOM on long v2 timelines", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedProject(page, seededLongWaveformProject());
    await page.goto("/v2");

    const root = page.locator("[data-v2-visual-editor]");
    const waveformBars = root.locator("[data-v2-waveform] span:not(.v2-track-playhead)");
    await expect(root.locator("[data-v2-waveform]")).toHaveAttribute("data-v2-waveform-status", "ready");
    await expect.poll(() => waveformBars.count()).toBeGreaterThan(96);
    await expect.poll(() => waveformBars.count()).toBeLessThanOrEqual(360);
  });

  test("recalculates V2 stage guides and token size from changed stage dimensions", async ({ page }) => {
    await page.setViewportSize({ width: 430, height: 932 });
    const project = seededV2Project();
    project.stage = { width: 10, height: 6 };
    project.frontZone = { y: 4 };
    project.stageReferences = [];
    project.sections = project.sections.map((section) => ({
      ...section,
      positions: {
        a1: { x: 2, y: 1 },
        a2: { x: 4, y: 1 },
        b1: { x: 6, y: 3 },
        b2: { x: 8, y: 4 }
      }
    }));
    await seedProject(page, project);
    await page.goto("/v2");

    const root = page.locator("[data-v2-visual-editor]");
    const visualStage = root.locator("[data-v2-stage]");
    await expect(root.locator("[data-v2-stage-info-line]")).toContainText("Snap on · 10x6 · 1m grid");
    await expect(visualStage.locator("[data-v2-stage-grid]")).toBeVisible();
    const metrics = await visualStage.evaluate((stageNode) => {
      const surface = stageNode.querySelector(".v2-stage-surface");
      const surfaceRect = surface.getBoundingClientRect();
      const rect = surface.getBoundingClientRect();
      const grid = surface.querySelector("[data-v2-stage-grid]");
      const center = surface.querySelector("line.v2-stage-guide-neutral");
      const audience = stageNode.querySelector("[data-v2-audience-guide]");
      const audienceRect = audience?.getBoundingClientRect();
      const caution = surface.querySelector("[data-v2-caution-zone]");
      const token = surface.querySelector(".v2-token");
      const tokenRect = token?.getBoundingClientRect();
      const style = grid ? getComputedStyle(grid) : null;
      const cautionStyle = caution ? getComputedStyle(caution) : null;
      const cellWidth = rect.width / 10;
      const cellHeight = rect.height / 6;
      return {
        aspect: Number((rect.width / rect.height).toFixed(2)),
        audienceInsideSurface: Boolean(surface.querySelector("[data-v2-audience-guide]")),
        audienceTopAfterSurface: audienceRect ? Math.round(audienceRect.top - surfaceRect.bottom) : null,
        audienceIsCautionZone: audience?.hasAttribute("data-v2-caution-zone") || false,
        cautionTopRatio: caution ? Math.round(((caution.getBoundingClientRect().top - rect.top) / rect.height) * 100) : null,
        cautionBackground: cautionStyle?.backgroundImage || "",
        centerX: center?.getAttribute("x1"),
        centerY1: center?.getAttribute("y1"),
        centerY2: center?.getAttribute("y2"),
        gridBackgroundSize: style?.backgroundSize || "",
        tokenWidth: tokenRect?.width || 0,
        expectedTokenSize: Math.max(18, Math.min(34, Math.min(cellWidth, cellHeight) * 0.8))
      };
    });

    expect(metrics.aspect).toBeCloseTo(1.67, 1);
    expect(metrics.centerX).toBe("50");
    expect(metrics.centerY1).toBe("0");
    expect(metrics.centerY2).toBe("100");
    expect(metrics.cautionTopRatio).toBe(67);
    expect(metrics.audienceInsideSurface).toBe(false);
    expect(metrics.audienceTopAfterSurface).toBeGreaterThanOrEqual(0);
    expect(metrics.audienceIsCautionZone).toBe(false);
    expect(metrics.cautionBackground).not.toContain("radial-gradient");
    expect(metrics.gridBackgroundSize).toContain("10%");
    expect(metrics.gridBackgroundSize).toContain("16.666");
    expect(metrics.tokenWidth).toBeCloseTo(metrics.expectedTokenSize, 0);
    expect(metrics.tokenWidth).toBeGreaterThanOrEqual(18);
    expect(metrics.tokenWidth).toBeLessThanOrEqual(34);
  });

  test("new V2 projects reveal added formations for immediate block editing", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(({ storageKey, legacyStorageKey }) => {
      localStorage.removeItem(storageKey);
      localStorage.removeItem(legacyStorageKey);
    }, { storageKey: STORAGE_KEY, legacyStorageKey: LEGACY_STORAGE_KEY });
    await page.goto("/v2");
    await page.getByRole("button", { name: "빈 프로젝트 시작" }).click();

    const root = page.locator("[data-v2-visual-editor]");
    await expect(root).toBeVisible();
    await expect.poll(async () => secondsFromV2Timecode(await root.locator(".v2-timecode").textContent())).toBeLessThanOrEqual(0.1);
    const initialState = await v2TimelineNavigationState(root);
    const viewport = root.locator(".v2-formation-lane .v2-timeline-viewport");
    const viewportBox = await viewport.boundingBox();
    const introBlock = root.locator('[data-v2-segment-kind="hold"]').first();
    const introBox = await introBlock.boundingBox();
    expect(viewportBox).not.toBeNull();
    expect(introBox).not.toBeNull();
    expect(Math.abs(initialState.playheadViewportX)).toBeLessThanOrEqual(2);
    expect(Math.abs(introBox.x - viewportBox.x)).toBeLessThanOrEqual(2);

    await root.getByRole("button", { name: "대형 추가" }).click();
    await expect.poll(async () => secondsFromV2Timecode(await root.locator(".v2-timecode").textContent())).toBe(12);
    const addedBlock = root.locator('[data-v2-segment-kind="hold"]').last();
    await expect(addedBlock).toHaveAttribute("aria-pressed", "true");
    await expect(addedBlock.locator(".v2-segment-name")).toHaveText("대형");
    await expect(addedBlock).toHaveAttribute("data-v2-segment-duration", "4s");
    const addedState = await v2TimelineNavigationState(root);
    const addedBox = await addedBlock.boundingBox();
    expect(addedBox).not.toBeNull();
    expect(Math.abs((addedBox.x - viewportBox.x) - addedState.playheadViewportX)).toBeLessThanOrEqual(2);

    const timingBefore = await storedProject(page).then((project) => project.sections.map((section) => ({
      id: section.id,
      time: section.time,
      start: section.start,
      end: section.end,
      moveDuration: section.moveDuration
    })));
    const addedDragX = Math.max(viewportBox.x + 24, Math.min(viewportBox.x + viewportBox.width - 48, addedBox.x + Math.min(addedBox.width / 2, 80)));
    await page.mouse.move(addedDragX, addedBox.y + addedBox.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(700);
    await page.mouse.move(addedDragX + 80, addedBox.y + addedBox.height / 2, { steps: 8 });
    await page.mouse.up();

    await expect.poll(() => storedProject(page).then((project) => project.sections.map((section) => ({
      id: section.id,
      time: section.time,
      start: section.start,
      end: section.end,
      moveDuration: section.moveDuration
    })))).not.toEqual(timingBefore);
  });

  test("V2 force append ignores current playback time and preserves the F2 hold block", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const twoFormationProject = {
      ...seededV2Project(),
      sections: [
        {
          ...seededV2Project().sections[0],
          time: 0,
          moveDuration: 0,
          start: 0,
          end: 0
        },
        {
          ...seededV2Project().sections[1],
          time: 4,
          moveDuration: 2,
          start: 2,
          end: 4
        }
      ]
    };
    await seedProject(page, twoFormationProject);
    await page.goto("/v2");

    const root = page.locator("[data-v2-visual-editor]");
    const f2Block = root.locator('[data-v2-formation-block="diamond"][data-v2-segment-kind="hold"]');
    await expect(f2Block).toHaveAttribute("data-v2-segment-duration", "4s");
    const f2WidthBefore = await f2Block.evaluate((node) => node.getBoundingClientRect().width);
    await page.evaluate(() => {
      const audio = document.querySelector("audio");
      Object.defineProperty(audio, "currentTime", { configurable: true, value: 12.4 });
      audio.dispatchEvent(new Event("timeupdate"));
    });
    await expect.poll(() => page.evaluate(() => document.querySelector("audio")?.currentTime)).toBe(12.4);

    await root.getByRole("button", { name: "대형 추가" }).click();

    await expect.poll(async () => {
      const project = await storedProject(page);
      return project.sections.map((section) => ({
        name: section.id === "intro" || section.id === "diamond" ? section.id : "added",
        start: section.start,
        end: section.end,
        time: section.time,
        moveDuration: section.moveDuration
      }));
    }).toEqual([
      { name: "intro", start: 0, end: 0, time: 0, moveDuration: 0 },
      { name: "diamond", start: 2, end: 4, time: 4, moveDuration: 2 },
      { name: "added", start: 8, end: 12, time: 12, moveDuration: 4 }
    ]);
    await expect(f2Block).toHaveAttribute("data-v2-segment-duration", "4s");
    await expect.poll(() => f2Block.evaluate((node) => node.getBoundingClientRect().width)).toBe(f2WidthBefore);
    const addedBlock = root.locator('[data-v2-segment-kind="hold"]').last();
    await expect(addedBlock).toHaveAttribute("data-v2-segment-duration", "4s");
  });

  test("moves a selected V2 performer to empty stage space and clears selection", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedProject(page);
    await page.goto("/v2");

    const root = page.locator("[data-v2-visual-editor]");
    const stageSurface = root.locator(".v2-stage-surface");
    const token = root.locator('[data-v2-performer-token="a1"]');
    await token.click();
    await expect(token).toHaveAttribute("aria-pressed", "true");

    const stageBox = await stageSurface.boundingBox();
    expect(stageBox).not.toBeNull();
    await page.mouse.click(stageBox.x + stageBox.width * 0.75, stageBox.y + stageBox.height * 0.72);

    await expect.poll(async () => {
      const project = await storedProject(page);
      const intro = project.sections.find((section) => section.id === "intro");
      return intro.positions.a1;
    }).not.toEqual({ x: 2, y: 2 });
    await expect(token).toHaveAttribute("aria-pressed", "false");
    await expect(root.locator(".v2-token[aria-pressed='true']")).toHaveCount(0);
  });

  test("centers the connected phone shell on desktop without stretching it", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await seedProject(page);
    await page.goto("/v2");

    const shellMetrics = await page.locator(".v2-phone-shell").evaluate((shell) => {
      const rect = shell.getBoundingClientRect();
      return {
        left: rect.left,
        width: rect.width,
        viewportWidth: window.innerWidth
      };
    });

    expect(shellMetrics.width).toBeGreaterThanOrEqual(428);
    expect(shellMetrics.width).toBeLessThanOrEqual(432);
    expect(Math.abs(shellMetrics.left - (shellMetrics.viewportWidth - shellMetrics.width) / 2)).toBeLessThanOrEqual(2);
    await page.screenshot({ path: "test-results/v2-visual-desktop-1440.png", fullPage: false });
  });

  test("uses px timeline geometry for long content instead of percent compression", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedProject(page, seededLongTimelineProject());
    await page.goto("/v2");

    const metrics = await page.locator("[data-v2-visual-editor]").evaluate((root) => {
      const formationLane = root.querySelector(".v2-formation-lane");
      const content = root.querySelector(".v2-formation-lane .v2-timeline-content");
      const firstHold = root.querySelector('[data-v2-formation-block="intro"][data-v2-segment-kind="hold"]');
      const lastHold = root.querySelector('[data-v2-formation-block="finale"][data-v2-segment-kind="hold"]');
      const playhead = root.querySelector('[data-v2-playhead="formation"]');
      const contentRect = content?.getBoundingClientRect();
      const laneRect = formationLane?.getBoundingClientRect();
      const firstRect = firstHold?.getBoundingClientRect();
      const lastRect = lastHold?.getBoundingClientRect();
      const playheadRect = playhead?.getBoundingClientRect();
      return {
        contentWidth: contentRect?.width || 0,
        laneWidth: laneRect?.width || 0,
        firstLeft: firstRect && contentRect ? firstRect.left - contentRect.left : null,
        lastLeft: lastRect && contentRect ? lastRect.left - contentRect.left : null,
        playheadLeft: playheadRect && contentRect ? playheadRect.left - contentRect.left : null
      };
    });

    expect(metrics.contentWidth).toBeGreaterThan(metrics.laneWidth);
    expect(Math.abs(metrics.firstLeft)).toBeLessThanOrEqual(2);
    expect(metrics.lastLeft).toBeGreaterThan(3000);
    expect(metrics.playheadLeft).toBeGreaterThanOrEqual(0);
    expect(metrics.playheadLeft).toBeLessThanOrEqual(metrics.laneWidth + 1);
  });

  test("drags a single performer on the V2 HTML stage", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedProject(page);
    await page.goto("/v2");

    const token = page.locator('[data-v2-performer-token="a1"]');
    const before = await token.boundingBox();
    expect(before).not.toBeNull();
    await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
    await page.mouse.down();
    await page.mouse.move(before.x + before.width / 2 + 90, before.y + before.height / 2 + 60, { steps: 8 });
    await page.mouse.up();

    await expect.poll(async () => {
      const project = await storedProject(page);
      const intro = project.sections.find((section) => section.id === "intro");
      return intro.positions.a1;
    }).not.toEqual({ x: 2, y: 2 });

    const project = await storedProject(page);
    const intro = project.sections.find((section) => section.id === "intro");
    expect(intro.positions.a1.x).toBeGreaterThan(2);
    expect(intro.positions.a1.y).toBeGreaterThan(2);
    await expect(token).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator("[data-v2-visual-editor] .v2-token[aria-pressed='true']")).toHaveCount(0);
  });

  test("allows V2 performers on the top and audience-side edge rows", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedProject(page);
    await page.goto("/v2");

    const root = page.locator("[data-v2-visual-editor]");
    const stageSurface = root.locator(".v2-stage-surface");
    const token = root.locator('[data-v2-performer-token="a1"]');
    const stageBox = await stageSurface.boundingBox();
    expect(stageBox).not.toBeNull();

    const dragTo = async (pointerId, clientX, clientY) => {
      const tokenBox = await token.boundingBox();
      expect(tokenBox).not.toBeNull();
      const startX = tokenBox.x + tokenBox.width / 2;
      const startY = tokenBox.y + tokenBox.height / 2;
      await token.dispatchEvent("pointerdown", {
        bubbles: true,
        button: 0,
        buttons: 1,
        clientX: startX,
        clientY: startY,
        isPrimary: true,
        pointerId,
        pointerType: "mouse"
      });
      await token.dispatchEvent("pointermove", {
        bubbles: true,
        button: 0,
        buttons: 1,
        clientX,
        clientY,
        isPrimary: true,
        pointerId,
        pointerType: "mouse"
      });
      await token.dispatchEvent("pointerup", {
        bubbles: true,
        button: 0,
        buttons: 0,
        clientX,
        clientY,
        isPrimary: true,
        pointerId,
        pointerType: "mouse"
      });
    };

    await dragTo(717, stageBox.x + stageBox.width, stageBox.y + stageBox.height);
    await expect.poll(async () => {
      const project = await storedProject(page);
      return project.sections.find((section) => section.id === "intro").positions.a1;
    }).toEqual(expect.objectContaining({ x: 12, y: 8 }));

    await dragTo(718, stageBox.x, stageBox.y);
    await expect.poll(async () => {
      const project = await storedProject(page);
      return project.sections.find((section) => section.id === "intro").positions.a1;
    }).toEqual(expect.objectContaining({ x: 0, y: 0 }));
  });

  test("previews V2 performer drag without mutating storage until pointerup", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedProject(page);
    await page.goto("/v2");

    const root = page.locator("[data-v2-visual-editor]");
    const token = root.locator('[data-v2-performer-token="a1"]');
    const beforeBox = await token.boundingBox();
    expect(beforeBox).not.toBeNull();
    const beforeProject = await storedProject(page);
    const beforePosition = beforeProject.sections.find((section) => section.id === "intro").positions.a1;
    const pointerId = 715;
    const startX = beforeBox.x + beforeBox.width / 2;
    const startY = beforeBox.y + beforeBox.height / 2;

    await token.dispatchEvent("pointerdown", {
      bubbles: true,
      button: 0,
      buttons: 1,
      clientX: startX,
      clientY: startY,
      isPrimary: true,
      pointerId,
      pointerType: "mouse"
    });
    await token.dispatchEvent("pointermove", {
      bubbles: true,
      button: 0,
      buttons: 1,
      clientX: startX + 84,
      clientY: startY + 48,
      isPrimary: true,
      pointerId,
      pointerType: "mouse"
    });

    await expect.poll(async () => token.evaluate((node) => ({
      dragX: node.style.getPropertyValue("--v2-drag-x"),
      dragY: node.style.getPropertyValue("--v2-drag-y")
    }))).not.toEqual({ dragX: "", dragY: "" });
    const midProject = await storedProject(page);
    expect(midProject.sections.find((section) => section.id === "intro").positions.a1).toEqual(beforePosition);

    await token.dispatchEvent("pointerup", {
      bubbles: true,
      button: 0,
      buttons: 0,
      clientX: startX + 84,
      clientY: startY + 48,
      isPrimary: true,
      pointerId,
      pointerType: "mouse"
    });

    await expect.poll(async () => {
      const project = await storedProject(page);
      return project.sections.find((section) => section.id === "intro").positions.a1;
    }).not.toEqual(beforePosition);
    await expect(token).toHaveAttribute("aria-pressed", "false");
  });

  test("cancels V2 performer drag preview without mutating storage", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedProject(page);
    await page.goto("/v2");

    const root = page.locator("[data-v2-visual-editor]");
    const token = root.locator('[data-v2-performer-token="a1"]');
    const beforeBox = await token.boundingBox();
    expect(beforeBox).not.toBeNull();
    const beforeProject = await storedProject(page);
    const beforePosition = beforeProject.sections.find((section) => section.id === "intro").positions.a1;
    const pointerId = 716;
    const startX = beforeBox.x + beforeBox.width / 2;
    const startY = beforeBox.y + beforeBox.height / 2;

    await token.dispatchEvent("pointerdown", {
      bubbles: true,
      button: 0,
      buttons: 1,
      clientX: startX,
      clientY: startY,
      isPrimary: true,
      pointerId,
      pointerType: "mouse"
    });
    await token.dispatchEvent("pointermove", {
      bubbles: true,
      button: 0,
      buttons: 1,
      clientX: startX + 84,
      clientY: startY + 48,
      isPrimary: true,
      pointerId,
      pointerType: "mouse"
    });
    await token.dispatchEvent("pointercancel", {
      bubbles: true,
      button: 0,
      buttons: 0,
      clientX: startX + 84,
      clientY: startY + 48,
      isPrimary: true,
      pointerId,
      pointerType: "mouse"
    });

    await expect.poll(async () => {
      const project = await storedProject(page);
      return project.sections.find((section) => section.id === "intro").positions.a1;
    }).toEqual(beforePosition);
    await expect.poll(async () => token.evaluate((node) => ({
      dragX: node.style.getPropertyValue("--v2-drag-x"),
      dragY: node.style.getPropertyValue("--v2-drag-y")
    }))).toEqual({ dragX: "", dragY: "" });
  });

  test("blocks V2 performer drag on readonly share routes", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const readonlyProject = {
      ...seededV2Project(),
      title: "Readonly Drag Fixture",
      shareLinks: {
        view: { projectId: "readonly-drag-project", token: "", enabled: true },
        edit: { projectId: "readonly-drag-project", token: "edit-token", enabled: true }
      }
    };
    await page.route("**/rest/v1/movemap_projects**", async (route) => {
      await route.fulfill({ json: [{ id: "readonly-drag-project", plan: readonlyProject }] });
    });
    await page.route("**/rest/v1/choreo_projects**", async (route) => {
      await route.fulfill({ json: [] });
    });
    await page.goto("/share/readonly-drag-project/v2");

    const token = page.locator('[data-v2-performer-token="a1"]');
    const beforePosition = await token.evaluate((node) => ({
      x: node.style.getPropertyValue("--token-x"),
      y: node.style.getPropertyValue("--token-y")
    }));
    const before = await token.boundingBox();
    expect(before).not.toBeNull();
    await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
    await page.mouse.down();
    await page.mouse.move(before.x + before.width / 2 + 90, before.y + before.height / 2 + 60, { steps: 8 });
    await page.mouse.up();
    const afterPosition = await token.evaluate((node) => ({
      x: node.style.getPropertyValue("--token-x"),
      y: node.style.getPropertyValue("--token-y")
    }));
    expect(afterPosition).toEqual(beforePosition);
  });

  test("uses wheel for V2 timeline scroll and click-to-position seek", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedProject(page, seededLongTimelineProject());
    await page.goto("/v2");

    const root = page.locator("[data-v2-visual-editor]");
    const viewport = root.locator(".v2-formation-lane .v2-timeline-viewport");
    const content = root.locator(".v2-formation-lane .v2-timeline-content");
    const box = await viewport.boundingBox();
    expect(box).not.toBeNull();

    const beforeTransform = await content.evaluate((node) => getComputedStyle(node).transform);
    await page.mouse.move(box.x + box.width - 20, box.y + 8);
    await page.mouse.wheel(0, 420);
    await expect.poll(() => content.evaluate((node) => getComputedStyle(node).transform)).not.toBe(beforeTransform);

    await expectV2TimelineScrubs(root, async () => {
      await page.mouse.click(box.x + 40, box.y + 8);
    });

    const ruler = root.locator(".v2-ruler .v2-timeline-viewport");
    const rulerBox = await ruler.boundingBox();
    expect(rulerBox).not.toBeNull();
    await expectV2TimelineScrubs(root, async () => {
      await page.mouse.click(rulerBox.x + Math.min(rulerBox.width - 18, 180), rulerBox.y + rulerBox.height / 2);
    });
  });

  test("V2 block clicks seek and select without timing mutation", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const selectableTrimProject = {
      ...seededV2Project(),
      sections: [
        seededV2Project().sections[0],
        {
          ...seededV2Project().sections[1],
          time: 6,
          moveDuration: 2,
          start: 4,
          end: 6
        },
        {
          ...seededV2Project().sections[1],
          id: "finale",
          name: "Finale Stack",
          time: 12,
          moveDuration: 2,
          start: 10,
          end: 12
        }
      ]
    };
    await seedProject(page, selectableTrimProject);
    await page.goto("/v2");

    const root = page.locator("[data-v2-visual-editor]");
    await root.locator("[data-v2-bottom-rail]").getByRole("button", { name: "Timeline" }).click();
    await expect(root.locator('[data-v2-tab-surface="Timeline"]')).toBeVisible();
    const moveBlock = root.locator('[data-v2-segment-kind="move"]').first();
    const diamondBlock = root.locator('[data-v2-formation-block="diamond"][data-v2-segment-kind="hold"]');
    await expect(moveBlock).toBeVisible();
    await expect(diamondBlock).toBeVisible();
    await expect(root.getByRole("button", { name: "실행 취소" })).toBeDisabled();

    const timingBefore = await v2TimingSnapshot(page);
    const viewport = root.locator(".v2-formation-lane .v2-timeline-viewport");
    const viewportBox = await viewport.boundingBox();
    expect(viewportBox).not.toBeNull();
    await page.mouse.move(viewportBox.x + viewportBox.width / 2, viewportBox.y + viewportBox.height / 2);
    await page.mouse.wheel(0, 220);
    await page.waitForTimeout(100);
    const beforeVisibleBlockClick = await v2TimelineNavigationState(root);
    const visibleDiamondBox = await diamondBlock.boundingBox();
    expect(visibleDiamondBox).not.toBeNull();
    await page.mouse.click(
      Math.max(viewportBox.x + 6, Math.min(viewportBox.x + viewportBox.width - 6, visibleDiamondBox.x + visibleDiamondBox.width / 2)),
      visibleDiamondBox.y + visibleDiamondBox.height / 2
    );
    await expect(diamondBlock).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => v2TimelineNavigationState(root)).not.toMatchObject({
      timecode: beforeVisibleBlockClick.timecode
    });
    const afterVisibleBlockClick = await v2TimelineNavigationState(root);
    expect(afterVisibleBlockClick.transform).toBe(beforeVisibleBlockClick.transform);
    expect(await v2TimingSnapshot(page)).toEqual(timingBefore);
    await expect(root.getByRole("button", { name: "실행 취소" })).toBeDisabled();
    await expect(root.locator('[data-v2-timeline-handle="hold-left"][data-v2-section-id="diamond"]')).toBeVisible();
    await expect(root.locator('[data-v2-timeline-handle="hold-right"][data-v2-section-id="diamond"]')).toBeVisible();
    await expect(root.locator('[data-v2-tab-surface="Timeline"]')).toBeVisible();

    expect(await v2TimingSnapshot(page)).toEqual(timingBefore);
    await expect(root.getByRole("button", { name: "실행 취소" })).toBeDisabled();
  });

  test("V2 timeline zoom controls change timeline spacing without a stage zoom rail", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedProject(page, seededLongTimelineProject());
    await page.goto("/v2");

    const root = page.locator("[data-v2-visual-editor]");
    const timeline = root.locator("[data-v2-timeline]");
    await expect(root.locator(".v2-zoom-rail")).toHaveCount(0);
    const content = root.locator(".v2-formation-lane .v2-timeline-content");
    const firstTick = root.locator(".v2-ruler .v2-timeline-content > span").nth(1);
    await expect(timeline.getByRole("button", { name: "타임라인 확대" })).toBeVisible();
    await expect(timeline.getByRole("button", { name: "타임라인 축소" })).toBeVisible();

    const before = await content.evaluate((node) => node.getBoundingClientRect().width);
    const beforeTick = await firstTick.evaluate((node) => getComputedStyle(node).getPropertyValue("--tick-left"));
    await timeline.getByRole("button", { name: "타임라인 확대" }).click();
    await expect.poll(() => content.evaluate((node) => node.getBoundingClientRect().width)).toBeGreaterThan(before);
    await expect.poll(() => firstTick.evaluate((node) => getComputedStyle(node).getPropertyValue("--tick-left"))).not.toBe(beforeTick);

    const zoomed = await content.evaluate((node) => node.getBoundingClientRect().width);
    await timeline.getByRole("button", { name: "타임라인 축소" }).click();
    await expect.poll(() => content.evaluate((node) => node.getBoundingClientRect().width)).toBeLessThan(zoomed);
  });

  test("V2 hold blocks expose both trim handles and hold-left drag edits incoming move", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedProject(page, {
      ...seededV2Project(),
      sections: [
        {
          ...seededV2Project().sections[0],
          time: 4,
          moveDuration: 4,
          start: 0,
          end: 4
        },
        {
          ...seededV2Project().sections[1],
          time: 12,
          moveDuration: 4,
          start: 8,
          end: 12
        },
        {
          ...seededV2Project().sections[1],
          id: "finale",
          name: "Finale Stack",
          time: 18,
          moveDuration: 2,
          start: 16,
          end: 18
        }
      ]
    });
    await page.goto("/v2");

    const root = page.locator("[data-v2-visual-editor]");
    const viewport = root.locator(".v2-formation-lane .v2-timeline-viewport");
    const viewportBox = await viewport.boundingBox();
    expect(viewportBox).not.toBeNull();
    await page.mouse.move(viewportBox.x + viewportBox.width / 2, viewportBox.y + viewportBox.height / 2);
    await page.mouse.wheel(0, 360);
    await page.waitForTimeout(100);

    const diamondBlock = root.locator('[data-v2-formation-block="diamond"][data-v2-segment-kind="hold"]');
    await diamondBlock.click();
    await expect(diamondBlock).toHaveAttribute("aria-pressed", "true");
    const leftHandle = root.locator('[data-v2-timeline-handle="hold-left"][data-v2-section-id="diamond"]');
    const rightHandle = root.locator('[data-v2-timeline-handle="hold-right"][data-v2-section-id="diamond"]');
    await expect(leftHandle).toBeVisible();
    await expect(rightHandle).toBeVisible();

    const timingBefore = await v2TimingSnapshot(page);
    const navigationBefore = await v2TimelineNavigationState(root);
    expect(timingBefore.find((section) => section.id === "diamond")).toMatchObject({
      time: 12,
      start: 8,
      end: 12,
      moveDuration: 4
    });
    await expect.poll(() => v2TimelineHandleHitMap(
      page,
      '[data-v2-timeline-handle="hold-left"][data-v2-section-id="diamond"]'
    )).toEqual([
      { offset: -16, hitHandle: "hold-left", hitSectionId: "diamond", hitSegmentKind: "" },
      { offset: -8, hitHandle: "hold-left", hitSectionId: "diamond", hitSegmentKind: "" },
      { offset: 0, hitHandle: "hold-left", hitSectionId: "diamond", hitSegmentKind: "" },
      { offset: 8, hitHandle: "hold-left", hitSectionId: "diamond", hitSegmentKind: "" },
      { offset: 16, hitHandle: "hold-left", hitSectionId: "diamond", hitSegmentKind: "" }
    ]);
    await expect.poll(() => page.evaluate(() => {
      const block = document.querySelector('[data-v2-formation-block="diamond"][data-v2-segment-kind="hold"]');
      const blockRect = block?.getBoundingClientRect();
      if (!blockRect) return [];
      const y = blockRect.top + blockRect.height / 2;
      return [-3, 0, 3].map((offset) => {
        const hit = document.elementFromPoint(blockRect.left + offset, y);
        return {
          offset,
          hitHandle: hit?.getAttribute("data-v2-timeline-handle") || "",
          hitSectionId: hit?.getAttribute("data-v2-section-id") || ""
        };
      });
    })).toEqual([
      { offset: -3, hitHandle: "hold-left", hitSectionId: "diamond" },
      { offset: 0, hitHandle: "hold-left", hitSectionId: "diamond" },
      { offset: 3, hitHandle: "hold-left", hitSectionId: "diamond" }
    ]);
    const handleBox = await leftHandle.boundingBox();
    expect(handleBox).not.toBeNull();
    const handleStartX = await diamondBlock.evaluate((node) => node.getBoundingClientRect().left);
    const handleStartY = handleBox.y + handleBox.height / 2;
    await page.mouse.move(handleStartX, handleStartY);
    await page.mouse.down();
    await page.mouse.move(handleStartX - 84, handleStartY, { steps: 8 });
    await page.mouse.up();

    await expect.poll(() => v2TimingSnapshot(page).then((sections) => sections.find((section) => section.id === "diamond"))).toMatchObject({
      start: 8
    });
    const diamondAfterHoldLeftTrim = (await v2TimingSnapshot(page)).find((section) => section.id === "diamond");
    expect(diamondAfterHoldLeftTrim.time).toBeGreaterThan(10);
    expect(diamondAfterHoldLeftTrim.time).toBeLessThanOrEqual(10.7);
    expect(diamondAfterHoldLeftTrim.end).toBe(diamondAfterHoldLeftTrim.time);
    expect(diamondAfterHoldLeftTrim.moveDuration).toBeCloseTo(diamondAfterHoldLeftTrim.time - diamondAfterHoldLeftTrim.start, 5);
    await expect(diamondBlock).toHaveAttribute("aria-pressed", "true");
    expect((await v2TimelineNavigationState(root)).transform).toBe(navigationBefore.transform);
    await expectNoV2CompetingTimelineGesture(root);
    await expect(root.getByRole("button", { name: "실행 취소" })).toBeEnabled();
  });

  test("readonly V2 routes do not render trim handles or mutate timing", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const readonlyProject = {
      ...seededWaveformProject(),
      title: "Readonly Timeline Fixture",
      shareLinks: {
        view: { projectId: "readonly-timeline-project", token: "", enabled: true },
        edit: { projectId: "readonly-timeline-project", token: "edit-token", enabled: true }
      }
    };
    await page.route("**/rest/v1/movemap_projects**", async (route) => {
      await route.fulfill({ json: [{ id: "readonly-timeline-project", plan: readonlyProject }] });
    });
    await page.route("**/rest/v1/choreo_projects**", async (route) => {
      await route.fulfill({ json: [] });
    });
    await page.goto("/share/readonly-timeline-project/v2");

    const root = page.locator("[data-v2-visual-editor]");
    await expect(root.locator("[data-v2-waveform]")).toHaveAttribute("data-v2-waveform-status", "ready");
    await expect.poll(() => root.locator("[data-v2-waveform] span:not(.v2-track-playhead)").count()).toBeGreaterThan(96);
    await expect.poll(() => waveformSampleHeights(root)).toEqual([
      "15px",
      "15px",
      "15px",
      "15px",
      "15px",
      "15px",
      "15px",
      "15px"
    ]);
    const diamondBlock = root.locator('[data-v2-formation-block="diamond"][data-v2-segment-kind="hold"]');
    await diamondBlock.click();
    await expect(root.locator("[data-v2-timeline-handle]")).toHaveCount(0);
    const storedBefore = await page.evaluate((storageKey) => localStorage.getItem(storageKey), STORAGE_KEY);
    await root.getByRole("button", { name: "타임라인 확대" }).click();
    await expect.poll(() => root.locator(".v2-formation-lane .v2-timeline-content").evaluate((node) => node.getBoundingClientRect().width)).toBeGreaterThan(0);
    expect(await page.evaluate((storageKey) => localStorage.getItem(storageKey), STORAGE_KEY)).toBe(storedBefore);
  });

  test("blank V2 timeline pointer drag pans without scrubbing or timing edits", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedProject(page, seededLongTimelineProject());
    await page.goto("/v2");

    const root = page.locator("[data-v2-visual-editor]");
    const viewport = root.locator(".v2-formation-lane .v2-timeline-viewport");
    const content = root.locator(".v2-formation-lane .v2-timeline-content");
    const box = await viewport.boundingBox();
    expect(box).not.toBeNull();

    const beforeTransform = await content.evaluate((node) => getComputedStyle(node).transform);
    await page.mouse.move(box.x + box.width - 20, box.y + 8);
    await page.mouse.wheel(0, 420);
    await expect.poll(() => content.evaluate((node) => getComputedStyle(node).transform)).not.toBe(beforeTransform);
    await expectV2TimelinePansWithoutScrub(page, root, async () => {
      await page.mouse.move(box.x + Math.min(170, box.width - 30), box.y + 8);
      await page.mouse.down();
      await page.mouse.move(box.x + Math.min(250, box.width - 16), box.y + 8, { steps: 6 });
      await page.mouse.up();
    });
  });

  test("V2 timeline clicks seek while short drags pan from ruler, audio, and waveform", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedProject(page, seededLongTimelineProject());
    await page.goto("/v2");

    const root = page.locator("[data-v2-visual-editor]");
    const surfaces = [
      { name: "ruler", locator: root.locator(".v2-ruler .v2-timeline-viewport") },
      { name: "audio", locator: root.locator("[data-v2-waveform] .v2-timeline-viewport") },
      { name: "waveform", locator: root.locator("[data-v2-waveform] .v2-waveform-content") }
    ];

    for (const surface of surfaces) {
      await test.step(surface.name, async () => {
      await page.goto("/v2");
      await expect(root).toBeVisible();
      const box = await surface.locator.boundingBox();
      expect(box, `${surface.name} is measurable`).not.toBeNull();
      const clickOffsetX = Math.max(80, Math.min(box.width - 70, 240));
      const dragOffsetX = Math.max(80, Math.min(box.width - 160, 120));
      const dragDeltaX = -64;
      const targetY = surface.name === "formation" ? 8 : box.height / 2;
      const resetBox = await root.locator(".v2-formation-lane .v2-timeline-viewport").boundingBox();
      expect(resetBox).not.toBeNull();
      await page.mouse.click(resetBox.x + 8, resetBox.y + resetBox.height / 2);
      await expectV2TimelineScrubs(root, async () => {
        await page.mouse.click(box.x + clickOffsetX, box.y + targetY);
      });
      await page.waitForTimeout(50);
      const dragBox = await surface.locator.boundingBox();
      expect(dragBox, `${surface.name} drag target is measurable`).not.toBeNull();
      const currentDragOffsetX = Math.max(80, Math.min(dragBox.width - 160, 120));
      const currentTargetY = surface.name === "formation" ? 8 : dragBox.height / 2;
      await expectV2TimelinePansWithoutScrub(page, root, async () => {
        await mouseDragAt(page, dragBox, currentDragOffsetX, currentTargetY, dragDeltaX, 0, 6);
      });
      });
    }
  });

  test("V2 playhead drag scrubs and auto-pans near viewport edges", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedProject(page, seededLongTimelineProject());
    await page.goto("/v2");

    const root = page.locator("[data-v2-visual-editor]");
    const viewport = root.locator(".v2-formation-lane .v2-timeline-viewport");
    const viewportBox = await viewport.boundingBox();
    expect(viewportBox).not.toBeNull();
    await page.mouse.click(viewportBox.x + viewportBox.width / 2, viewportBox.y + viewportBox.height / 2);

    const before = await v2TimelineNavigationState(root);
    const playhead = root.locator('[data-v2-playhead="formation"]');
    const playheadBox = await playhead.boundingBox();
    expect(playheadBox).not.toBeNull();
    await page.mouse.move(playheadBox.x + playheadBox.width / 2, playheadBox.y + playheadBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(viewportBox.x + viewportBox.width - 12, playheadBox.y + playheadBox.height / 2, { steps: 8 });
    await page.mouse.move(viewportBox.x + viewportBox.width - 8, playheadBox.y + playheadBox.height / 2, { steps: 6 });
    await page.mouse.up();

    await expect.poll(async () => (await v2TimelineNavigationState(root)).timecode).not.toBe(before.timecode);
    await expect.poll(async () => (await v2TimelineNavigationState(root)).transform).not.toBe(before.transform);
  });

  test("V2 click seek can move the playhead to visible start and scrolled final time", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedProject(page, seededLongTimelineProject());
    await page.goto("/v2");

    const root = page.locator("[data-v2-visual-editor]");
    const viewport = root.locator(".v2-formation-lane .v2-timeline-viewport");
    const box = await viewport.boundingBox();
    expect(box).not.toBeNull();

    await page.mouse.click(box.x + 4, box.y + box.height / 2);
    await expect.poll(async () => secondsFromV2Timecode(await root.locator(".v2-timecode").textContent())).toBeLessThanOrEqual(0.1);
    let state = await v2TimelineNavigationState(root);
    expect(Math.abs(state.playheadViewportX - 4)).toBeLessThanOrEqual(4);

    const transformBeforeEnd = await root.locator(".v2-formation-lane .v2-timeline-content").evaluate((node) => getComputedStyle(node).transform);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, 10000);
    await expect.poll(() => root.locator(".v2-formation-lane .v2-timeline-content").evaluate((node) => getComputedStyle(node).transform)).not.toBe(transformBeforeEnd);
    await expect.poll(async () => secondsFromV2Timecode(await root.locator(".v2-timecode").textContent())).toBeLessThanOrEqual(0.1);
    await page.mouse.click(box.x + box.width - 4, box.y + box.height / 2);
    await expect.poll(async () => secondsFromV2Timecode(await root.locator(".v2-timecode").textContent())).toBe(88);
    state = await v2TimelineNavigationState(root);
    expect(state.playheadViewportX).toBeGreaterThan(box.width - 90);
    expect(state.playheadViewportX).toBeLessThanOrEqual(box.width + 1);
  });

  test("short drag on a V2 formation block pans without changing time or timing", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedProject(page);
    await page.goto("/v2");

    const root = page.locator("[data-v2-visual-editor]");
    const viewport = root.locator(".v2-formation-lane .v2-timeline-viewport");
    const introBlock = root.locator('[data-v2-formation-block="intro"][data-v2-segment-kind="hold"]');
    await expect(introBlock).toBeVisible();

    const timingBefore = await storedProject(page).then((project) => project.sections.map((section) => ({
      id: section.id,
      time: section.time,
      start: section.start,
      end: section.end,
      moveDuration: section.moveDuration
    })));
    const box = await introBlock.boundingBox();
    const viewportBox = await viewport.boundingBox();
    expect(box).not.toBeNull();
    expect(viewportBox).not.toBeNull();
    const startX = Math.max(box.x + 20, viewportBox.x + 28);
    const startY = box.y + box.height / 2;

    await expectV2TimelinePansWithoutScrub(page, root, async () => {
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(startX - 80, startY, { steps: 6 });
      await page.mouse.up();
    });

    const timingAfter = await storedProject(page).then((project) => project.sections.map((section) => ({
      id: section.id,
      time: section.time,
      start: section.start,
      end: section.end,
      moveDuration: section.moveDuration
    })));
    expect(timingAfter).toEqual(timingBefore);
  });

  test("dragging a V2 formation block does not select it", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedProject(page, {
      ...seededV2Project(),
      sections: [
        seededV2Project().sections[0],
        {
          ...seededV2Project().sections[1],
          time: 6,
          moveDuration: 2,
          start: 4,
          end: 6
        }
      ]
    });
    await page.goto("/v2");

    const root = page.locator("[data-v2-visual-editor]");
    const viewport = root.locator(".v2-formation-lane .v2-timeline-viewport");
    const viewportBox = await viewport.boundingBox();
    expect(viewportBox).not.toBeNull();
    await page.mouse.move(viewportBox.x + viewportBox.width / 2, viewportBox.y + viewportBox.height / 2);
    await page.mouse.wheel(0, 220);
    await page.waitForTimeout(100);
    const token = root.locator('[data-v2-performer-token="b2"]');
    const diamondBlock = root.locator('[data-v2-formation-block="diamond"][data-v2-segment-kind="hold"]');
    await token.click();
    await expect(token).toHaveAttribute("aria-pressed", "true");
    await expect(diamondBlock).toHaveAttribute("aria-pressed", "false");

    const box = await diamondBlock.boundingBox();
    expect(box).not.toBeNull();
    const visibleLeft = Math.max(box.x + 6, viewportBox.x + 6);
    const visibleRight = Math.min(box.x + box.width - 6, viewportBox.x + viewportBox.width - 6);
    expect(visibleRight).toBeGreaterThan(visibleLeft);
    const startX = (visibleLeft + visibleRight) / 2;
    const startY = box.y + box.height / 2;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await expect(diamondBlock).toHaveAttribute("aria-pressed", "false");
    await page.mouse.move(startX - 28, startY, { steps: 4 });
    await expect(diamondBlock).toHaveAttribute("aria-pressed", "false");
    await page.mouse.up();
    await expect(token).toHaveAttribute("aria-pressed", "true");
    await expect(diamondBlock).toHaveAttribute("aria-pressed", "false");
  });

  test("small pointer movement on a V2 formation block still selects it", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedProject(page, {
      ...seededV2Project(),
      sections: [
        seededV2Project().sections[0],
        {
          ...seededV2Project().sections[1],
          time: 6,
          moveDuration: 2,
          start: 4,
          end: 6
        }
      ]
    });
    await page.goto("/v2");

    const root = page.locator("[data-v2-visual-editor]");
    const viewport = root.locator(".v2-formation-lane .v2-timeline-viewport");
    const viewportBox = await viewport.boundingBox();
    expect(viewportBox).not.toBeNull();
    await page.mouse.move(viewportBox.x + viewportBox.width / 2, viewportBox.y + viewportBox.height / 2);
    await page.mouse.wheel(0, 220);
    await page.waitForTimeout(100);
    const token = root.locator('[data-v2-performer-token="b2"]');
    const diamondBlock = root.locator('[data-v2-formation-block="diamond"][data-v2-segment-kind="hold"]');
    await token.click();
    await expect(token).toHaveAttribute("aria-pressed", "true");
    await expect(diamondBlock).toHaveAttribute("aria-pressed", "false");

    const box = await diamondBlock.boundingBox();
    expect(box).not.toBeNull();
    const visibleLeft = Math.max(box.x + 6, viewportBox.x + 6);
    const visibleRight = Math.min(box.x + box.width - 6, viewportBox.x + viewportBox.width - 6);
    expect(visibleRight).toBeGreaterThan(visibleLeft);
    const startX = (visibleLeft + visibleRight) / 2;
    const startY = box.y + box.height / 2;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 6, startY + 2, { steps: 2 });
    await page.mouse.up();

    await expect(diamondBlock).toHaveAttribute("aria-pressed", "true");
    await expect(token).toHaveAttribute("aria-pressed", "false");
  });

  test("short drag on a V2 move block pans without changing time or timing", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedProject(page);
    await page.goto("/v2");

    const root = page.locator("[data-v2-visual-editor]");
    const viewport = root.locator(".v2-formation-lane .v2-timeline-viewport");
    const viewportBox = await viewport.boundingBox();
    expect(viewportBox).not.toBeNull();
    await page.mouse.move(viewportBox.x + viewportBox.width - 20, viewportBox.y + 8);
    await page.mouse.wheel(0, 420);
    await page.waitForTimeout(100);

    const moveBlock = root.locator('[data-v2-segment-kind="move"]');
    await expect(moveBlock).toBeVisible();
    const timingBefore = await storedProject(page).then((project) => project.sections.map((section) => ({
      id: section.id,
      time: section.time,
      start: section.start,
      end: section.end,
      moveDuration: section.moveDuration
    })));
    const box = await moveBlock.boundingBox();
    expect(box).not.toBeNull();
    const startX = box.x + Math.min(box.width / 2, box.width - 4);
    const startY = box.y + box.height / 2;

    await expectV2TimelinePansWithoutScrub(page, root, async () => {
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(startX + 60, startY, { steps: 6 });
      await page.mouse.up();
    });

    const timingAfter = await storedProject(page).then((project) => project.sections.map((section) => ({
      id: section.id,
      time: section.time,
      start: section.start,
      end: section.end,
      moveDuration: section.moveDuration
    })));
    expect(timingAfter).toEqual(timingBefore);
  });

  test("touch drag on a V2 move block pans without changing time, timing, or undo", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedProject(page, seededCompactMoveProject());
    await page.goto("/v2");

    const root = page.locator("[data-v2-visual-editor]");
    const viewport = root.locator(".v2-formation-lane .v2-timeline-viewport");
    const viewportBox = await viewport.boundingBox();
    expect(viewportBox).not.toBeNull();
    await page.mouse.move(viewportBox.x + viewportBox.width / 2, viewportBox.y + viewportBox.height / 2);
    await page.mouse.wheel(0, 180);
    await page.waitForTimeout(100);
    const moveBlock = root.locator('[data-v2-segment-kind="move"]');
    await expect(moveBlock).toBeVisible();
    await expect(root.getByRole("button", { name: "실행 취소" })).toBeDisabled();

    await expectV2TimelinePansWithoutScrub(page, root, async () => {
      await touchDrag(page, moveBlock, -92, 0, 10);
    });
    await expect(root.getByRole("button", { name: "실행 취소" })).toBeDisabled();
  });

  test("long press then drag on a V2 formation block moves timing", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const moveBodyProject = {
      ...seededV2Project(),
      sections: [
        {
          ...seededV2Project().sections[0],
          time: 4,
          moveDuration: 4,
          start: 0,
          end: 4
        },
        {
          ...seededV2Project().sections[1],
          time: 8,
          moveDuration: 4,
          start: 4,
          end: 8
        },
        {
          ...seededV2Project().sections[1],
          id: "finale",
          name: "Finale Stack",
          time: 20,
          moveDuration: 4,
          start: 16,
          end: 20
        }
      ]
    };
    await seedProject(page, moveBodyProject);
    await page.goto("/v2");

    const root = page.locator("[data-v2-visual-editor]");
    const viewport = root.locator(".v2-formation-lane .v2-timeline-viewport");
    const viewportBox = await viewport.boundingBox();
    expect(viewportBox).not.toBeNull();
    await page.mouse.move(viewportBox.x + viewportBox.width - 20, viewportBox.y + 8);
    await page.mouse.wheel(0, 340);
    await page.waitForTimeout(100);

    const diamondBlock = root.locator('[data-v2-formation-block="diamond"][data-v2-segment-kind="hold"]');
    await expect(diamondBlock).toBeVisible();
    const timingBefore = await storedProject(page).then((project) => {
      const section = project.sections.find((item) => item.id === "diamond");
      return {
        time: section.time,
        start: section.start,
        end: section.end,
        moveDuration: section.moveDuration
      };
    });
    const box = await diamondBlock.boundingBox();
    expect(box).not.toBeNull();
    const startX = Math.max(viewportBox.x + 92, Math.min(viewportBox.x + viewportBox.width - 112, box.x + Math.min(box.width / 2, box.width - 4)));
    const startY = box.y + box.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.waitForTimeout(700);
    await page.mouse.move(startX + 56, startY, { steps: 8 });
    await expect(root.locator("[data-v2-floating-block-preview]")).toBeVisible();
    await expect(root.locator("[data-v2-drop-preview]")).toBeVisible();
    await expect(diamondBlock).toHaveClass(/is-dragging-source/);
    const ghostBox = await root.locator("[data-v2-floating-block-preview]").boundingBox();
    expect(ghostBox).not.toBeNull();
    expect(Math.abs((ghostBox.x + ghostBox.width / 2) - (startX + 56))).toBeLessThan(28);
    expect(await storedProject(page).then((project) => {
      const section = project.sections.find((item) => item.id === "diamond");
      return {
        time: section.time,
        start: section.start,
        end: section.end,
        moveDuration: section.moveDuration
      };
    })).toEqual(timingBefore);
    await expect(root.getByRole("button", { name: "실행 취소" })).toBeDisabled();
    await page.mouse.up();

    await expect(root.locator("[data-v2-floating-block-preview]")).toHaveCount(0);
    await expect(root.locator("[data-v2-drop-preview]")).toHaveCount(0);
    await expect.poll(() => storedProject(page).then((project) => {
      const section = project.sections.find((item) => item.id === "diamond");
      return {
        time: section.time,
        start: section.start,
        end: section.end,
        moveDuration: section.moveDuration
      };
    })).not.toEqual(timingBefore);
    await expect(root.getByRole("button", { name: "실행 취소" })).toBeEnabled();
  });

  test("long press body drag auto-pans the V2 timeline near viewport edges", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const moveBodyProject = {
      ...seededV2Project(),
      sections: [
        {
          ...seededV2Project().sections[0],
          time: 4,
          moveDuration: 4,
          start: 0,
          end: 4
        },
        {
          ...seededV2Project().sections[1],
          time: 8,
          moveDuration: 4,
          start: 4,
          end: 8
        },
        {
          ...seededV2Project().sections[1],
          id: "finale",
          name: "Finale Stack",
          time: 24,
          moveDuration: 4,
          start: 20,
          end: 24
        }
      ]
    };
    await seedProject(page, moveBodyProject);
    await page.goto("/v2");

    const root = page.locator("[data-v2-visual-editor]");
    const viewport = root.locator(".v2-formation-lane .v2-timeline-viewport");
    const viewportBox = await viewport.boundingBox();
    expect(viewportBox).not.toBeNull();
    await page.mouse.move(viewportBox.x + viewportBox.width - 20, viewportBox.y + 8);
    await page.mouse.wheel(0, 220);
    await page.waitForTimeout(100);

    const diamondBlock = root.locator('[data-v2-formation-block="diamond"][data-v2-segment-kind="hold"]');
    await expect(diamondBlock).toBeVisible();
    const timingBefore = await storedProject(page).then((project) => {
      const section = project.sections.find((item) => item.id === "diamond");
      return {
        time: section.time,
        start: section.start,
        end: section.end,
        moveDuration: section.moveDuration
      };
    });
    const beforePan = await v2TimelineNavigationState(root);
    const box = await diamondBlock.boundingBox();
    expect(box).not.toBeNull();
    const bodyStartX = box.x + Math.max(72, Math.min(box.width / 2, box.width - 72));
    const startX = Math.max(viewportBox.x + 42, Math.min(viewportBox.x + viewportBox.width - 72, bodyStartX));
    const startY = box.y + box.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.waitForTimeout(700);
    await page.mouse.move(viewportBox.x + viewportBox.width - 10, startY, { steps: 10 });
    await page.mouse.move(viewportBox.x + viewportBox.width - 6, startY, { steps: 6 });

    await expect(root.locator("[data-v2-floating-block-preview]")).toBeVisible();
    await expect(root.locator("[data-v2-drop-preview]")).toBeVisible();
    await expect.poll(async () => (await v2TimelineNavigationState(root)).transform).not.toBe(beforePan.transform);
    expect(await storedProject(page).then((project) => {
      const section = project.sections.find((item) => item.id === "diamond");
      return {
        time: section.time,
        start: section.start,
        end: section.end,
        moveDuration: section.moveDuration
      };
    })).toEqual(timingBefore);
    await page.mouse.up();
  });

  test("long press without movement on a V2 formation block does not add a timing edit", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedProject(page);
    await page.goto("/v2");

    const root = page.locator("[data-v2-visual-editor]");
    const diamondBlock = root.locator('[data-v2-formation-block="diamond"][data-v2-segment-kind="hold"]');
    await expect(diamondBlock).toBeVisible();
    const timingBefore = await storedProject(page).then((project) => project.sections.map((section) => ({
      id: section.id,
      time: section.time,
      start: section.start,
      end: section.end,
      moveDuration: section.moveDuration
    })));
    await expect(root.getByRole("button", { name: "실행 취소" })).toBeDisabled();
    const box = await diamondBlock.boundingBox();
    expect(box).not.toBeNull();

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(700);
    await page.mouse.up();

    const timingAfter = await storedProject(page).then((project) => project.sections.map((section) => ({
      id: section.id,
      time: section.time,
      start: section.start,
      end: section.end,
      moveDuration: section.moveDuration
    })));
    expect(timingAfter).toEqual(timingBefore);
    await expect(root.locator("[data-v2-floating-block-preview]")).toHaveCount(0);
    await expect(root.locator("[data-v2-drop-preview]")).toHaveCount(0);
    await expect(root.getByRole("button", { name: "실행 취소" })).toBeDisabled();
  });

  test("touch drag on a V2 formation block is not cancelled by browser panning", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedProject(page);
    await page.goto("/v2");

    const root = page.locator("[data-v2-visual-editor]");
    const introBlock = root.locator('[data-v2-formation-block="intro"][data-v2-segment-kind="hold"]');
    await expect(introBlock).toBeVisible();
    await page.evaluate(() => {
      window.__v2PointerCancelCount = 0;
      window.addEventListener("pointercancel", () => {
        window.__v2PointerCancelCount += 1;
      }, true);
    });
    const timingBefore = await storedProject(page).then((project) => project.sections.map((section) => ({
      id: section.id,
      time: section.time,
      start: section.start,
      end: section.end,
      moveDuration: section.moveDuration
    })));
    const beforeState = await v2TimelineNavigationState(root);
    await touchDrag(page, introBlock, -80, 0, 10);

    await expect.poll(() => page.evaluate(() => window.__v2PointerCancelCount)).toBe(0);
    const state = await v2TimelineNavigationState(root);
    expect(state.transform).not.toBe(beforeState.transform);
    expect(state.timecode).toBe(beforeState.timecode);
    const timingAfter = await storedProject(page).then((project) => project.sections.map((section) => ({
      id: section.id,
      time: section.time,
      start: section.start,
      end: section.end,
      moveDuration: section.moveDuration
    })));
    expect(timingAfter).toEqual(timingBefore);
  });

  test("move block click stays read-only and preserves current selection", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedProject(page);
    await page.goto("/v2");

    const root = page.locator("[data-v2-visual-editor]");
    const token = root.locator('[data-v2-performer-token="b2"]');
    await token.click();
    await expect(token).toHaveAttribute("aria-pressed", "true");

    await root.locator('[data-v2-segment-kind="move"][data-v2-formation-block="diamond"]').click();
    await expect(root.locator('[data-v2-formation-block="diamond"][data-v2-segment-kind="hold"]')).toHaveAttribute("aria-pressed", "false");
    await expect(token).toHaveAttribute("aria-pressed", "true");
    await expect(root.locator('[data-v2-timeline-handle="move-left"][data-v2-section-id="diamond"]')).toHaveCount(0);
  });

  test("edits V2 hold timing with dual handles while keeping move blocks read-only", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const compactTimingProject = {
      ...seededV2Project(),
      sections: [
        seededV2Project().sections[0],
        {
          ...seededV2Project().sections[1],
          time: 6,
          moveDuration: 2,
          start: 4,
          end: 6
        },
        {
          ...seededV2Project().sections[1],
          id: "finale",
          name: "Finale Stack",
          time: 18,
          moveDuration: 4,
          start: 14,
          end: 18
        }
      ]
    };
    await seedProject(page, compactTimingProject);
    await page.goto("/v2");

    const root = page.locator("[data-v2-visual-editor]");
    const viewport = root.locator(".v2-formation-lane .v2-timeline-viewport");
    const viewportBox = await viewport.boundingBox();
    expect(viewportBox).not.toBeNull();
    await page.mouse.move(viewportBox.x + viewportBox.width / 2, viewportBox.y + viewportBox.height / 2);
    await page.mouse.wheel(0, 180);
    await page.waitForTimeout(100);
    const introHoldHandle = root.locator('[data-v2-timeline-handle="hold-right"][data-v2-section-id="intro"]');
    await expect(introHoldHandle).toBeVisible();
    const holdBox = await introHoldHandle.boundingBox();
    expect(holdBox).not.toBeNull();
    await page.mouse.move(holdBox.x + holdBox.width / 2, holdBox.y + holdBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(holdBox.x + holdBox.width / 2 + 84, holdBox.y + holdBox.height / 2, { steps: 5 });
    await page.mouse.up();

    await expect.poll(async () => {
      const project = await storedProject(page);
      const diamond = project.sections.find((section) => section.id === "diamond");
      const finale = project.sections.find((section) => section.id === "finale");
      return {
        diamondMoveDuration: diamond.moveDuration,
        diamondTimeMoved: diamond.time > 6,
        finaleTimeMoved: finale.time > 18
      };
    }).toEqual({
      diamondMoveDuration: 0.5,
      diamondTimeMoved: false,
      finaleTimeMoved: false
    });

    await root.locator('[data-v2-segment-kind="move"][data-v2-formation-block="diamond"]').click();
    await expect(root.locator('[data-v2-timeline-handle="move-left"][data-v2-section-id="diamond"]')).toHaveCount(0);
    await expect(root.locator('[data-v2-segment-kind="move"][data-v2-formation-block="diamond"]')).not.toHaveClass(/is-selected/);
  });

  test("V2 hold right trim changes the next move while later formations stay fixed", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const compactTimingProject = {
      ...seededV2Project(),
      sections: [
        {
          ...seededV2Project().sections[0],
          time: 0,
          moveDuration: 0,
          start: 0,
          end: 0
        },
        {
          ...seededV2Project().sections[1],
          time: 6,
          moveDuration: 2,
          start: 4,
          end: 6
        },
        {
          ...seededV2Project().sections[1],
          id: "finale",
          name: "Finale Stack",
          time: 18,
          moveDuration: 4,
          start: 14,
          end: 18
        }
      ]
    };
    await seedProject(page, compactTimingProject);
    await page.goto("/v2");

    const root = page.locator("[data-v2-visual-editor]");
    const viewport = root.locator(".v2-formation-lane .v2-timeline-viewport");
    const viewportBox = await viewport.boundingBox();
    expect(viewportBox).not.toBeNull();
    const introBlock = root.locator('[data-v2-formation-block="intro"][data-v2-segment-kind="hold"]');
    await expect(introBlock).toHaveAttribute("aria-pressed", "true");
    const rightHandle = root.locator('[data-v2-timeline-handle="hold-right"][data-v2-section-id="intro"]');
    await expect(rightHandle).toBeVisible();
    const navigationBefore = await v2TimelineNavigationState(root);
    const shrinkHandleBox = await rightHandle.boundingBox();
    expect(shrinkHandleBox).not.toBeNull();
    const shrinkStartX = shrinkHandleBox.x + shrinkHandleBox.width / 2 + 16;
    const shrinkStartY = shrinkHandleBox.y + shrinkHandleBox.height / 2;
    await page.mouse.move(shrinkStartX, shrinkStartY);
    await page.mouse.down();
    await page.mouse.move(shrinkStartX - V2_TIMELINE_PIXELS_PER_SECOND, shrinkStartY, { steps: 6 });
    await page.mouse.up();

    await expect.poll(async () => {
      const project = await storedProject(page);
      return project.sections.map((section) => ({
        id: section.id,
        start: section.start,
        end: section.end,
        time: section.time,
        moveDuration: section.moveDuration
      }));
    }).toEqual([
      { id: "intro", start: 0, end: 0, time: 0, moveDuration: 0 },
      { id: "diamond", start: 3, end: 6, time: 6, moveDuration: 3 },
      { id: "finale", start: 14, end: 18, time: 18, moveDuration: 4 }
    ]);
    await expect(introBlock).toHaveAttribute("aria-pressed", "true");
    expect((await v2TimelineNavigationState(root)).transform).toBe(navigationBefore.transform);
    await expectNoV2CompetingTimelineGesture(root);

    const postShrinkHitTarget = await page.evaluate(() => {
      const handle = document.querySelector('[data-v2-timeline-handle="hold-right"][data-v2-section-id="intro"]');
      const handleRect = handle?.getBoundingClientRect();
      const hit = handleRect
        ? document.elementFromPoint(handleRect.left + handleRect.width / 2, handleRect.top + handleRect.height / 2)
        : null;
      return {
        hitHandle: hit?.getAttribute("data-v2-timeline-handle") || "",
        hitSectionId: hit?.getAttribute("data-v2-section-id") || ""
      };
    });
    expect(postShrinkHitTarget).toEqual({ hitHandle: "hold-right", hitSectionId: "intro" });

    const expandedHandleBox = await rightHandle.boundingBox();
    expect(expandedHandleBox).not.toBeNull();
    await page.mouse.move(expandedHandleBox.x + expandedHandleBox.width / 2, expandedHandleBox.y + expandedHandleBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(expandedHandleBox.x + expandedHandleBox.width / 2 + V2_TIMELINE_PIXELS_PER_SECOND * 2, expandedHandleBox.y + expandedHandleBox.height / 2, { steps: 6 });
    await page.mouse.up();

    await expect.poll(async () => {
      const project = await storedProject(page);
      return project.sections.map((section) => ({
        id: section.id,
        start: section.start,
        end: section.end,
        time: section.time,
        moveDuration: section.moveDuration
      }));
    }).toEqual([
      { id: "intro", start: 0, end: 0, time: 0, moveDuration: 0 },
      { id: "diamond", start: 5, end: 6, time: 6, moveDuration: 1 },
      { id: "finale", start: 14, end: 18, time: 18, moveDuration: 4 }
    ]);
  });

  test("V2 hold right trim propagates through a half-second-minimum adjacent chain", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const chainProject = {
      ...seededV2Project(),
      sections: [
        {
          ...seededV2Project().sections[0],
          time: 0,
          moveDuration: 0,
          start: 0,
          end: 0
        },
        {
          ...seededV2Project().sections[1],
          time: 4,
          moveDuration: 0,
          start: 4,
          end: 4
        },
        {
          ...seededV2Project().sections[1],
          id: "bridge",
          name: "Bridge Stack",
          time: 8,
          moveDuration: 0,
          start: 8,
          end: 8
        },
        {
          ...seededV2Project().sections[1],
          id: "finale",
          name: "Finale Stack",
          time: 16,
          moveDuration: 4,
          start: 12,
          end: 16
        }
      ]
    };
    await seedProject(page, chainProject);
    await page.goto("/v2");

    const root = page.locator("[data-v2-visual-editor]");
    const rightHandle = root.locator('[data-v2-timeline-handle="hold-right"][data-v2-section-id="intro"]');
    await expect(rightHandle).toBeVisible();
    const handleBox = await rightHandle.boundingBox();
    expect(handleBox).not.toBeNull();
    const startX = handleBox.x + handleBox.width / 2;
    const startY = handleBox.y + handleBox.height / 2;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + V2_TIMELINE_PIXELS_PER_SECOND * 2, startY, { steps: 8 });
    await page.mouse.up();

    await expect.poll(async () => {
      const project = await storedProject(page);
      return project.sections.map((section) => ({
        id: section.id,
        start: section.start,
        end: section.end,
        time: section.time,
        moveDuration: section.moveDuration
      }));
    }).toEqual([
      { id: "intro", start: 0, end: 0, time: 0, moveDuration: 0 },
      { id: "diamond", start: 6, end: 6.5, time: 6.5, moveDuration: 0.5 },
      { id: "bridge", start: 10.5, end: 11, time: 11, moveDuration: 0.5 },
      { id: "finale", start: 15, end: 16, time: 16, moveDuration: 1 }
    ]);
    await expectNoV2CompetingTimelineGesture(root);
  });

  test("V2 hold right trim responds to touch drag from the widened handle target", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const compactTimingProject = {
      ...seededV2Project(),
      sections: [
        {
          ...seededV2Project().sections[0],
          time: 0,
          moveDuration: 0,
          start: 0,
          end: 0
        },
        {
          ...seededV2Project().sections[1],
          time: 6,
          moveDuration: 2,
          start: 4,
          end: 6
        },
        {
          ...seededV2Project().sections[1],
          id: "finale",
          name: "Finale Stack",
          time: 18,
          moveDuration: 4,
          start: 14,
          end: 18
        }
      ]
    };
    await seedProject(page, compactTimingProject);
    await page.goto("/v2");

    const root = page.locator("[data-v2-visual-editor]");
    const rightHandle = root.locator('[data-v2-timeline-handle="hold-right"][data-v2-section-id="intro"]');
    await expect(rightHandle).toBeVisible();
    await touchDrag(page, rightHandle, -V2_TIMELINE_PIXELS_PER_SECOND, 0, 8);

    await expect.poll(async () => {
      const project = await storedProject(page);
      return project.sections.map((section) => ({
        id: section.id,
        start: section.start,
        end: section.end,
        time: section.time,
        moveDuration: section.moveDuration
      }));
    }).toEqual([
      { id: "intro", start: 0, end: 0, time: 0, moveDuration: 0 },
      { id: "diamond", start: 3, end: 6, time: 6, moveDuration: 3 },
      { id: "finale", start: 14, end: 18, time: 18, moveDuration: 4 }
    ]);
    await expectNoV2CompetingTimelineGesture(root);
  });

  test("V2 last hold right trim updates the selected F2 hold duration", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const twoFormationProject = {
      ...seededV2Project(),
      sections: [
        {
          ...seededV2Project().sections[0],
          time: 0,
          moveDuration: 0,
          start: 0,
          end: 0
        },
        {
          ...seededV2Project().sections[1],
          time: 6,
          moveDuration: 2,
          start: 4,
          end: 6
        }
      ]
    };
    await seedProject(page, twoFormationProject);
    await page.goto("/v2");

    const root = page.locator("[data-v2-visual-editor]");
    const viewport = root.locator(".v2-formation-lane .v2-timeline-viewport");
    const viewportBox = await viewport.boundingBox();
    expect(viewportBox).not.toBeNull();
    await page.mouse.move(viewportBox.x + viewportBox.width / 2, viewportBox.y + viewportBox.height / 2);
    await page.mouse.wheel(0, 280);
    await page.waitForTimeout(100);

    const f2Block = root.locator('[data-v2-formation-block="diamond"][data-v2-segment-kind="hold"]');
    await f2Block.click();
    await expect(f2Block).toHaveAttribute("aria-pressed", "true");
    const rightHandle = root.locator('[data-v2-timeline-handle="hold-right"][data-v2-section-id="diamond"]');
    await expect(rightHandle).toBeVisible();
    const widthBefore = await f2Block.evaluate((node) => node.getBoundingClientRect().width);
    const handleBox = await rightHandle.boundingBox();
    expect(handleBox).not.toBeNull();
    const startX = handleBox.x + handleBox.width / 2 + 16;
    const startY = handleBox.y + handleBox.height / 2;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + V2_TIMELINE_PIXELS_PER_SECOND, startY, { steps: 6 });
    await page.mouse.up();

    await expect.poll(async () => {
      const project = await storedProject(page);
      const f2 = project.sections.find((section) => section.id === "diamond");
      return {
        time: f2.time,
        start: f2.start,
        end: f2.end,
        moveDuration: f2.moveDuration,
        holdDuration: f2.holdDuration
      };
    }).toEqual({
      time: 6,
      start: 4,
      end: 6,
      moveDuration: 2,
      holdDuration: 5
    });
    await expect.poll(() => f2Block.evaluate((node) => node.getBoundingClientRect().width)).toBeGreaterThan(widthBefore);
    await expectNoV2CompetingTimelineGesture(root);
  });

  test("V2 hold right trim stays on the block edge while its hit target remains reachable after scroll", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const compactTimingProject = {
      ...seededV2Project(),
      sections: [
        {
          ...seededV2Project().sections[0],
          time: 0,
          moveDuration: 0,
          start: 0,
          end: 0
        },
        {
          ...seededV2Project().sections[1],
          time: 6,
          moveDuration: 2,
          start: 4,
          end: 6
        },
        {
          ...seededV2Project().sections[1],
          id: "finale",
          name: "Finale Stack",
          time: 18,
          moveDuration: 4,
          start: 14,
          end: 18
        }
      ]
    };
    await seedProject(page, compactTimingProject);
    await page.goto("/v2");

    const root = page.locator("[data-v2-visual-editor]");
    const viewport = root.locator(".v2-formation-lane .v2-timeline-viewport");
    const viewportBox = await viewport.boundingBox();
    expect(viewportBox).not.toBeNull();
    await page.mouse.move(viewportBox.x + viewportBox.width / 2, viewportBox.y + viewportBox.height / 2);
    await page.mouse.wheel(0, 80);
    await page.waitForTimeout(100);

    const introBlock = root.locator('[data-v2-formation-block="intro"][data-v2-segment-kind="hold"]');
    await expect(introBlock).toHaveAttribute("aria-pressed", "true");
    const rightHandle = root.locator('[data-v2-timeline-handle="hold-right"][data-v2-section-id="intro"]');
    await expect(rightHandle).toBeVisible();
    await expect.poll(() => rightHandle.evaluate((node) => node.getBoundingClientRect().width)).toBe(56);
    const hitTargetState = await page.evaluate(() => {
      const handle = document.querySelector('[data-v2-timeline-handle="hold-right"][data-v2-section-id="intro"]');
      const block = document.querySelector('[data-v2-formation-block="intro"][data-v2-segment-kind="hold"]');
      const moveBlock = document.querySelector('[data-v2-formation-block="diamond"][data-v2-segment-kind="move"]');
      const viewport = document.querySelector(".v2-formation-lane .v2-timeline-viewport");
      const handleRect = handle?.getBoundingClientRect();
      const blockRect = block?.getBoundingClientRect();
      const moveRect = moveBlock?.getBoundingClientRect();
      const viewportRect = viewport?.getBoundingClientRect();
      const after = handle ? getComputedStyle(handle, "::after") : null;
      const afterWidth = Number.parseFloat(after?.width || "0");
      const afterLeft = Number.parseFloat(after?.left || "0");
      const visibleBarCenterX = handleRect && Number.isFinite(afterWidth) && Number.isFinite(afterLeft)
        ? handleRect.left + afterLeft + afterWidth / 2
        : null;
      const hit = handleRect
        ? document.elementFromPoint(handleRect.left + handleRect.width / 2, handleRect.top + handleRect.height / 2)
        : null;
      const moveCenterHit = moveRect
        ? document.elementFromPoint(moveRect.left + moveRect.width / 2, moveRect.top + moveRect.height / 2)
        : null;
      const moveCenterBlock = moveCenterHit?.closest?.("[data-v2-segment-kind]") || null;
      return {
        hitHandle: hit?.getAttribute("data-v2-timeline-handle") || "",
        hitSectionId: hit?.getAttribute("data-v2-section-id") || "",
        moveCenterKind: moveCenterBlock?.getAttribute("data-v2-segment-kind") || "",
        moveCenterSectionId: moveCenterBlock?.getAttribute("data-v2-formation-block") || "",
        visibleBarDistanceFromBlockEdge: blockRect && visibleBarCenterX !== null
          ? Math.abs(visibleBarCenterX - blockRect.right)
          : null,
        visibleBarDistanceFromViewportEdge: viewportRect && visibleBarCenterX !== null
          ? Math.abs(visibleBarCenterX - viewportRect.left)
          : null
      };
    });
    expect(hitTargetState.hitHandle).toBe("hold-right");
    expect(hitTargetState.hitSectionId).toBe("intro");
    expect(hitTargetState.moveCenterKind).toBe("move");
    expect(hitTargetState.moveCenterSectionId).toBe("diamond");
    expect(hitTargetState.visibleBarDistanceFromBlockEdge).not.toBeNull();
    expect(hitTargetState.visibleBarDistanceFromBlockEdge).toBeLessThanOrEqual(2);
    expect(hitTargetState.visibleBarDistanceFromViewportEdge).not.toBeNull();
    expect(hitTargetState.visibleBarDistanceFromViewportEdge).toBeGreaterThan(24);
    await expect.poll(() => v2TimelineHandleHitMap(
      page,
      '[data-v2-timeline-handle="hold-right"][data-v2-section-id="intro"]',
      [-24, -16, -8, 0, 8, 16, 24]
    )).toEqual([
      { offset: -24, hitHandle: "hold-right", hitSectionId: "intro", hitSegmentKind: "" },
      { offset: -16, hitHandle: "hold-right", hitSectionId: "intro", hitSegmentKind: "" },
      { offset: -8, hitHandle: "hold-right", hitSectionId: "intro", hitSegmentKind: "" },
      { offset: 0, hitHandle: "hold-right", hitSectionId: "intro", hitSegmentKind: "" },
      { offset: 8, hitHandle: "hold-right", hitSectionId: "intro", hitSegmentKind: "" },
      { offset: 16, hitHandle: "hold-right", hitSectionId: "intro", hitSegmentKind: "" },
      { offset: 24, hitHandle: "hold-right", hitSectionId: "intro", hitSegmentKind: "" }
    ]);

    const shrinkHandleBox = await rightHandle.boundingBox();
    expect(shrinkHandleBox).not.toBeNull();
    const shrinkStartX = shrinkHandleBox.x + shrinkHandleBox.width / 2 + 16;
    const shrinkStartY = shrinkHandleBox.y + shrinkHandleBox.height / 2;
    await page.mouse.move(shrinkStartX, shrinkStartY);
    await page.mouse.down();
    await page.mouse.move(shrinkStartX - V2_TIMELINE_PIXELS_PER_SECOND, shrinkStartY, { steps: 6 });
    await page.mouse.up();

    await expect.poll(async () => {
      const project = await storedProject(page);
      return project.sections.map((section) => ({
        id: section.id,
        start: section.start,
        end: section.end,
        time: section.time,
        moveDuration: section.moveDuration
      }));
    }).toEqual([
      { id: "intro", start: 0, end: 0, time: 0, moveDuration: 0 },
      { id: "diamond", start: 3, end: 6, time: 6, moveDuration: 3 },
      { id: "finale", start: 14, end: 18, time: 18, moveDuration: 4 }
    ]);

    const expandedHandleBox = await rightHandle.boundingBox();
    expect(expandedHandleBox).not.toBeNull();
    await page.mouse.move(expandedHandleBox.x + expandedHandleBox.width / 2, expandedHandleBox.y + expandedHandleBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(expandedHandleBox.x + expandedHandleBox.width / 2 + V2_TIMELINE_PIXELS_PER_SECOND * 2, expandedHandleBox.y + expandedHandleBox.height / 2, { steps: 6 });
    await page.mouse.up();

    await expect.poll(async () => {
      const project = await storedProject(page);
      return project.sections.map((section) => ({
        id: section.id,
        start: section.start,
        end: section.end,
        time: section.time,
        moveDuration: section.moveDuration
      }));
    }).toEqual([
      { id: "intro", start: 0, end: 0, time: 0, moveDuration: 0 },
      { id: "diamond", start: 5, end: 6, time: 6, moveDuration: 1 },
      { id: "finale", start: 14, end: 18, time: 18, moveDuration: 4 }
    ]);
  });

  test("pointercancel clears V2 hold trim drag indicators", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const compactTimingProject = {
      ...seededV2Project(),
      sections: [
        seededV2Project().sections[0],
        {
          ...seededV2Project().sections[1],
          time: 6,
          moveDuration: 2,
          start: 4,
          end: 6
        }
      ]
    };
    await seedProject(page, compactTimingProject);
    await page.goto("/v2");

    const root = page.locator("[data-v2-visual-editor]");
    await root.locator('[data-v2-formation-block="diamond"][data-v2-segment-kind="hold"]').click();
    const holdHandle = root.locator('[data-v2-timeline-handle="hold-left"][data-v2-section-id="diamond"]');
    await expect(holdHandle).toBeVisible();
    const handleBox = await holdHandle.boundingBox();
    expect(handleBox).not.toBeNull();
    const startX = handleBox.x + handleBox.width / 2;
    const startY = handleBox.y + handleBox.height / 2;

    await holdHandle.dispatchEvent("pointerdown", {
      button: 0,
      buttons: 1,
      clientX: startX,
      clientY: startY,
      pointerId: 91,
      pointerType: "mouse"
    });
    await page.evaluate(({ clientX, clientY }) => {
      window.dispatchEvent(new PointerEvent("pointermove", {
        bubbles: true,
        button: 0,
        buttons: 1,
        clientX,
        clientY,
        pointerId: 91,
        pointerType: "mouse"
      }));
    }, { clientX: startX - 280, clientY: startY });
    await expect(root.locator('[data-v2-formation-block="diamond"][data-v2-blocked-edge="left"]')).toHaveCount(1);

    await page.evaluate(({ clientX, clientY }) => {
      window.dispatchEvent(new PointerEvent("pointercancel", {
        bubbles: true,
        button: 0,
        buttons: 0,
        clientX,
        clientY,
        pointerId: 91,
        pointerType: "mouse"
      }));
    }, { clientX: startX - 280, clientY: startY });

    await expect(root.locator("[data-v2-blocked-edge]")).toHaveCount(0);
    await expect(root.locator("[data-v2-reorder-preview]")).toHaveCount(0);
    await expect(root.locator(".v2-snapline")).toHaveCount(0);
  });

  test("pointercancel clears V2 body drag ghost and drop preview without mutation", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedProject(page);
    await page.goto("/v2");

    const root = page.locator("[data-v2-visual-editor]");
    const diamondBlock = root.locator('[data-v2-formation-block="diamond"][data-v2-segment-kind="hold"]');
    await expect(diamondBlock).toBeVisible();
    const timingBefore = await storedProject(page).then((project) => project.sections.map((section) => ({
      id: section.id,
      time: section.time,
      start: section.start,
      end: section.end,
      moveDuration: section.moveDuration
    })));
    const box = await diamondBlock.boundingBox();
    expect(box).not.toBeNull();
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;

    await diamondBlock.dispatchEvent("pointerdown", {
      bubbles: true,
      button: 0,
      buttons: 1,
      clientX: startX,
      clientY: startY,
      isPrimary: true,
      pointerId: 93,
      pointerType: "mouse"
    });
    await page.waitForTimeout(700);
    await page.evaluate(({ clientX, clientY }) => {
      window.dispatchEvent(new PointerEvent("pointermove", {
        bubbles: true,
        button: 0,
        buttons: 1,
        clientX,
        clientY,
        isPrimary: true,
        pointerId: 93,
        pointerType: "mouse"
      }));
    }, { clientX: startX + 52, clientY: startY });
    await expect(root.locator("[data-v2-floating-block-preview]")).toBeVisible();
    await expect(root.locator("[data-v2-drop-preview]")).toBeVisible();

    await page.evaluate(({ clientX, clientY }) => {
      window.dispatchEvent(new PointerEvent("pointercancel", {
        bubbles: true,
        button: 0,
        buttons: 0,
        clientX,
        clientY,
        isPrimary: true,
        pointerId: 93,
        pointerType: "mouse"
      }));
    }, { clientX: startX + 52, clientY: startY });

    await expect(root.locator("[data-v2-floating-block-preview]")).toHaveCount(0);
    await expect(root.locator("[data-v2-drop-preview]")).toHaveCount(0);
    await expect(root.locator("[data-v2-blocked-edge]")).toHaveCount(0);
    await expect(root.getByRole("button", { name: "실행 취소" })).toBeDisabled();
    expect(await storedProject(page).then((project) => project.sections.map((section) => ({
      id: section.id,
      time: section.time,
      start: section.start,
      end: section.end,
      moveDuration: section.moveDuration
    })))).toEqual(timingBefore);
  });

  test("organizes V2 top menus, settings submenu, transport undo redo, and default bottom modes", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedProject(page);
    await page.goto("/v2");

    const root = page.locator("[data-v2-visual-editor]");
    const rail = root.locator("[data-v2-bottom-rail]");

    await expect(root.getByRole("button", { name: "공유" })).toBeVisible();
    await expect(root.getByRole("button", { name: "내보내기" })).toBeVisible();
    await expect(root.getByRole("button", { name: "더보기" })).toBeVisible();
    await expect(root.getByRole("button", { name: "편집 메뉴" })).toHaveCount(0);
    const topbarMetrics = await root.locator(".v2-topbar").evaluate((topbar) => {
      const rect = topbar.getBoundingClientRect();
      const actionRects = Array.from(topbar.querySelectorAll(".v2-top-actions .v2-icon-button")).map((button) => {
        const buttonRect = button.getBoundingClientRect();
        return { width: buttonRect.width, height: buttonRect.height };
      });
      return { height: rect.height, actionRects };
    });
    expect(topbarMetrics.height).toBeGreaterThanOrEqual(42);
    expect(topbarMetrics.actionRects).toHaveLength(3);
    for (const actionRect of topbarMetrics.actionRects) {
      expect(actionRect.width).toBeGreaterThanOrEqual(34);
      expect(actionRect.height).toBeGreaterThanOrEqual(34);
    }
    await expect(root.getByRole("button", { name: "실행 취소" })).toBeDisabled();
    await expect(root.getByRole("button", { name: "다시 실행" })).toBeDisabled();
    await expect(root.getByRole("button", { name: "타임라인 설정" })).toHaveCount(0);
    await expect(root.getByRole("tab")).toHaveCount(0);

    await expect(rail.getByRole("button", { name: "Stage" })).toBeEnabled();
    await expect(rail.getByRole("button", { name: "Timeline" })).toBeEnabled();
    await expect(rail.getByRole("button", { name: "Cast" })).toBeEnabled();
    await expect(rail.getByRole("button", { name: "Stage" })).toHaveClass(/is-active/);
    const stageSurface = root.locator('[data-v2-tab-surface="Stage"]');
    await expect(stageSurface).toHaveCount(0);
    await expect(root.locator("[data-v2-stage]").getByRole("button", { name: "Stage references" })).toHaveCount(0);
    const visualStage = root.locator("[data-v2-stage]");
    const stageInfoLine = root.locator("[data-v2-stage-info-line]");
    await expect(stageInfoLine).toBeVisible();
    await expect(stageInfoLine).toContainText("Snap on · 12x8 · 1m grid");
    await expect(visualStage.locator("[data-v2-stage-grid]")).toBeVisible();
    await expect(visualStage.locator("[data-v2-stage-guides]")).toBeVisible();
    const guideMetrics = await visualStage.evaluate((stageNode) => {
      const surface = stageNode.querySelector(".v2-stage-surface");
      const rect = surface.getBoundingClientRect();
      const grid = surface.querySelector("[data-v2-stage-grid]");
      const center = surface.querySelector("line.v2-stage-guide-neutral");
      const audience = stageNode.querySelector("[data-v2-audience-guide]");
      const caution = surface.querySelector("[data-v2-caution-zone]");
      const audienceRect = audience?.getBoundingClientRect();
      const surfaceRect = surface.getBoundingClientRect();
      const cautionRect = caution?.getBoundingClientRect();
      const style = grid ? getComputedStyle(grid) : null;
      const cautionStyle = caution ? getComputedStyle(caution) : null;
      const token = surface.querySelector(".v2-token");
      const tokenRect = token?.getBoundingClientRect();
      const tokenStyle = token ? getComputedStyle(token) : null;
      const cellWidth = rect.width / 12;
      const cellHeight = rect.height / 8;
      return {
        audienceInsideSurface: Boolean(surface.querySelector("[data-v2-audience-guide]")),
        audienceTopAfterSurface: audienceRect ? Math.round(audienceRect.top - surfaceRect.bottom) : null,
        audienceIsCautionZone: audience?.hasAttribute("data-v2-caution-zone") || false,
        audienceText: audience?.textContent?.trim() || "",
        cautionTopRatio: cautionRect ? Math.round(((cautionRect.top - rect.top) / rect.height) * 100) : null,
        cautionBackground: cautionStyle?.backgroundImage || "",
        cautionOpacity: cautionStyle?.opacity || "",
        centerX: center?.getAttribute("x1"),
        centerY1: center?.getAttribute("y1"),
        centerY2: center?.getAttribute("y2"),
        gridBackgroundImage: style?.backgroundImage || "",
        gridBackgroundSize: style?.backgroundSize || "",
        tokenHeight: tokenRect?.height || 0,
        tokenWidth: tokenRect?.width || 0,
        expectedTokenSize: Math.max(18, Math.min(34, Math.min(cellWidth, cellHeight) * 0.8)),
        tokenFontSize: Number.parseFloat(tokenStyle?.fontSize || "0"),
        tokenBoxShadow: tokenStyle?.boxShadow || ""
      };
    });
    expect(guideMetrics.centerX).toBe("50");
    expect(guideMetrics.centerY1).toBe("0");
    expect(guideMetrics.centerY2).toBe("100");
    expect(guideMetrics.cautionTopRatio).toBe(75);
    expect(guideMetrics.audienceInsideSurface).toBe(false);
    expect(guideMetrics.audienceTopAfterSurface).toBeGreaterThanOrEqual(0);
    expect(guideMetrics.audienceIsCautionZone).toBe(false);
    expect(guideMetrics.audienceText).toBe("");
    expect(guideMetrics.cautionBackground).not.toContain("radial-gradient");
    expect(guideMetrics.gridBackgroundImage).toContain("rgba(226, 232, 240, 0.18)");
    expect(guideMetrics.gridBackgroundSize).toContain("8.333");
    expect(guideMetrics.gridBackgroundSize).toContain("12.5");
    expect(guideMetrics.tokenWidth).toBeCloseTo(guideMetrics.expectedTokenSize, 0);
    expect(guideMetrics.tokenHeight).toBeCloseTo(guideMetrics.expectedTokenSize, 0);
    expect(guideMetrics.tokenWidth).toBeGreaterThanOrEqual(18);
    expect(guideMetrics.tokenWidth).toBeLessThanOrEqual(34);
    expect(guideMetrics.tokenFontSize).toBeGreaterThanOrEqual(7.5);
    const stageAspect = await visualStage.locator(".v2-stage-surface").evaluate((surface) => {
      const rect = surface.getBoundingClientRect();
      return {
        ratio: Number((rect.width / rect.height).toFixed(2)),
        cellWidth: Number((rect.width / 12).toFixed(2)),
        cellHeight: Number((rect.height / 8).toFixed(2))
      };
    });
    expect(stageAspect.ratio).toBeCloseTo(1.5, 1);
    expect(Math.abs(stageAspect.cellWidth - stageAspect.cellHeight)).toBeLessThanOrEqual(0.5);
    await rail.getByRole("button", { name: "Timeline" }).click();
    await expect(rail.getByRole("button", { name: "Timeline" })).toHaveClass(/is-active/);
    const timelineSurface = root.locator('[data-v2-tab-surface="Timeline"]');
    await expect(timelineSurface).toBeVisible();
    await expect(timelineSurface.getByRole("button", { name: "대형 추가" })).toBeVisible();
    await root.locator('[data-v2-formation-block="diamond"][data-v2-segment-kind="hold"]').click();
    await expect(timelineSurface).toContainText("Selected:");
    await expect(timelineSurface).toContainText("Trim enabled");
    await expect(timelineSurface).toContainText(/\d+\.\ds - \d+\.\ds/);
    await rail.getByRole("button", { name: "해제" }).click();
    await expect(rail.getByRole("button", { name: "Cast" })).toBeEnabled();
    await rail.getByRole("button", { name: "Cast" }).click();
    await expect(rail.getByRole("button", { name: "Cast" })).toHaveClass(/is-active/);
    const castSurface = root.locator('[data-v2-tab-surface="Cast"]');
    await expect(castSurface).toBeVisible();
    await castSurface.getByRole("button", { name: /B2/ }).click();
    await expect(root.locator('[data-v2-performer-token="b2"]')).toHaveAttribute("aria-pressed", "true");
    await expect(castSurface).toContainText("B2");
    await expect(castSurface).toContainText("선택됨");
    await expect(castSurface.getByRole("button", { name: "복제" })).toBeEnabled();
    await expect(castSurface.getByRole("button", { name: "삭제" })).toBeEnabled();
    await expect(castSurface.getByRole("button", { name: "역할" })).toBeEnabled();
    await castSurface.getByRole("button", { name: "해제" }).click();
    await expect(root.locator(".v2-token[aria-pressed='true']")).toHaveCount(0);

    await root.getByRole("button", { name: "더보기" }).click();
    await expect(root.getByRole("menu", { name: "더보기 메뉴" })).toBeVisible();
    await expect(root.getByRole("menu", { name: "더보기 메뉴" })).not.toContainText("프로젝트 JSON 내보내기");
    await expect(root.getByRole("menu", { name: "더보기 메뉴" })).not.toContainText("현재 PNG");
    await expect(root.getByRole("menu", { name: "더보기 메뉴" })).not.toContainText("전체 대형 PNG");
    await expect(root.getByRole("menu", { name: "더보기 메뉴" })).not.toContainText("인쇄/PDF");
    await expect(root.getByRole("menu", { name: "Settings 메뉴" })).toHaveCount(0);
    const settingsMenuItem = root.getByRole("menuitem", { name: /Settings/ });
    await expect(settingsMenuItem).toContainText("›");
    await settingsMenuItem.click();
    const settingsMenu = root.getByRole("menu", { name: "Settings 메뉴" });
    await expect(settingsMenu).toBeVisible();
    await expect(settingsMenuItem).toContainText("‹");
    const snap = settingsMenu.getByRole("menuitemcheckbox", { name: /Snap/ });
    const beforeSnap = await snap.getAttribute("aria-checked");
    await snap.click();
    await expect(snap).toHaveAttribute("aria-checked", beforeSnap === "true" ? "false" : "true");
    await expect(stageInfoLine).toContainText(beforeSnap === "true" ? "Snap off · 12x8 · free move" : "Snap on · 12x8 · 1m grid");
    const stageReferences = settingsMenu.getByRole("menuitemcheckbox", { name: /Stage references/ });
    await expect(stageReferences).toHaveAttribute("aria-checked", "true");
    await stageReferences.click();
    await expect(stageReferences).toHaveAttribute("aria-checked", "false");
    await expect(visualStage.locator("[data-v2-stage-grid]")).toBeVisible();
    await expect(visualStage.locator("[data-v2-stage-guides]")).toHaveCount(0);
    await stageReferences.click();
    await expect(stageReferences).toHaveAttribute("aria-checked", "true");
    await expect(visualStage.locator("[data-v2-stage-guides]")).toBeVisible();
    const referenceLabels = settingsMenu.getByRole("menuitemcheckbox", { name: /Reference labels/ });
    await expect(referenceLabels).toHaveAttribute("aria-checked", "true");
    await referenceLabels.click();
    await expect(referenceLabels).toHaveAttribute("aria-checked", "false");
    await expect(visualStage.locator(".v2-stage-guide-label")).toHaveCount(0);
    await expect(visualStage.locator("[data-v2-stage-guides]")).toBeVisible();
    await expect(visualStage.locator("[data-v2-audience-guide]")).toBeVisible();
    await expect(visualStage.locator("[data-v2-audience-guide]")).not.toContainText("관객");
    const cautionSetting = root.locator("[data-v2-caution-setting]");
    await expect(cautionSetting).toBeVisible();
    const cautionInput = cautionSetting.getByRole("spinbutton", { name: "앞쪽 주의 구역" });
    await expect(cautionInput).toHaveValue("6");
    const beforeCautionTop = await visualStage.locator("[data-v2-caution-zone]").evaluate((node) => {
      const stageRect = node.parentElement.getBoundingClientRect();
      const rect = node.getBoundingClientRect();
      return Math.round(((rect.top - stageRect.top) / stageRect.height) * 100);
    });
    await cautionSetting.getByRole("button", { name: "앞쪽 주의 구역 늘리기" }).click();
    await expect(cautionInput).toHaveValue("7");
    const afterCautionTop = await visualStage.locator("[data-v2-caution-zone]").evaluate((node) => {
      const stageRect = node.parentElement.getBoundingClientRect();
      const rect = node.getBoundingClientRect();
      return Math.round(((rect.top - stageRect.top) / stageRect.height) * 100);
    });
    expect(afterCautionTop).toBeGreaterThan(beforeCautionTop);
    await settingsMenuItem.click();
    await expect(settingsMenu).toHaveCount(0);
    await expect(settingsMenuItem).toContainText("›");

    await page.keyboard.press("Escape");
    await expect(root.getByRole("menu", { name: "더보기 메뉴" })).toHaveCount(0);

    await root.getByRole("button", { name: "공유" }).click();
    const shareMenu = root.getByRole("menu", { name: "공유 메뉴" });
    await expect(shareMenu).toBeVisible();
    await expect(shareMenu).toContainText("View");
    await expect(shareMenu).toContainText("Edit");
    await expect(shareMenu).toContainText("보기 링크");
    await expect(shareMenu).toContainText("편집 링크");
    await expect(shareMenu).not.toContainText("프로젝트 JSON 내보내기");
    await expect(shareMenu).not.toContainText("현재 PNG");
    await expect(shareMenu).not.toContainText("인쇄/PDF");

    await root.getByRole("button", { name: "내보내기" }).click();
    const exportMenu = root.getByRole("menu", { name: "내보내기 메뉴" });
    await expect(exportMenu).toBeVisible();
    await expect(exportMenu).toContainText("Project backup");
    await expect(exportMenu).toContainText("Recovery file");
    await expect(exportMenu).toContainText("Current view");
    await expect(exportMenu).toContainText("All formations");
    await expect(exportMenu.getByRole("menuitem", { name: /프로젝트 JSON 내보내기/ })).toBeVisible();
    await expect(exportMenu.getByRole("menuitem", { name: /현재 PNG/ })).toBeVisible();
    await expect(exportMenu.getByRole("menuitem", { name: /전체 대형 PNG/ })).toBeVisible();
    await expect(exportMenu.getByRole("menuitem", { name: /인쇄\/PDF/ })).toBeVisible();
    await expect(exportMenu).not.toContainText("보기 링크");
    await expect(exportMenu).not.toContainText("편집 링크");
  });

  test("drives bottom rail actions from V2 selection context", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedProject(page);
    await page.goto("/v2");

    const root = page.locator("[data-v2-visual-editor]");
    const rail = page.locator("[data-v2-bottom-rail]");
    await expect(rail.getByRole("button", { name: "Stage" })).toBeEnabled();
    await expect(rail.getByRole("button", { name: "Timeline" })).toBeEnabled();
    await expect(rail.getByRole("button", { name: "Cast" })).toBeEnabled();
    await expect(rail.getByRole("button", { name: "복제" })).toHaveCount(0);

    await root.locator('[data-v2-formation-block="diamond"][data-v2-segment-kind="hold"]').click();
    await expect(rail.getByRole("button", { name: "복제" })).toBeEnabled();
    await expect(rail.getByRole("button", { name: "삭제" })).toBeEnabled();
    await expect(rail.getByRole("button", { name: "Timing" })).toBeEnabled();
    await rail.getByRole("button", { name: "복제" }).click();
    await expect.poll(async () => {
      const project = await storedProject(page);
      return project.sections.length;
    }).toBe(3);
    await expect(root.getByRole("button", { name: "실행 취소" })).toBeEnabled();

    await root.locator('[data-v2-performer-token="a1"]').click();
    await expect(rail.getByRole("button", { name: "역할" })).toBeEnabled();
    await rail.getByRole("button", { name: "해제" }).click();
    await expect(rail.getByRole("button", { name: "Stage" })).toBeEnabled();
  });

  test("does not render edit controls for readonly v2", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const readonlyProject = {
      ...seededV2Project(),
      title: "Readonly V2 Fixture",
      shareLinks: {
        view: { projectId: "readonly-project", token: "", enabled: true },
        edit: { projectId: "readonly-project", token: "edit-token", enabled: true }
      }
    };
    await page.route("**/rest/v1/movemap_projects**", async (route) => {
      await route.fulfill({ json: [{ id: "readonly-project", plan: readonlyProject }] });
    });
    await page.route("**/rest/v1/choreo_projects**", async (route) => {
      await route.fulfill({ json: [] });
    });

    await page.goto("/share/readonly-project/v2");

    const root = page.locator("[data-v2-visual-editor]");
    await expect(root).toBeVisible();
    await expect(root.locator("[data-v2-stage-info-line]")).toBeVisible();
    await expect(root.locator("[data-v2-stage-info-line]")).toContainText("Snap on · 12x8 · 1m grid");
    await expect(root.locator(".v2-track-add-button")).toHaveCount(0);
    await expect(root.locator("[data-v2-bottom-rail]").getByRole("button", { name: "Stage" })).toBeEnabled();
    await expect(root.locator("[data-v2-bottom-rail]").getByRole("button", { name: "Timeline" })).toBeEnabled();
    await expect(root.locator("[data-v2-bottom-rail]").getByRole("button", { name: "Cast" })).toBeEnabled();
    await root.getByRole("button", { name: "더보기" }).click();
    await root.getByRole("menuitem", { name: /Settings/ }).click();
    await expect(root.getByRole("menuitemcheckbox", { name: /Snap/ })).toBeDisabled();
    await page.keyboard.press("Escape");
    await root.locator("[data-v2-bottom-rail]").getByRole("button", { name: "Cast" }).click();
    const castSurface = root.locator('[data-v2-tab-surface="Cast"]');
    await expect(castSurface).toBeVisible();
    await castSurface.getByRole("button", { name: /B2/ }).click();
    const readonlyTopbarBox = await root.locator(".v2-topbar").boundingBox();
    expect(readonlyTopbarBox.y).toBeGreaterThanOrEqual(0);
    await expect(root.locator('[data-v2-performer-token="b2"]')).toHaveAttribute("aria-pressed", "true");
    await expect(castSurface.getByRole("button", { name: "해제" })).toBeEnabled();
    await expect(castSurface.getByRole("button", { name: "역할" })).toBeDisabled();
    await expect(castSurface.getByRole("button", { name: "복제" })).toBeDisabled();
    await expect(castSurface.getByRole("button", { name: "삭제" })).toBeDisabled();
  });

  test("readonly V2 formation blocks still pan without mutating timing", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const readonlyProject = {
      ...seededV2Project(),
      title: "Readonly V2 Fixture",
      shareLinks: {
        view: { projectId: "readonly-project", token: "", enabled: true },
        edit: { projectId: "readonly-project", token: "edit-token", enabled: true }
      }
    };
    await routeCloudProject(page, readonlyProject, "readonly-project");
    await page.goto("/share/readonly-project/v2");

    const root = page.locator("[data-v2-visual-editor]");
    const introBlock = root.locator('[data-v2-formation-block="intro"][data-v2-segment-kind="hold"]');
    await expect(root).toBeVisible();
    await expect(introBlock).toBeVisible();
    const beforeStyle = await introBlock.evaluate((node) => ({
      left: node.style.getPropertyValue("--segment-left"),
      width: node.style.getPropertyValue("--segment-width")
    }));
    const blockBox = await introBlock.boundingBox();
    expect(blockBox).not.toBeNull();

    await expectV2TimelinePansWithoutScrub(page, root, async () => {
      await mouseDragAt(page, blockBox, Math.min(blockBox.width - 12, 80), blockBox.height / 2, -120, 0, 8);
    });

    await expect.poll(() => introBlock.evaluate((node) => ({
      left: node.style.getPropertyValue("--segment-left"),
      width: node.style.getPropertyValue("--segment-width")
    }))).toEqual(beforeStyle);
    await page.mouse.move(blockBox.x + blockBox.width / 2, blockBox.y + blockBox.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(700);
    await page.mouse.move(blockBox.x + blockBox.width / 2 + 52, blockBox.y + blockBox.height / 2, { steps: 6 });
    await expect(root.locator("[data-v2-floating-block-preview]")).toHaveCount(0);
    await expect(root.locator("[data-v2-drop-preview]")).toHaveCount(0);
    await page.mouse.up();
    await expect(root.locator(".v2-track-add-button")).toHaveCount(0);
  });

  test("readonly V2 move blocks and audio lane pan by mouse without mutation", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 980 });
    const readonlyProject = {
      ...seededCompactMoveProject(),
      title: "Readonly V2 Fixture",
      shareLinks: {
        view: { projectId: "readonly-project", token: "", enabled: true },
        edit: { projectId: "readonly-project", token: "edit-token", enabled: true }
      }
    };
    await routeCloudProject(page, readonlyProject, "readonly-project");
    await page.goto("/share/readonly-project/v2");

    const root = page.locator("[data-v2-visual-editor]");
    const moveBlock = root.locator('[data-v2-segment-kind="move"]');
    const audioLane = root.locator("[data-v2-waveform] .v2-timeline-viewport");
    await expect(root).toBeVisible();
    await expect(moveBlock).toBeVisible();
    await expect(audioLane).toBeVisible();
    await expect(root.getByRole("button", { name: "실행 취소" })).toBeDisabled();

    const audioBox = await audioLane.boundingBox();
    expect(audioBox).not.toBeNull();
    await expectV2TimelinePansWithoutScrub(page, root, async () => {
      await mouseDragAt(page, audioBox, Math.max(80, audioBox.width - 64), audioBox.height / 2, -84, 0, 8);
    });

    const moveBox = await moveBlock.boundingBox();
    expect(moveBox).not.toBeNull();
    await expectV2TimelinePansWithoutScrub(page, root, async () => {
      await mouseDragAt(page, moveBox, Math.min(moveBox.width - 4, moveBox.width / 2), moveBox.height / 2, 96, 0, 8);
    });
    await expect(root.getByRole("button", { name: "실행 취소" })).toBeDisabled();
  });

  test("readonly V2 move blocks and audio lane pan by touch without mutation", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 980 });
    const readonlyProject = {
      ...seededCompactMoveProject(),
      title: "Readonly V2 Fixture",
      shareLinks: {
        view: { projectId: "readonly-project", token: "", enabled: true },
        edit: { projectId: "readonly-project", token: "edit-token", enabled: true }
      }
    };
    await routeCloudProject(page, readonlyProject, "readonly-project");
    await page.goto("/share/readonly-project/v2");

    const root = page.locator("[data-v2-visual-editor]");
    const moveBlock = root.locator('[data-v2-segment-kind="move"]');
    const audioLane = root.locator("[data-v2-waveform] .v2-timeline-viewport");
    await expect(root).toBeVisible();
    await expect(moveBlock).toBeVisible();
    await expect(audioLane).toBeVisible();
    await expect(root.getByRole("button", { name: "실행 취소" })).toBeDisabled();

    await expectV2TimelinePansWithoutScrub(page, root, async () => {
      const audioBox = await audioLane.boundingBox();
      expect(audioBox).not.toBeNull();
      await pointerDragAt(audioLane, audioBox, Math.max(80, audioBox.width - 64), audioBox.height / 2, -78, 0, "touch", 8);
    });

    await expectV2TimelinePansWithoutScrub(page, root, async () => {
      await touchDrag(page, moveBlock, 70, 0, 10);
    });
    await expect(root.getByRole("button", { name: "실행 취소" })).toBeDisabled();
  });

  test("opens valid edit links on the V2 route with edit controls enabled", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const editProject = {
      ...seededV2Project(),
      title: "Editable V2 Link Fixture",
      shareLinks: {
        view: { projectId: "v2-edit-project", token: "", enabled: true },
        edit: { projectId: "v2-edit-project", token: "valid", enabled: true }
      }
    };
    await routeCloudProject(page, editProject);

    await page.goto("/edit/v2-edit-project/v2?token=valid");

    const root = page.locator("[data-v2-visual-editor]");
    await expect(root).toBeVisible();
    await expect(page.getByRole("heading", { name: "Editable V2 Link Fixture" })).toBeVisible();
    await expect(root.locator(".v2-track-add-button")).not.toHaveCount(0);
    await expect(root.locator("[data-v2-bottom-rail]").getByRole("button", { name: "Stage" })).toBeEnabled();
    await expect(root.getByRole("button", { name: "공유" })).toBeEnabled();
  });

  test("keeps the project wizard when v2 has no loaded project", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(({ storageKey, legacyStorageKey }) => {
      localStorage.removeItem(storageKey);
      localStorage.removeItem(legacyStorageKey);
    }, { storageKey: STORAGE_KEY, legacyStorageKey: LEGACY_STORAGE_KEY });
    await page.goto("/v2");

    await expect(page.locator("[data-v2-visual-editor]")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /샘플로 시작/ })).toBeVisible();
  });

  test("no-audio play on v2 reports the existing status without throwing", async ({ page }) => {
    const browserIssues = [];
    page.on("pageerror", (error) => browserIssues.push(error.message));
    await page.setViewportSize({ width: 390, height: 844 });
    await seedProject(page);
    await page.goto("/v2");

    await page.getByRole("button", { name: "재생" }).click();

    await expect(page.getByRole("status")).toContainText("음악 파일을 먼저 불러오세요");
    expect(browserIssues).toEqual([]);
  });

  test("keeps the existing mobile editor on the root route", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedProject(page);
    await page.goto("/");
    await expect(page.locator("[data-stitch-mobile-editor]")).toBeVisible();
    await expect(page.locator("[data-v2-visual-editor]")).toHaveCount(0);
  });

  test("keeps the existing Stitch mock route", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/stitch-mobile-mock");
    await expect(page.locator("[data-stitch-mobile-editor]")).toBeVisible();
    await expect(page.locator("[data-v2-visual-editor]")).toHaveCount(0);
  });
});
