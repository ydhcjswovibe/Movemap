import { expect, test } from "@playwright/test";

const SUPABASE_TEST_URL = "https://movemap-test.supabase.co";

function compactFormationText(text) {
  return text.replace(/\s+/g, " ").trim();
}

function seededProject({ viewEnabled = true, editEnabled = true, editToken = "valid", longMove = true } = {}) {
  const performers = [
    { id: "a1", label: "A1", name: "A1", role: "groupA", color: "#2457c5" },
    { id: "a2", label: "A2", name: "A2", role: "groupA", color: "#3478f6" },
    { id: "b1", label: "B1", name: "B1", role: "groupB", color: "#c0265f" }
  ];
  return {
    title: "Cloud Route Fixture",
    performanceType: "mixed",
    performers,
    partnerSets: [],
    stage: { width: 100, height: 100 },
    frontZone: { y: 70 },
    owner: { sessionId: "owner_fixture", createdAt: "2026-05-29T00:00:00.000Z" },
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
        positions: { a1: { x: 15, y: 20 }, a2: { x: 18, y: 20 }, b1: { x: 45, y: 20 } }
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
        positions: { a1: longMove ? { x: 90, y: 80 } : { x: 25, y: 25 }, a2: { x: 35, y: 45 }, b1: { x: 60, y: 40 } }
      },
      {
        id: "s3",
        name: "Final",
        time: 20,
        moveDuration: 4,
        start: 16,
        end: 20,
        moveMode: "smooth",
        notes: "엔딩",
        frontFocus: [],
        partnerSetId: "",
        positions: { a1: { x: 70, y: 55 }, a2: { x: 40, y: 55 }, b1: { x: 55, y: 70 } }
      }
    ],
    updatedAt: "2026-05-29T00:00:00.000Z"
  };
}

async function routeCloudProject(page, plan) {
  await page.route(`${SUPABASE_TEST_URL}/rest/v1/movemap_projects**`, async (route) => {
    await route.fulfill({ json: [{ id: "project-1", plan }] });
  });
  await page.route(`${SUPABASE_TEST_URL}/rest/v1/choreo_projects**`, async (route) => {
    await route.fulfill({ json: [] });
  });
}

async function formationTexts(page) {
  return page.locator(".formation-block").evaluateAll((nodes) => (
    nodes.map((node) => node.innerText.replace(/\n/g, " | "))
  ));
}

async function expectNoBottomStatus(page) {
  await expect(page.locator(".status")).toHaveCount(0);
}

function collectBrowserIssues(page) {
  const browserIssues = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      browserIssues.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    browserIssues.push(`pageerror: ${error.message}`);
  });
  return browserIssues;
}

