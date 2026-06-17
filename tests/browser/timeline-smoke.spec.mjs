import { expect, test } from "@playwright/test";

const SUPABASE_TEST_URL = "https://movemap-test.supabase.co";
const SUPABASE_AUTH_STORAGE_KEY = "sb-movemap-test-auth-token";
const STORAGE_KEY = "movemap-project";
const LEGACY_STORAGE_KEY = "choreo-stage-planner-project";

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
  await page.route("**/rest/v1/rpc/get_project_by_edit_token", async (route) => {
    const payload = route.request().postDataJSON?.() || {};
    const tokenMatches = payload.p_token === plan.shareLinks?.edit?.token;
    await route.fulfill({ json: tokenMatches ? { id: "project-1", plan } : null });
  });
  await page.route("**/rest/v1/movemap_projects**", async (route) => {
    await route.fulfill({ json: [{ id: "project-1", plan }] });
  });
  await page.route("**/rest/v1/choreo_projects**", async (route) => {
    await route.fulfill({ json: [] });
  });
}

async function seedLocalProject(page, plan) {
  await page.addInitScript(({ storageKey, legacyStorageKey, nextPlan }) => {
    localStorage.setItem(storageKey, JSON.stringify(nextPlan));
    localStorage.removeItem(legacyStorageKey);
  }, { storageKey: STORAGE_KEY, legacyStorageKey: LEGACY_STORAGE_KEY, nextPlan: plan });
}

