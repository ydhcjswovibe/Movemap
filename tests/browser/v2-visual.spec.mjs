import { expect, test } from "@playwright/test";

const STORAGE_KEY = "movemap-project";
const LEGACY_STORAGE_KEY = "choreo-stage-planner-project";

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
    await expect(timeline.getByRole("button", { name: "대형 추가" })).toBeVisible();
    await expect(timeline.getByRole("button", { name: "음악 추가" })).toBeVisible();
    await expect(timeline.locator("[data-v2-waveform] span:not(.v2-track-playhead)")).toHaveCount(96);
    await expect(root.getByText("BPM")).toHaveCount(0);

    const tokenA1 = root.locator('[data-v2-performer-token="a1"]');
    const tokenB2 = root.locator('[data-v2-performer-token="b2"]');
    await expect(tokenA1).toHaveAttribute("aria-pressed", "false");
    await tokenA1.click();
    await expect(tokenA1).toHaveAttribute("aria-pressed", "true");
    await tokenB2.click();
    await expect(tokenA1).toHaveAttribute("aria-pressed", "false");
    await expect(tokenB2).toHaveAttribute("aria-pressed", "true");

    const introBlock = root.locator('[data-v2-formation-block="intro"][data-v2-segment-kind="hold"]');
    const diamondBlock = root.locator('[data-v2-formation-block="diamond"][data-v2-segment-kind="hold"]');
    await expect(introBlock).toHaveAttribute("aria-pressed", "true");
    await diamondBlock.click();
    await expect(introBlock).toHaveAttribute("aria-pressed", "false");
    await expect(diamondBlock).toHaveAttribute("aria-pressed", "true");
    await expect(tokenB2).toHaveAttribute("aria-pressed", "false");

    await expect(root.locator('[data-v2-segment-kind="move"]')).toBeVisible();
    await expect(root.locator('[data-v2-playhead="ruler"]')).toBeVisible();
    await expect(root.locator('[data-v2-playhead="formation"]')).toBeVisible();
    await expect(root.locator('[data-v2-playhead="audio"]')).toBeVisible();
    await tokenB2.click();
    await expect(tokenB2).toHaveAttribute("aria-pressed", "true");

    const boxes = await root.evaluate((node) => {
      const rectFor = (selector) => {
        const rect = node.querySelector(selector)?.getBoundingClientRect();
        return rect ? { y: rect.y, width: rect.width, height: rect.height, bottom: rect.bottom, center: rect.y + rect.height / 2 } : null;
      };
      return {
        stage: rectFor("[data-v2-stage]"),
        timeline: rectFor("[data-v2-timeline]"),
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

    expect(boxes.stage.height).toBeGreaterThan(boxes.timeline.height);
    expect(boxes.stage.height).toBeGreaterThanOrEqual(460);
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
    expect(boxes.timeline.height).toBeGreaterThanOrEqual(220);
    expect(boxes.timeline.height).toBeLessThanOrEqual(260);
    expect(Math.abs(boxes.formationLane.height - boxes.musicLane.height)).toBeLessThanOrEqual(1);
    expect(Math.abs(boxes.moveBlock.center - boxes.formationLane.center)).toBeLessThanOrEqual(1);
    expect(boxes.moveBlock.height).toBeLessThan(boxes.holdBlock.height);
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

    expect(shellMetrics.width).toBeLessThanOrEqual(392);
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
    expect(metrics.firstLeft).toBeLessThanOrEqual(1);
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

  test("pans and seeks the V2 timeline viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedProject(page, seededLongTimelineProject());
    await page.goto("/v2");

    const root = page.locator("[data-v2-visual-editor]");
    const viewport = root.locator(".v2-formation-lane .v2-timeline-viewport");
    const content = root.locator(".v2-formation-lane .v2-timeline-content");
    const beforeTransform = await content.evaluate((node) => getComputedStyle(node).transform);
    const box = await viewport.boundingBox();
    expect(box).not.toBeNull();

    await page.mouse.move(box.x + box.width - 20, box.y + 8);
    await page.mouse.wheel(0, 420);
    await expect.poll(() => content.evaluate((node) => getComputedStyle(node).transform)).not.toBe(beforeTransform);

    const playheadBefore = await root.locator('[data-v2-playhead="formation"]').evaluate((node) => getComputedStyle(node).left);
    await page.mouse.click(box.x + Math.min(160, box.width - 30), box.y + 8);
    await expect.poll(() => root.locator('[data-v2-playhead="formation"]').evaluate((node) => getComputedStyle(node).left)).not.toBe(playheadBefore);
  });

  test("move block click selects the destination formation and clears performer selection", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedProject(page);
    await page.goto("/v2");

    const root = page.locator("[data-v2-visual-editor]");
    const token = root.locator('[data-v2-performer-token="b2"]');
    await token.click();
    await expect(token).toHaveAttribute("aria-pressed", "true");

    await root.locator('[data-v2-segment-kind="move"]').click();
    await expect(root.locator('[data-v2-formation-block="diamond"][data-v2-segment-kind="hold"]')).toHaveAttribute("aria-pressed", "true");
    await expect(token).toHaveAttribute("aria-pressed", "false");
  });

  test("edits V2 hold and move timing with timeline handles", async ({ page }) => {
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
    const introHoldHandle = root.locator('[data-v2-timeline-handle="hold-right"][data-v2-section-id="intro"]');
    await expect(introHoldHandle).toBeVisible();
    const holdBox = await introHoldHandle.boundingBox();
    expect(holdBox).not.toBeNull();
    await page.mouse.move(holdBox.x + holdBox.width / 2, holdBox.y + holdBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(holdBox.x + holdBox.width / 2 + 56, holdBox.y + holdBox.height / 2, { steps: 5 });
    await page.mouse.up();

    await expect.poll(async () => {
      const project = await storedProject(page);
      return project.sections.find((section) => section.id === "diamond").moveDuration;
    }).toBeLessThan(2);

    await root.locator('[data-v2-segment-kind="move"]').click();
    const moveHandle = root.locator('[data-v2-timeline-handle="move-left"][data-v2-section-id="diamond"]');
    await expect(moveHandle).toBeVisible();
    const moveBox = await moveHandle.boundingBox();
    expect(moveBox).not.toBeNull();
    const beforeDuration = await storedProject(page).then((project) => project.sections.find((section) => section.id === "diamond").moveDuration);
    await page.mouse.move(moveBox.x + moveBox.width / 2, moveBox.y + moveBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(moveBox.x + moveBox.width / 2 - 56, moveBox.y + moveBox.height / 2, { steps: 5 });
    await page.mouse.up();

    await expect.poll(async () => {
      const project = await storedProject(page);
      return project.sections.find((section) => section.id === "diamond").moveDuration;
    }).toBeGreaterThan(beforeDuration);
  });

  test("organizes V2 top menus, settings submenu, transport undo redo, and default bottom modes", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedProject(page);
    await page.goto("/v2");

    const root = page.locator("[data-v2-visual-editor]");
    const rail = root.locator("[data-v2-bottom-rail]");

    await expect(root.getByRole("button", { name: "공유" })).toBeVisible();
    await expect(root.getByRole("button", { name: "더보기" })).toBeVisible();
    await expect(root.getByRole("button", { name: "실행 취소" })).toBeDisabled();
    await expect(root.getByRole("button", { name: "다시 실행" })).toBeDisabled();
    await expect(root.getByRole("button", { name: "타임라인 설정" })).toHaveCount(0);
    await expect(root.getByRole("tab")).toHaveCount(0);

    await expect(rail.getByRole("button", { name: "Stage" })).toBeEnabled();
    await expect(rail.getByRole("button", { name: "Timeline" })).toBeEnabled();
    await expect(rail.getByRole("button", { name: "Cast" })).toBeEnabled();
    await expect(rail.getByRole("button", { name: "Stage" })).toHaveClass(/is-active/);
    await rail.getByRole("button", { name: "Timeline" }).click();
    await expect(rail.getByRole("button", { name: "Timeline" })).toHaveClass(/is-active/);

    await root.getByRole("button", { name: "더보기" }).click();
    await expect(root.getByRole("menu", { name: "더보기 메뉴" })).toBeVisible();
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
    await settingsMenuItem.click();
    await expect(settingsMenu).toHaveCount(0);
    await expect(settingsMenuItem).toContainText("›");

    await page.keyboard.press("Escape");
    await expect(root.getByRole("menu", { name: "더보기 메뉴" })).toHaveCount(0);

    await root.getByRole("button", { name: "공유" }).click();
    await expect(root.getByRole("menu", { name: "공유 메뉴" })).toBeVisible();
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
    await expect(root.locator(".v2-track-add-button")).toHaveCount(0);
    await expect(root.locator("[data-v2-bottom-rail]").getByRole("button", { name: "Stage" })).toBeEnabled();
    await expect(root.locator("[data-v2-bottom-rail]").getByRole("button", { name: "Timeline" })).toBeEnabled();
    await expect(root.locator("[data-v2-bottom-rail]").getByRole("button", { name: "Cast" })).toBeEnabled();
    await root.getByRole("button", { name: "더보기" }).click();
    await root.getByRole("menuitem", { name: /Settings/ }).click();
    await expect(root.getByRole("menuitemcheckbox", { name: /Snap/ })).toBeDisabled();
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