test("timeline formation editing keeps sequential segments and clean browser output", async ({ page }) => {
  const browserIssues = [];
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) {
      browserIssues.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    browserIssues.push(`pageerror: ${error.message}`);
  });

  await page.addInitScript(() => localStorage.clear());
  await page.goto("/");

  await page.getByRole("button", { name: /빈 프로젝트 시작/ }).click();
  await expectNoBottomStatus(page);
  await page.getByRole("button", { name: "현재 시간에 대형 추가" }).click();
  await expectNoBottomStatus(page);
  await page.getByRole("button", { name: "현재 시간에 대형 추가" }).click();
  await expectNoBottomStatus(page);

  const formationBlocks = page.locator(".formation-block");
  await expect(formationBlocks).toHaveCount(3);
  await expect(formationBlocks.nth(0)).toContainText("0:00.0 - 0:04.0");
  await expect(formationBlocks.nth(1)).toContainText("0:04.0 - 0:08.0");
  await expect(formationBlocks.nth(2)).toContainText("0:08.0 - 0:12.0");

  await expect(page.locator(".selected-formation-bar input[type=number], .tool-drawer input[type=number], .formation-panel input[type=number]")).toHaveCount(0);

  const f2 = formationBlocks.nth(1);
  await f2.click();
  const rightHandle = f2.locator(".formation-resize-handle.right");
  await expect(rightHandle).toHaveCount(1);
  const handleBox = await rightHandle.boundingBox();
  expect(handleBox).not.toBeNull();

  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(handleBox.x + handleBox.width / 2 + 112, handleBox.y + handleBox.height / 2, { steps: 8 });
  await page.mouse.up();
  await expectNoBottomStatus(page);

  await expect(formationBlocks.nth(1)).toContainText("0:04.0 - 0:10.0");
  await expect(formationBlocks.nth(2)).toContainText("0:10.0 - 0:14.0");

  const finalTexts = (await formationTexts(page)).map(compactFormationText);
  expect(finalTexts[0]).toContain("F1 | Intro | 0:00.0 - 0:04.0");
  expect(finalTexts[1]).toContain("F2 | 대형 0:08.0 | 0:04.0 - 0:10.0");
  expect(finalTexts[2]).toContain("F3 | 대형 0:12.0 | 0:10.0 - 0:14.0");

  const f1BodyBox = await formationBlocks.nth(0).boundingBox();
  expect(f1BodyBox).not.toBeNull();
  await page.mouse.move(f1BodyBox.x + f1BodyBox.width / 2, f1BodyBox.y + f1BodyBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(f1BodyBox.x + f1BodyBox.width / 2 + 140, f1BodyBox.y + f1BodyBox.height / 2, { steps: 6 });
  await page.mouse.up();
  await expectNoBottomStatus(page);

  expect((await formationTexts(page)).map(compactFormationText)).toEqual(finalTexts);
  await expect(page.locator(".formation-block.current")).toContainText(/0:04.0 - 0:10.0|0:10.0 - 0:14.0/);

  await page.mouse.move(f1BodyBox.x + f1BodyBox.width / 2, f1BodyBox.y + f1BodyBox.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(500);
  await page.mouse.move(f1BodyBox.x + f1BodyBox.width / 2 + 1250, f1BodyBox.y + f1BodyBox.height / 2, { steps: 12 });
  await page.mouse.up();
  await expectNoBottomStatus(page);

  const reorderedTexts = (await formationTexts(page)).map(compactFormationText);
  expect(reorderedTexts[0]).toContain("F1 | 대형 0:08.0 | 0:00.0 - 0:06.0");
  expect(reorderedTexts[1]).toContain("F2 | 대형 0:12.0 | 0:06.0 - 0:10.0");
  expect(reorderedTexts[2]).toContain("F3 | Intro | 0:10.0 - 0:14.0");
  expect(browserIssues).toEqual([]);
});

test("mobile viewport keeps stage performer drag editable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => localStorage.clear());
  await page.goto("/");

  await page.getByRole("button", { name: /빈 프로젝트 시작/ }).click();
  const token = page.locator(".token").first();
  await expect(token).toBeVisible();

  const before = await token.locator("circle").nth(1).evaluate((node) => ({
    x: Number(node.getAttribute("cx")),
    y: Number(node.getAttribute("cy"))
  }));
  const box = await token.boundingBox();
  expect(box).not.toBeNull();

  const pointer = {
    pointerId: 17,
    pointerType: "touch",
    isPrimary: true,
    bubbles: true,
    cancelable: true
  };
  const start = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const end = { x: start.x + 38, y: start.y + 24 };
  await token.dispatchEvent("pointerdown", { ...pointer, clientX: start.x, clientY: start.y, buttons: 1 });
  await page.locator(".stage").dispatchEvent("pointermove", { ...pointer, clientX: end.x, clientY: end.y, buttons: 1 });
  await page.locator(".stage").dispatchEvent("pointerup", { ...pointer, clientX: end.x, clientY: end.y, buttons: 0 });
  await expectNoBottomStatus(page);

  const after = await token.locator("circle").nth(1).evaluate((node) => ({
    x: Number(node.getAttribute("cx")),
    y: Number(node.getAttribute("cy"))
  }));
  expect(Math.abs(after.x - before.x) + Math.abs(after.y - before.y)).toBeGreaterThan(1);
  await expect(page.locator(".mobile-status-bar").getByText(/자동 저장/)).toBeVisible();

  const viewport = page.viewportSize();
  const actionBarBox = await page.locator(".mobile-action-bar").boundingBox();
  expect(viewport).not.toBeNull();
  expect(actionBarBox).not.toBeNull();
  const bottomGap = viewport.height - actionBarBox.y - actionBarBox.height;
  expect(bottomGap).toBeGreaterThanOrEqual(viewport.height * 0.01);
  expect(bottomGap).toBeLessThanOrEqual(viewport.height * 0.035);
  expect(Math.abs(actionBarBox.x + actionBarBox.width / 2 - viewport.width / 2)).toBeLessThan(2);
});