function encodeJwtPart(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function testAccessToken({ userId = "owner-1", email = `${userId}@example.test`, accountPlan = "free", expiresAt = Math.floor(Date.now() / 1000) + 3600 } = {}) {
  return [
    encodeJwtPart({ alg: "none", typ: "JWT" }),
    encodeJwtPart({
      aud: "authenticated",
      exp: expiresAt,
      sub: userId,
      email,
      role: "authenticated",
      app_metadata: { provider: "google", account_plan: accountPlan },
      user_metadata: {}
    }),
    "signature"
  ].join(".");
}

async function seedSupabaseSession(page, { userId = "owner-1", accessToken = "access-token-1", accountPlan = "free" } = {}) {
  const email = `${userId}@example.test`;
  const expiresAt = Math.floor(Date.now() / 1000) + 3600;
  const sessionAccessToken = accessToken || testAccessToken({ userId, email, accountPlan, expiresAt });
  await page.addInitScript(({ authStorageKey, session }) => {
    const { user, ...sessionWithoutUser } = session;
    localStorage.setItem(authStorageKey, JSON.stringify(sessionWithoutUser));
    localStorage.setItem(`${authStorageKey}-user`, JSON.stringify({ user }));
  }, {
    authStorageKey: SUPABASE_AUTH_STORAGE_KEY,
    session: {
      access_token: sessionAccessToken,
      refresh_token: "refresh-token-1",
      token_type: "bearer",
      expires_in: 3600,
      expires_at: expiresAt,
      user: {
        id: userId,
        email,
        app_metadata: { provider: "google", account_plan: accountPlan },
        user_metadata: {},
        aud: "authenticated",
        role: "authenticated"
      }
    }
  });
}

async function routeCloudSaves(page, capturedRequests, { projectId = "project-1" } = {}) {
  await page.route("**/rest/v1/movemap_projects**", async (route) => {
    const request = route.request();
    const method = request.method();
    const body = request.postData() ? request.postDataJSON() : null;
    capturedRequests.push({
      method,
      url: request.url(),
      authorization: request.headers().authorization || "",
      body
    });
    if (method === "GET") {
      await route.fulfill({ json: [] });
      return;
    }
    await route.fulfill({
      json: [{
        id: projectId,
        plan: {
          ...(body?.plan || {}),
          cloudProjectId: projectId
        }
      }]
    });
  });
}

async function routeSupabaseUser(page, { userId = "owner-1", accountPlan = "free" } = {}) {
  await page.route("**/auth/v1/user", async (route) => {
    await route.fulfill({
      json: {
        id: userId,
        email: `${userId}@example.test`,
        app_metadata: { provider: "google", account_plan: accountPlan },
        user_metadata: {},
        aud: "authenticated",
        role: "authenticated"
      }
    });
  });
}

function authCallbackPath({ accessToken, refreshToken = "refresh-token-1", expiresIn = 3600 } = {}) {
  const params = new URLSearchParams({
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: String(expiresIn),
    token_type: "bearer",
    type: "signup"
  });
  return `/#${params.toString()}`;
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
  const shouldIgnore = (text) => text.includes("net::ERR_NETWORK_CHANGED");
  page.on("console", (message) => {
    const text = `${message.type()}: ${message.text()}`;
    if (message.type() === "error" && !shouldIgnore(text)) {
      browserIssues.push(text);
    }
  });
  page.on("pageerror", (error) => {
    const text = `pageerror: ${error.message}`;
    if (!shouldIgnore(text)) browserIssues.push(text);
  });
  return browserIssues;
}

async function expectMenuInsideViewport(page, selector, { avoidSelector = "", screenshotPath = "" } = {}) {
  const menu = page.locator(selector);
  await expect(menu).toBeVisible();
  const menuBox = await menu.boundingBox();
  const viewport = page.viewportSize();
  expect(menuBox).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(menuBox.x).toBeGreaterThanOrEqual(0);
  expect(menuBox.y).toBeGreaterThanOrEqual(0);
  expect(menuBox.x + menuBox.width).toBeLessThanOrEqual(viewport.width);
  expect(menuBox.y + menuBox.height).toBeLessThanOrEqual(viewport.height);

  if (avoidSelector) {
    const avoid = page.locator(`${avoidSelector}:visible`);
    const avoidCount = await avoid.count();
    if (avoidCount) {
      const avoidBox = await avoid.first().boundingBox();
      expect(avoidBox).not.toBeNull();
      const overlaps = menuBox.x < avoidBox.x + avoidBox.width
        && menuBox.x + menuBox.width > avoidBox.x
        && menuBox.y < avoidBox.y + avoidBox.height
        && menuBox.y + menuBox.height > avoidBox.y;
      expect(overlaps).toBe(false);
    }
  }

  if (screenshotPath) {
    await page.screenshot({ path: screenshotPath, fullPage: false });
  }
}

async function openTopActionMenu(page, surfaceSelector, label, menuSelector) {
  await page.locator(surfaceSelector).getByRole("button", { name: label }).click();
  await expect(page.locator(".top-action-menu")).toHaveCount(1);
  await expect(page.locator(`${surfaceSelector} ${menuSelector}`)).toBeVisible();
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
  const root = page.locator("[data-v2-visual-editor]");
  await expect(root).toBeVisible();
  await expectNoBottomStatus(page);
  await page.getByRole("button", { name: "공유" }).click();
  await expect(root.locator(".v2-share-menu")).toBeVisible();
  await page.keyboard.press("Escape");
  await expectNoBottomStatus(page);
  await root.locator("[data-v2-action-bar]").getByRole("button", { name: "대형 추가" }).click();
  await expectNoBottomStatus(page);
  await root.locator("[data-v2-action-bar]").getByRole("button", { name: "대형 추가" }).click();
  await expectNoBottomStatus(page);

  const formationBlocks = root.locator("[data-v2-segment-kind='hold']");
  await expect(formationBlocks).toHaveCount(3);
  await expect(formationBlocks.nth(0)).toContainText("F1");
  await expect(formationBlocks.nth(1)).toContainText("F2");
  await expect(formationBlocks.nth(2)).toContainText("F3");
  await root.locator("[data-v2-action-bar]").getByRole("button", { name: "대형 목록" }).click();
  await expect(root.locator("[data-v2-bottom-sheet='formation-list']")).toBeVisible();
  expect(browserIssues).toEqual([]);
});