test("mobile contextual performer actions open role and alignment option sheets", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => localStorage.clear());
  await page.goto("/");

  await page.getByRole("button", { name: /빈 프로젝트 시작/ }).click();
  const firstToken = page.locator(".token").first();
  const secondToken = page.locator(".token").nth(1);
  await expect(firstToken).toBeVisible();
  await expect(secondToken).toBeVisible();

  const firstBox = await firstToken.boundingBox();
  expect(firstBox).not.toBeNull();
  await firstToken.dispatchEvent("pointerdown", {
    pointerId: 21,
    pointerType: "touch",
    isPrimary: true,
    bubbles: true,
    cancelable: true,
    clientX: firstBox.x + firstBox.width / 2,
    clientY: firstBox.y + firstBox.height / 2,
    buttons: 1
  });

  await expect(page.locator(".mobile-action-bar").getByRole("button", { name: "역할" })).toBeVisible();
  await page.locator(".bottom-sheet-close").click();
  await page.locator(".mobile-action-bar").getByRole("button", { name: "역할" }).click();
  await expect(page.locator(".mobile-bottom-sheet.half")).toContainText("역할 선택");
  await expect(page.locator(".mobile-bottom-sheet.half")).toContainText("A 그룹");
  await expect(page.locator(".mobile-bottom-sheet.half")).toContainText("B 그룹");
  await expect(page.locator(".mobile-bottom-sheet.half")).toContainText("기타");
  await page.locator(".bottom-sheet-close").click();

  const secondBox = await secondToken.boundingBox();
  expect(secondBox).not.toBeNull();
  await secondToken.dispatchEvent("pointerdown", {
    pointerId: 22,
    pointerType: "touch",
    isPrimary: true,
    bubbles: true,
    cancelable: true,
    shiftKey: true,
    clientX: secondBox.x + secondBox.width / 2,
    clientY: secondBox.y + secondBox.height / 2,
    buttons: 1
  });

  await expect(page.locator(".mobile-action-bar").getByRole("button", { name: "정렬" })).toBeVisible();
  await page.locator(".mobile-action-bar").getByRole("button", { name: "정렬" }).click();
  await expect(page.locator(".mobile-bottom-sheet.half")).toContainText("정렬 방향");
  await expect(page.locator(".mobile-bottom-sheet.half")).toContainText("세로 정렬");
  await expect(page.locator(".mobile-bottom-sheet.half")).toContainText("가로 정렬");
});

test("View Link route opens readonly review with transition warnings", async ({ page }) => {
  await routeCloudProject(page, seededProject());
  await page.goto("/share/project-1");

  await expect(page.getByText(/보기 링크 · View Link/)).toBeVisible();
  await expect(page.getByRole("button", { name: "저장하기" })).toHaveCount(0);
  await expect(page.locator(".transition-warning").filter({ hasText: /먼 이동 주의/ })).toBeVisible();
  await expect(page.locator(".transition-warning").filter({ hasText: /겹침 주의\(현재 대형 전체\)/ })).toBeVisible();
  await expect(page.getByLabel("전환 리뷰")).toBeVisible();
  await expect(page.getByText(/전체 겹침 1/)).toBeVisible();
  await expect(page.locator(".formation-block")).toHaveCount(3);
});

test("valid Edit Link route exposes edit controls", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async (text) => {
          window.__lastCopiedText = text;
        }
      },
      configurable: true
    });
  });
  await routeCloudProject(page, seededProject());
  await page.goto("/edit/project-1?token=valid");

  await expect(page.getByRole("button", { name: "저장하기" })).toBeVisible();
  await expect(page.getByText(/편집 링크 토큰이 맞지 않아/)).toHaveCount(0);
  await expect(page.getByRole("button", { name: /대형 추가/ })).toBeVisible();
  await expect(page.getByLabel("전환 리뷰")).toBeVisible();

  await page.locator(".desktop-command-bar").getByRole("button", { name: "공유" }).click();
  await page.locator(".share-action-menu").getByRole("button", { name: "보기 링크 복사" }).click();
  await expect(page.locator(".status")).toContainText("공유 링크를 복사했습니다.");
  await expect.poll(() => page.evaluate(() => window.__lastCopiedText)).toContain("/share/project-1");
  await page.getByRole("button", { name: "상태 알림 닫기" }).click();
  await expectNoBottomStatus(page);
});

test("invalid or disabled links fall back without edit controls", async ({ page }) => {
  await routeCloudProject(page, seededProject());
  await page.goto("/edit/project-1?token=bad");
  await expect(page.getByText(/편집 링크 토큰이 맞지 않아/)).toBeVisible();
  await expect(page.getByRole("button", { name: "저장하기" })).toHaveCount(0);

  await routeCloudProject(page, seededProject({ viewEnabled: false }));
  await page.goto("/share/project-1");
  await expect(page.getByText(/소유자가 이 보기 링크를 꺼두었습니다/)).toBeVisible();
  await expect(page.getByRole("button", { name: "저장하기" })).toHaveCount(0);
});