test("top action dropdowns stay scoped and visible across desktop and mobile", async ({ page }) => {
  const browserIssues = collectBrowserIssues(page);
  await page.addInitScript(() => localStorage.clear());
  await page.goto("/");
  await page.getByRole("button", { name: /빈 프로젝트 시작/ }).click();

  const root = page.locator("[data-v2-visual-editor]");
  await expect(root).toBeVisible();
  await root.getByRole("button", { name: "공유" }).click();
  await expect(root.locator(".v2-share-menu")).toBeVisible();
  await expectMenuInsideViewport(page, ".v2-share-menu");
  await root.getByRole("button", { name: "내보내기" }).click();
  await expect(root.locator(".v2-share-menu")).toHaveCount(0);
  await expect(root.locator(".v2-export-menu")).toBeVisible();
  await expectMenuInsideViewport(page, ".v2-export-menu");
  await root.getByRole("button", { name: "더보기" }).click();
  await expect(root.locator(".v2-export-menu")).toHaveCount(0);
  await expect(root.locator(".v2-more-menu")).toBeVisible();
  await expectMenuInsideViewport(page, ".v2-more-menu", { screenshotPath: "test-results/top-dropdown-v2-more.png" });
  await page.keyboard.press("Escape");
  await expect(root.locator(".v2-top-menu")).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(root).toBeVisible();
  await expect(root.locator(".v2-topbar")).toBeVisible();
  await expect(root.locator("[data-v2-action-bar]")).toBeVisible();

  await page.setViewportSize({ width: 844, height: 390 });
  await expect(root).toBeVisible();
  await expect(root.locator(".v2-topbar")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(root.locator(".v2-top-menu")).toHaveCount(0);
  expect(browserIssues).toEqual([]);
});

test("mobile viewport keeps the V2 stage shell editable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => localStorage.clear());
  await page.goto("/");

  await page.getByRole("button", { name: /빈 프로젝트 시작/ }).click();
  const editor = page.locator("[data-v2-visual-editor]");
  await expect(editor).toBeVisible();
  const token = editor.locator("[data-v2-performer-token]").first();
  await expect(token).toBeVisible();

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
  await token.dispatchEvent("pointerdown", { ...pointer, clientX: start.x, clientY: start.y, buttons: 1 });
  await expectNoBottomStatus(page);

  await expect(editor.locator("[data-v2-action-bar]")).toHaveAttribute("data-v2-action-bar-state", "performer");

  const viewport = page.viewportSize();
  const actionBarBox = await editor.locator("[data-v2-action-bar]").boundingBox();
  expect(viewport).not.toBeNull();
  expect(actionBarBox).not.toBeNull();
  const bottomGap = viewport.height - actionBarBox.y - actionBarBox.height;
  expect(bottomGap).toBeGreaterThanOrEqual(0);
  expect(bottomGap).toBeLessThanOrEqual(2);
  expect(Math.abs(actionBarBox.x + actionBarBox.width / 2 - viewport.width / 2)).toBeLessThan(2);
});

test("mobile contextual performer actions expose the V2 action bar", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => localStorage.clear());
  await page.goto("/");

  await page.getByRole("button", { name: /빈 프로젝트 시작/ }).click();
  const editor = page.locator("[data-v2-visual-editor]");
  await expect(editor).toBeVisible();
  const firstToken = editor.locator("[data-v2-performer-token]").first();
  const secondToken = editor.locator("[data-v2-performer-token]").nth(1);
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

  await expect(editor.locator("[data-v2-action-bar]")).toHaveAttribute("data-v2-action-bar-state", "performer");
  await expect(editor.locator("[data-v2-action-bar]")).toBeVisible();
  await expect(editor.locator("[data-v2-action-bar] button")).not.toHaveCount(0);
  await expect(page.locator(".mobile-bottom-sheet")).toHaveCount(0);

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

  await expect(editor.locator("[data-v2-action-bar]")).toBeVisible();
  await expect(editor.locator("[data-v2-action-bar] button")).not.toHaveCount(0);
});

test("View Link route opens readonly V2 review", async ({ page }) => {
  await routeCloudProject(page, seededProject());
  await page.goto("/share/project-1");

  const root = page.locator("[data-v2-visual-editor]");
  await expect(root).toBeVisible();
  await expect(page.getByRole("button", { name: "저장하기" })).toHaveCount(0);
  await expect(root.locator("[data-v2-segment-kind='hold']")).toHaveCount(3);
  await expect(root.locator("[data-v2-action-bar]").getByRole("button", { name: "대형 추가" })).toBeDisabled();
});

test("valid Edit Link route exposes V2 edit controls", async ({ page }) => {
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

  const root = page.locator("[data-v2-visual-editor]");
  await expect(root).toBeVisible();
  await expect(page.getByText(/편집 링크 토큰이 맞지 않아/)).toHaveCount(0);
  await expect(root.locator("[data-v2-action-bar]").getByRole("button", { name: "대형 추가" })).toBeEnabled();

  await root.getByRole("button", { name: "공유" }).click();
  await root.locator(".v2-share-menu .v2-menu-link-row").filter({ hasText: "보기 링크" }).getByRole("button", { name: "복사" }).click();
  await expect(page.locator(".status")).toContainText("공유 링크를 복사했습니다.");
  await expect.poll(() => page.evaluate(() => window.__lastCopiedText)).toContain("/share/project-1");
  await page.getByRole("button", { name: "상태 알림 닫기" }).click();
  await expectNoBottomStatus(page);
});

test("Stage 1 auth fixture saves and shares as the signed-in owner", async ({ page }) => {
  const capturedRequests = [];
  const ownerPlan = {
    ...seededProject({ viewEnabled: false, editEnabled: false }),
    owner: { userId: "owner-1", createdAt: "2026-05-29T00:00:00.000Z" },
    shareLinks: {
      view: { projectId: "", token: "", enabled: false },
      edit: { projectId: "", token: "", enabled: false }
    }
  };
  await seedLocalProject(page, ownerPlan);
  const ownerAccessToken = testAccessToken({ userId: "owner-1" });
  await seedSupabaseSession(page, { userId: "owner-1", accessToken: ownerAccessToken });
  await routeSupabaseUser(page, { userId: "owner-1" });
  await routeCloudSaves(page, capturedRequests);

  await page.goto(authCallbackPath({ accessToken: ownerAccessToken }));
  await page.getByRole("button", { name: "공유" }).click();
  const createShareButton = page.locator(".v2-share-menu").getByRole("button", { name: "편집 링크 만들기" });
  await expect(createShareButton).toBeEnabled();
  await createShareButton.click();
  await expect(page.locator(".status")).toContainText("View Link와 Edit Link가 생성되었습니다.");
  await expect.poll(() => capturedRequests.length).toBeGreaterThanOrEqual(2);
  expect(capturedRequests.every((request) => request.authorization === `Bearer ${ownerAccessToken}`)).toBe(true);
  expect(capturedRequests.at(-1).body.owner_id).toBe("owner-1");
  expect(capturedRequests.at(-1).body.account_plan).toBe("free");
  expect(capturedRequests.at(-1).body.view_enabled).toBe(true);
  expect(capturedRequests.at(-1).body.plan.owner.userId).toBe("owner-1");

  await expect.poll(() => capturedRequests.some((request) => request.body?.edit_enabled === true)).toBe(true);
  const shareRequest = capturedRequests.find((request) => request.body?.edit_enabled === true);
  expect(shareRequest.body.view_enabled).toBe(true);
  expect(shareRequest.body.edit_token).toBeTruthy();
  expect(shareRequest.body.plan.shareLinks.edit.enabled).toBe(true);
});