test("mobile review and mobile toolbar routes stay usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await routeCloudProject(page, seededProject({ longMove: false }));
  await page.goto("/share/project-1");

  await expect(page.locator(".stage")).toBeVisible();
  await expect(page.getByText(/보기 링크 · View Link/)).toBeVisible();

  await page.addInitScript(() => localStorage.clear());
  await page.goto("/");
  await page.getByRole("button", { name: /빈 프로젝트 시작/ }).click();
  await expect(page.locator(".mobile-status-bar")).toBeVisible();
  await expect(page.locator(".mobile-status-bar")).toContainText("새 Movemap 프로젝트");
  await expect(page.getByRole("button", { name: "Google 로그인" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "저장하기" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "프로젝트" })).toHaveCount(0);
  await expect(page.locator(".desktop-command-bar").getByRole("button", { name: "공유" })).toHaveCount(0);
  await expect(page.locator(".stage")).toBeVisible();
  await expect(page.locator(".timeline-editor")).toBeVisible();
  await expect(page.locator(".mobile-action-bar")).toBeVisible();
  await expect(page.locator(".timeline-control-rail")).toBeVisible();
  await expect(page.locator(".selected-formation-bar")).toBeHidden();

  const timelineRail = page.locator(".timeline-control-rail");
  const timelineRailBox = await timelineRail.boundingBox();
  const stageFrameBox = await page.locator(".stage-frame").boundingBox();
  const timelineEditorBox = await page.locator(".timeline-editor").boundingBox();
  const actionBarInitialBox = await page.locator(".mobile-action-bar").boundingBox();
  expect(timelineRailBox).not.toBeNull();
  expect(stageFrameBox).not.toBeNull();
  expect(timelineEditorBox).not.toBeNull();
  expect(actionBarInitialBox).not.toBeNull();
  expect(timelineRailBox.height).toBeLessThan(48);
  expect(stageFrameBox.y).toBeGreaterThanOrEqual(0);
  expect(stageFrameBox.width).toBeGreaterThanOrEqual(378);
  expect(stageFrameBox.height).toBeGreaterThanOrEqual(400);
  expect(timelineEditorBox.y + timelineEditorBox.height).toBeLessThanOrEqual(actionBarInitialBox.y);
  expect(actionBarInitialBox.y + actionBarInitialBox.height).toBeLessThanOrEqual(844);
  await expect(timelineRail.getByRole("button", { name: "되돌리기" })).toBeDisabled();
  await expect(timelineRail.getByRole("button", { name: "앞으로가기" })).toBeDisabled();
  await expect(timelineRail.getByRole("button", { name: "타임라인 축소" })).toBeVisible();
  await expect(timelineRail.getByRole("button", { name: "타임라인 확대" })).toBeVisible();
  const zoomPlusBox = await timelineRail.getByRole("button", { name: "타임라인 확대" }).boundingBox();
  const timelineAddBox = await timelineRail.getByRole("button", { name: "현재 시간에 대형 추가" }).boundingBox();
  expect(zoomPlusBox).not.toBeNull();
  expect(timelineAddBox).not.toBeNull();
  expect(timelineAddBox.x).toBeGreaterThan(zoomPlusBox.x);

  const actionBar = page.locator(".mobile-action-bar");
  const globalActions = page.locator(".mobile-global-actions");
  await expect(globalActions.getByRole("button", { name: "저장" })).toHaveCount(1);
  await expect(globalActions.getByRole("button", { name: "공유" })).toHaveCount(1);
  await expect(globalActions.getByRole("button", { name: "다운로드" })).toHaveCount(1);
  await expect(globalActions.getByRole("button", { name: "더보기" })).toHaveCount(1);
  await expect(actionBar.getByRole("button", { name: "사람" })).toHaveCount(1);
  await expect(actionBar.getByRole("button", { name: "음악" })).toHaveCount(1);
  await expect(actionBar.getByRole("button", { name: "무대" })).toHaveCount(1);
  await expect(actionBar.getByRole("button", { name: "보기" })).toHaveCount(1);
  await expect(actionBar.getByRole("button", { name: "저장" })).toHaveCount(0);
  await expect(actionBar.getByRole("button", { name: "공유" })).toHaveCount(0);
  await expect(actionBar.getByRole("button", { name: "다운로드" })).toHaveCount(0);
  await expect(actionBar.getByRole("button", { name: "더보기" })).toHaveCount(0);
  await expect(actionBar.getByRole("button", { name: "추가" })).toHaveCount(0);
  await expect(actionBar.getByRole("button", { name: "선택" })).toHaveCount(0);
  await expect(actionBar.getByRole("button", { name: "동선" })).toHaveCount(0);
  const actionRailMetrics = await actionBar.evaluate((node) => {
    node.scrollLeft = node.scrollWidth;
    return {
      clientWidth: node.clientWidth,
      scrollLeft: node.scrollLeft,
      scrollWidth: node.scrollWidth
    };
  });
  expect(actionRailMetrics.scrollWidth).toBeLessThanOrEqual(actionRailMetrics.clientWidth + 4);
  await expect(actionBar.getByRole("button", { name: "무대" })).toBeVisible();
  await actionBar.evaluate((node) => {
    node.scrollLeft = 0;
  });
  await page.screenshot({ path: "test-results/mobile-timeline-rail-hints.png", fullPage: false });

  await page.getByRole("button", { name: "타임라인 확대" }).hover();
  await expect(page.locator(".icon-hint-popover")).toHaveText("타임라인 확대");
  await expect(page.locator(".icon-hint-popover")).toBeVisible();

  await page.getByRole("button", { name: "타임라인 축소" }).click();
  await expect(page.locator(".icon-hint-popover")).toHaveText("타임라인 축소");
  await expect(page.locator(".icon-hint-popover")).toBeVisible();
  await page.getByRole("button", { name: "타임라인 확대" }).click();
  await expect(page.locator(".icon-hint-popover")).toHaveCount(1);
  await expect(page.locator(".icon-hint-popover")).toHaveText("타임라인 확대");
  await expect(page.locator(".icon-hint-popover")).toBeVisible();
  await page.waitForTimeout(2100);
  await expect(page.locator(".icon-hint-popover")).toHaveCount(0);

  const timelineGestureLane = page.locator(".timeline-viewport.audio-lane");
  const timelineGestureContent = timelineGestureLane.locator(".timeline-content");
  const laneBox = await timelineGestureLane.boundingBox();
  expect(laneBox).not.toBeNull();
  const beforeDragTransform = await timelineGestureContent.evaluate((node) => node.style.transform);
  await timelineGestureLane.dispatchEvent("pointerdown", {
    pointerId: 31,
    pointerType: "touch",
    clientX: laneBox.x + laneBox.width * 0.75,
    clientY: laneBox.y + laneBox.height / 2,
    button: 0,
    buttons: 1
  });
  await timelineGestureLane.dispatchEvent("pointermove", {
    pointerId: 31,
    pointerType: "touch",
    clientX: laneBox.x + laneBox.width * 0.35,
    clientY: laneBox.y + laneBox.height / 2,
    buttons: 1
  });
  await timelineGestureLane.dispatchEvent("pointerup", {
    pointerId: 31,
    pointerType: "touch",
    clientX: laneBox.x + laneBox.width * 0.35,
    clientY: laneBox.y + laneBox.height / 2,
    buttons: 0
  });
  await expect.poll(() => timelineGestureContent.evaluate((node) => node.style.transform)).not.toBe(beforeDragTransform);

  const beforePinchWidth = await timelineGestureContent.evaluate((node) => Number.parseFloat(node.style.width));
  await timelineGestureLane.dispatchEvent("pointerdown", {
    pointerId: 41,
    pointerType: "touch",
    clientX: laneBox.x + laneBox.width * 0.40,
    clientY: laneBox.y + laneBox.height / 2,
    button: 0,
    buttons: 1
  });
  await timelineGestureLane.dispatchEvent("pointerdown", {
    pointerId: 42,
    pointerType: "touch",
    clientX: laneBox.x + laneBox.width * 0.60,
    clientY: laneBox.y + laneBox.height / 2,
    button: 0,
    buttons: 1
  });
  await timelineGestureLane.dispatchEvent("pointermove", {
    pointerId: 41,
    pointerType: "touch",
    clientX: laneBox.x + laneBox.width * 0.25,
    clientY: laneBox.y + laneBox.height / 2,
    buttons: 1
  });
  await timelineGestureLane.dispatchEvent("pointermove", {
    pointerId: 42,
    pointerType: "touch",
    clientX: laneBox.x + laneBox.width * 0.75,
    clientY: laneBox.y + laneBox.height / 2,
    buttons: 1
  });
  await timelineGestureLane.dispatchEvent("pointerup", { pointerId: 41, pointerType: "touch", buttons: 0 });
  await timelineGestureLane.dispatchEvent("pointerup", { pointerId: 42, pointerType: "touch", buttons: 0 });
  await expect.poll(() => timelineGestureContent.evaluate((node) => Number.parseFloat(node.style.width))).toBeGreaterThan(beforePinchWidth);

  const mobileFormationBlocks = page.locator(".formation-block");
  await expect(mobileFormationBlocks).toHaveCount(1);
  await page.getByRole("button", { name: "현재 시간에 대형 추가" }).click();
  await expect(mobileFormationBlocks).toHaveCount(2);
  await expect(mobileFormationBlocks.nth(1)).toContainText("0:04.0 - 0:08.0");
  await expect(timelineRail.getByRole("button", { name: "되돌리기" })).toBeEnabled();
  await timelineRail.getByRole("button", { name: "되돌리기" }).click();
  await expect(mobileFormationBlocks).toHaveCount(1);
  await expect(timelineRail.getByRole("button", { name: "앞으로가기" })).toBeEnabled();
  await timelineRail.getByRole("button", { name: "앞으로가기" }).click();
  await expect(mobileFormationBlocks).toHaveCount(2);

  const stageToolBox = await page.locator(".stage-corner-tools").boundingBox();
  const stageBox = await page.locator(".stage-frame").boundingBox();
  expect(stageToolBox).not.toBeNull();
  expect(stageBox).not.toBeNull();
  expect(stageToolBox.height).toBeLessThan(58);
  expect(stageToolBox.width).toBeLessThanOrEqual(stageBox.width);

  await page.locator(".mobile-action-bar").getByRole("button", { name: "사람" }).click();
  await expect(page.locator(".mobile-bottom-sheet")).toHaveCount(1);
  await expect(page.locator(".mobile-bottom-sheet.full")).toBeVisible();
  await expect(page.locator(".mobile-bottom-sheet")).toContainText("출연자 / 앞줄 노출");
  await page.locator(".bottom-sheet-handle").click();
  await expect(page.locator(".mobile-bottom-sheet.half")).toBeVisible();
  const fullSheetBox = await page.locator(".mobile-bottom-sheet.half").boundingBox();
  expect(fullSheetBox).not.toBeNull();
  expect(fullSheetBox.y).toBeGreaterThan(stageFrameBox.y + 80);
  expect(fullSheetBox.y + fullSheetBox.height).toBeLessThanOrEqual(actionBarInitialBox.y);
  await page.locator(".bottom-sheet-close").click();
  await expect(page.locator(".mobile-bottom-sheet")).toHaveCount(0);

  await page.locator(".mobile-action-bar").getByRole("button", { name: "보기" }).click();
  await expect(page.locator(".mobile-bottom-sheet")).toHaveCount(1);
  await expect(page.locator(".mobile-bottom-sheet.half")).toContainText("보기");
  await expect(page.locator(".mobile-bottom-sheet.half")).toContainText("참조선");
  await expect(page.locator(".mobile-bottom-sheet.half")).toContainText("3D");
  await page.locator(".bottom-sheet-close").click();
  await expect(page.locator(".mobile-bottom-sheet")).toHaveCount(0);

  await page.locator(".mobile-global-actions").getByRole("button", { name: "공유" }).click();
  await expect(page.locator(".mobile-bottom-sheet")).toHaveCount(1);
  await expect(page.locator(".mobile-bottom-sheet.half")).toContainText("공유");
  await expect(page.locator(".share-panel")).toBeVisible();
  await page.locator(".bottom-sheet-close").click();
  await expect(page.locator(".mobile-bottom-sheet")).toHaveCount(0);

  await page.locator(".mobile-global-actions").getByRole("button", { name: "다운로드" }).click();
  await expect(page.locator(".mobile-bottom-sheet.half")).toContainText("프로젝트 파일");
  await expect(page.locator(".mobile-bottom-sheet.half")).toContainText("현재 대형 이미지");
  await expect(page.locator(".mobile-bottom-sheet.half")).toContainText("전체 대형 이미지");
  await expect(page.locator(".mobile-bottom-sheet.half")).toContainText("인쇄/PDF");
  await page.locator(".bottom-sheet-close").click();
  await expect(page.locator(".mobile-bottom-sheet")).toHaveCount(0);

  await page.locator(".mobile-global-actions").getByRole("button", { name: "더보기" }).click();
  await expect(page.locator(".mobile-bottom-sheet")).toHaveCount(1);
  await expect(page.locator(".mobile-bottom-sheet.full")).toContainText("계정");
  await expect(page.locator(".mobile-bottom-sheet.full")).toContainText("프로젝트");
  await expect(page.locator(".mobile-bottom-sheet.full")).toContainText("불러오기");
  await expect(page.locator(".mobile-bottom-sheet.full")).toContainText("스냅");
  await expect(page.locator(".mobile-command-grid")).toBeVisible();
  await expect(page.locator(".mobile-command-grid")).not.toContainText("공유");
  await expect(page.locator(".mobile-command-grid")).not.toContainText("다운로드");
  await expect(page.locator(".mobile-status-token")).toHaveCount(4);
  await page.locator(".bottom-sheet-close").click();
  await expect(page.locator(".mobile-bottom-sheet")).toHaveCount(0);

  await mobileFormationBlocks.nth(1).click();
  await expect(page.locator(".mobile-bottom-sheet")).toHaveCount(0);
  await expect(page.locator(".formation-block.selected")).toContainText("0:04.0 - 0:08.0");
  await expect(page.locator(".mobile-action-bar").getByRole("button", { name: "복제" })).toHaveCount(1);
  await expect(page.locator(".mobile-action-bar").getByRole("button", { name: "삭제" })).toHaveCount(1);
  await expect(page.locator(".mobile-action-bar").getByRole("button", { name: "초기화" })).toHaveCount(1);
  await expect(page.locator(".mobile-action-bar").getByRole("button", { name: "보기" })).toHaveCount(0);

  await expect(page.locator(".formation-block").first()).toBeVisible();
  const actionBarBox = await page.locator(".mobile-action-bar").boundingBox();
  const formationBlockBox = await page.locator(".formation-block").first().boundingBox();
  expect(actionBarBox).not.toBeNull();
  expect(formationBlockBox).not.toBeNull();
  expect(formationBlockBox.y + formationBlockBox.height).toBeLessThanOrEqual(actionBarBox.y);
  await expect(page.locator(".selected-formation-bar")).toBeHidden();
});