test("Stage 1 auth fixture keeps guest and non-owner link management blocked", async ({ page }) => {
  const guestRequests = [];
  await seedLocalProject(page, seededProject({ viewEnabled: false, editEnabled: false }));
  await routeCloudSaves(page, guestRequests);
  await page.goto("/");

  await page.getByRole("button", { name: "공유" }).click();
  await expect(page.locator(".v2-share-menu").getByRole("button", { name: "편집 링크 만들기" })).toBeDisabled();
  expect(guestRequests).toHaveLength(0);

  const nonOwnerRequests = [];
  await page.close();
  const nonOwnerPage = await page.context().newPage();
  const sharedPlan = {
    ...seededProject({ viewEnabled: true, editEnabled: true }),
    owner: { userId: "owner-1", createdAt: "2026-05-29T00:00:00.000Z" }
  };
  await seedLocalProject(nonOwnerPage, sharedPlan);
  await seedSupabaseSession(nonOwnerPage, { userId: "other-user", accessToken: testAccessToken({ userId: "other-user" }) });
  await routeCloudSaves(nonOwnerPage, nonOwnerRequests);
  await nonOwnerPage.goto("/");
  await nonOwnerPage.getByRole("button", { name: "공유" }).click();
  await expect(nonOwnerPage.locator(".v2-share-menu").getByRole("button", { name: "끄기" })).toHaveCount(0);
  expect(nonOwnerRequests).toHaveLength(0);
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

test("mobile V2 review and toolbar routes stay usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await routeCloudProject(page, seededProject({ longMove: false }));
  await page.goto("/share/project-1");

  await expect(page.locator("[data-v2-stage]")).toBeVisible();
  await expect(page.locator("[data-v2-visual-editor]")).toBeVisible();

  await page.addInitScript(() => localStorage.clear());
  await page.goto("/");
  await page.getByRole("button", { name: /빈 프로젝트 시작/ }).click();
  const editor = page.locator("[data-v2-visual-editor]");
  await expect(editor).toBeVisible();
  await expect(editor.locator(".v2-topbar")).toBeVisible();
  await expect(page.getByRole("button", { name: "Google 로그인" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "저장하기" })).toHaveCount(0);
  await expect(editor.locator("[data-v2-stage]")).toBeVisible();
  await expect(editor.locator("[data-v2-timeline]")).toBeVisible();
  await expect(editor.locator("[data-v2-action-bar]")).toBeVisible();

  const stageFrameBox = await editor.locator("[data-v2-stage]").boundingBox();
  const timelineEditorBox = await editor.locator("[data-v2-timeline]").boundingBox();
  const actionBarInitialBox = await editor.locator("[data-v2-action-bar]").boundingBox();
  expect(stageFrameBox).not.toBeNull();
  expect(timelineEditorBox).not.toBeNull();
  expect(actionBarInitialBox).not.toBeNull();
});

test("V2 stage settings and template sheets stay stable", async ({ page }) => {
  const browserIssues = collectBrowserIssues(page);
  await page.addInitScript(() => localStorage.clear());
  await page.goto("/");
  await page.getByRole("button", { name: /빈 프로젝트 시작/ }).click();
  const root = page.locator("[data-v2-visual-editor]");
  await expect(root.locator("[data-v2-stage-guides]")).toBeVisible();
  await root.locator("[data-v2-action-bar]").getByRole("button", { name: "무대 설정" }).click();
  await expect(root.locator("[data-v2-bottom-sheet='stage-settings']")).toBeVisible();
  await expect(root.locator("[data-v2-bottom-sheet='stage-settings']")).toContainText("앞쪽 주의 구역");
  await root.locator("[data-v2-bottom-sheet='stage-settings']").getByRole("button", { name: "닫기" }).click();
  await expect(root.locator("[data-v2-bottom-sheet='stage-settings']")).toHaveCount(0);

  await root.locator("[data-v2-segment-kind='hold']").first().click();
  await root.locator("[data-v2-action-bar]").getByRole("button", { name: "템플릿" }).click();
  await expect(root.locator("[data-v2-bottom-sheet='formation-template']")).toBeVisible();
  await root.locator("[data-v2-bottom-sheet='formation-template']").getByRole("button", { name: "Line", exact: true }).click();
  await expect(root.locator("[data-v2-bottom-sheet='formation-template']").getByRole("button", { name: "현재 대형에 적용" })).toHaveCount(0);
  await expect(root.locator("[data-v2-bottom-sheet='formation-template']").getByRole("button", { name: "새 대형으로 추가" })).toBeEnabled();
  expect(browserIssues).toEqual([]);
});