test("stage references templates stage size import and 3d smoke stay stable", async ({ page }) => {
  const browserIssues = collectBrowserIssues(page);
  await page.addInitScript(() => localStorage.clear());
  await page.goto("/");
  await page.getByRole("button", { name: /빈 프로젝트 시작/ }).click();
  const drawer = page.locator(".left-work-panel");

  await expect(page.locator(".stage-reference-layer")).toBeVisible();
  await drawer.getByRole("tab", { name: "Formation" }).click();
  await drawer.getByRole("button", { name: "미리보기" }).click();
  await expect(drawer.locator(".template-preview-status")).toContainText("Line");
  await drawer.getByRole("button", { name: "취소" }).click();
  await expect(drawer.locator(".template-preview-status")).toHaveCount(0);

  await drawer.getByRole("button", { name: "현재 대형 저장" }).click();
  await expect(drawer.locator("select").filter({ hasText: /개인 템플릿/ })).toHaveCount(1);

  await drawer.getByRole("tab", { name: "Stage" }).click();
  await drawer.locator(".stage-size-control").first().getByRole("spinbutton").fill("80");
  await expect(drawer.getByText(/축소할 수 없습니다/)).toBeVisible();
  await drawer.locator(".stage-size-control").first().getByRole("spinbutton").fill("120");
  await expect(page.locator(".stage")).toHaveAttribute("viewBox", "0 0 120 100");

  await page.getByRole("button", { name: "프로젝트" }).click();
  await page.locator("input[type='file'][accept='application/json']").first().setInputFiles({
    name: "bad-movemap.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ title: "Bad", performers: [], sections: [] }))
  });
  await expect(page.getByText(/올바른 Movemap 프로젝트 파일이 아닙니다/)).toBeVisible();

  await page.getByRole("button", { name: "3D" }).click();
  const canvas = page.locator(".stage-3d-preview canvas");
  await expect(canvas).toHaveAttribute("data-ready", "true");
  const hasPixels = await canvas.evaluate((node) => {
    const gl = node.getContext("webgl2") || node.getContext("webgl");
    if (!gl) return false;
    const pixels = new Uint8Array(4);
    gl.readPixels(Math.floor(node.width / 2), Math.floor(node.height / 2), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    return pixels.some((value) => value !== 0);
  });
  expect(hasPixels).toBe(true);
  expect(browserIssues).toEqual([]);
});
