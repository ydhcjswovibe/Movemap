# V2 Action Bar Formation Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the root V2 fixed bottom category rail with a mobile-first action bar and ship the formation workflow as sequential, separately committed slices.

**Architecture:** `src/v2EditorRuntime.mjs` remains the source of the serializable V2 view model and gains `actionBar` plus compatibility aliases for `bottomRail`. `src/App.jsx` owns mutations, sheet state, formation creation/deletion policy, and undoable updates. `src/V2VisualEditor.jsx` renders the action bar and sheets, while `src/v2VisualEditor.css` keeps the 390px mobile geometry stable.

**Tech Stack:** React in `src/App.jsx` and `src/V2VisualEditor.jsx`, pure runtime helpers in `src/v2EditorRuntime.mjs`, timeline policy helpers in `src/formationTimelineEdit.mjs` / `src/timelinePolicy.mjs`, Node test runner, Playwright browser tests.

---

## Source Documents

- Product contract: `SPEC.md`
- Stage and route contract: `MVP.md`
- Design source: `docs/superpowers/specs/2026-06-16-v2-action-bar-formation-workflow-design.md`

## Execution Rules

- Execute slices in order.
- Commit after each slice passes its listed verification.
- Before every commit, run `git status --short` and `git diff --cached`.
- Stage only the files for the current slice. Leave unrelated `.superpowers/` artifacts and unrelated untracked docs alone unless the user explicitly asks to include them.
- Do not restore legacy `/v2`, `/share/:id/v2`, `/edit/:id/v2`, or `/editor-v2` routes.
- Keep top `Share`, `Export`, and `More` ownership unchanged. JSON, PNG, and PDF remain under `Export`; link actions remain under `Share`.

## Current Starting Point

As of this plan, root V2 already has:

- `activeV2BottomSheet` in `src/App.jsx`.
- `bottomRail`, `bottomRailMode`, and `bottomSheet` in `src/v2EditorRuntime.mjs`.
- Existing `data-v2-bottom-rail`, `data-v2-bottom-sheet`, and `data-v2-bottom-sheet-item` rendering in `src/V2VisualEditor.jsx`.
- Browser coverage in `tests/browser/v2-visual.spec.mjs` that still expects `대형 / 사람 / 무대`, `formation/performer/default` rail modes, and `해제`.
- Existing `visiblePositions` in `src/App.jsx` and `stage.visiblePositions` in `src/v2EditorRuntime.mjs`.
- Current deletion policy blocks the final formation in `src/App.jsx`.

## File Structure

- Modify `src/v2EditorRuntime.mjs`
  - Add action-bar item helpers.
  - Return `actionBar` and `actionBarState`.
  - Keep `bottomRail` and `bottomRailMode` aliases during this slice set.
  - Expand sheet models to `formation-list`, `formation-details`, `formation-template`, `cast-list`, `cast-add`, `stage-settings`, and `music`.

- Modify `src/App.jsx`
  - Add focused helpers for V2 formation creation position source.
  - Add empty-formation deletion support.
  - Add multi-select sheet state.
  - Add name/memo field edit batching.
  - Add template apply/add actions through existing template helpers.

- Modify `src/V2VisualEditor.jsx`
  - Render the action bar using `model.actionBar`.
  - Add `data-v2-action-bar` while keeping `data-v2-bottom-rail`.
  - Render formation-list, name/memo, template, cast, stage, and music sheet variants.
  - Remove visible `해제` action from the action bar while preserving direct selection clearing.

- Modify `src/v2VisualEditor.css`
  - Style a single-row horizontally scrolling action bar.
  - Style formation list rows and sheet headers.
  - Keep 390px mobile layout stable with open sheets above the fixed action bar.

- Modify `src/v2EditorRuntime.test.mjs`
  - Cover action-bar states, aliases, sheet keys, readonly gating, empty formation state, and formatted formation rows.

- Modify `src/movementTimingControls.test.mjs`
  - Update source-level expectations around `대형 추가` position source and final-formation deletion policy where needed.

- Modify `src/statusNoise.test.mjs`
  - Remove or replace the old “마지막 대형은 삭제할 수 없습니다” expectation after the empty-formation policy slice.

- Modify `tests/browser/v2-visual.spec.mjs`
  - Update existing bottom rail tests to action-bar labels and attributes.
  - Add focused tests for row select, multi-select delete, empty state, name/memo, template apply/add, readonly empty route, and 390px geometry.

---

### Slice 0: Baseline And Planning Commit

**Files:**
- Modify/Stage: `docs/superpowers/specs/2026-06-16-v2-action-bar-formation-workflow-design.md`
- Create/Stage: `docs/superpowers/plans/2026-06-16-v2-action-bar-formation-workflow.md`

- [ ] **Step 1: Re-check working tree**

Run:

```bash
git status --short --branch
git diff --stat
```

Expected: the spec file and this plan are visible; unrelated `.superpowers/` remains untracked.

- [ ] **Step 2: Validate doc whitespace**

Run:

```bash
git diff --check -- docs/superpowers/specs/2026-06-16-v2-action-bar-formation-workflow-design.md docs/superpowers/plans/2026-06-16-v2-action-bar-formation-workflow.md
```

Expected: no output.

- [ ] **Step 3: Commit only the plan/spec docs**

Run:

```bash
git add docs/superpowers/specs/2026-06-16-v2-action-bar-formation-workflow-design.md docs/superpowers/plans/2026-06-16-v2-action-bar-formation-workflow.md
git diff --cached --stat
git commit -m "docs: plan V2 action bar formation workflow"
```

Expected: one docs-only commit. Do not include `.superpowers/` or the older untracked `docs/superpowers/plans/2026-06-12-v2-bottom-menu-sheet.md` unless the user explicitly asks.

---

### Slice 1: Runtime Action Bar Model And DOM Compatibility

**Files:**
- Modify: `src/v2EditorRuntime.mjs`
- Modify: `src/V2VisualEditor.jsx`
- Modify: `src/v2VisualEditor.css`
- Test: `src/v2EditorRuntime.test.mjs`
- Test: `tests/browser/v2-visual.spec.mjs`

- [ ] **Step 1: Add failing runtime tests for action bar states**

Add tests to `src/v2EditorRuntime.test.mjs` near the existing bottom rail tests:

```js
test("V2 runtime exposes action bar states while preserving bottom rail aliases", () => {
  const defaultRuntime = createV2EditorRuntime({
    activeTab: "Stage",
    sortedSections: [{ id: "intro", name: "Intro", time: 4, end: 4, moveDuration: 4 }],
    performers: [{ id: "p1", label: "A1", name: "A1" }],
    readonly: false
  });

  assert.equal(defaultRuntime.actionBarState, "default");
  assert.deepEqual(defaultRuntime.actionBar.map((action) => action.label), [
    "대형 추가",
    "대형 목록",
    "사람 추가",
    "사람 목록",
    "무대 설정",
    "음악"
  ]);
  assert.deepEqual(defaultRuntime.bottomRail.map((action) => action.key), defaultRuntime.actionBar.map((action) => action.key));
  assert.equal(defaultRuntime.bottomRailMode, "default");

  const selectedRuntime = createV2EditorRuntime({
    mobileContextSelection: "formation",
    selectedSectionId: "intro",
    selectedSection: { id: "intro", name: "Intro", time: 4, end: 4, moveDuration: 4 },
    sortedSections: [{ id: "intro", name: "Intro", time: 4, end: 4, moveDuration: 4 }],
    readonly: false
  });

  assert.equal(selectedRuntime.actionBarState, "formation");
  assert.deepEqual(selectedRuntime.actionBar.map((action) => action.label), [
    "삭제",
    "복제",
    "템플릿",
    "대형 추가",
    "대형 목록",
    "이름/메모"
  ]);
  assert.equal(selectedRuntime.actionBar.some((action) => action.label === "해제"), false);
  assert.equal(selectedRuntime.bottomRailMode, "formation");
});
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
node --test src/v2EditorRuntime.test.mjs
```

Expected: FAIL because `actionBar` and `actionBarState` do not exist.

- [ ] **Step 3: Implement action-bar helpers in `src/v2EditorRuntime.mjs`**

Add pure helpers above `createV2EditorRuntime`:

```js
const V2_ACTION_SHEET_KEYS = new Set([
  "formation-list",
  "formation-details",
  "formation-template",
  "cast-list",
  "cast-add",
  "stage-settings",
  "music"
]);

function normalizedActionSheetKey(value) {
  if (V2_ACTION_SHEET_KEYS.has(value)) return value;
  if (value === "formations") return "formation-list";
  if (value === "cast") return "cast-list";
  if (value === "stage") return "stage-settings";
  return null;
}

function defaultActionBar({ capabilities, activeBottomSheet }) {
  return [
    { key: "add-formation", icon: "add", label: "대형 추가", action: "add-formation", disabled: !capabilities.canAddFormation },
    { key: "formation-list", icon: "layer", label: "대형 목록", sheet: "formation-list", active: activeBottomSheet === "formation-list" },
    { key: "cast-add", icon: "add", label: "사람 추가", sheet: "cast-add", active: activeBottomSheet === "cast-add", disabled: false },
    { key: "cast-list", icon: "users", label: "사람 목록", sheet: "cast-list", active: activeBottomSheet === "cast-list" },
    { key: "stage-settings", icon: "grid", label: "무대 설정", sheet: "stage-settings", active: activeBottomSheet === "stage-settings" },
    { key: "music", icon: "music", label: "음악", sheet: "music", active: activeBottomSheet === "music" }
  ];
}

function formationActionBar({ capabilities, activeBottomSheet }) {
  return [
    { key: "delete-formation", icon: "close", label: "삭제", action: "delete-formation", danger: true, disabled: !capabilities.canDelete },
    { key: "duplicate-formation", icon: "add", label: "복제", action: "duplicate-formation", disabled: !capabilities.canDuplicate },
    { key: "formation-template", icon: "sparkle", label: "템플릿", sheet: "formation-template", active: activeBottomSheet === "formation-template" },
    { key: "add-formation", icon: "add", label: "대형 추가", action: "add-formation", disabled: !capabilities.canAddFormation },
    { key: "formation-list", icon: "layer", label: "대형 목록", sheet: "formation-list", active: activeBottomSheet === "formation-list" },
    { key: "formation-details", icon: "edit", label: "이름/메모", sheet: "formation-details", active: activeBottomSheet === "formation-details" }
  ];
}
```

Replace the current `activeBottomSheet` normalization with:

```js
  const activeBottomSheet = normalizedActionSheetKey(input.activeBottomSheet || input.activeV2BottomSheet);
```

Replace the current `bottomRail` assembly with:

```js
  let actionBarState = "default";
  let actionBar = defaultActionBar({ capabilities, activeBottomSheet });

  if (hasPerformerSelection) {
    actionBarState = "performer";
    actionBar = selectedPerformerIds.length > 1
      ? [
          { key: "align-x", icon: "grid", label: "세로", disabled: readonly },
          { key: "align-y", icon: "grid", label: "가로", disabled: readonly },
          { key: "delete-performers", icon: "close", label: "삭제", danger: true, disabled: readonly },
          { key: "clear-selection", icon: "select", label: "해제" }
        ]
      : [
          { key: "duplicate-performer", icon: "add", label: "복제", disabled: readonly },
          { key: "delete-performer", icon: "close", label: "삭제", danger: true, disabled: readonly },
          { key: "cast-list", icon: "users", label: "사람 목록", sheet: "cast-list", active: activeBottomSheet === "cast-list", disabled: false },
          { key: "clear-selection", icon: "select", label: "해제" }
        ];
  } else if (hasFormationSelection) {
    actionBarState = "formation";
    actionBar = formationActionBar({ capabilities, activeBottomSheet });
  }

  const bottomRailMode = actionBarState;
  const bottomRail = actionBar;
```

Keep performer-selected behavior compatible in this slice: preserve the existing performer action keys and labels, but render them through the same `data-v2-action-bar` container. Do not remove performer `해제` in this formation-focused plan.

- [ ] **Step 4: Render the new DOM attribute**

In `src/V2VisualEditor.jsx`, update the bottom nav:

```jsx
<nav
  className={`v2-bottom-rail v2-action-bar v2-bottom-rail-${bottomRailMode}`}
  data-v2-bottom-rail
  data-v2-action-bar
  data-v2-action-bar-state={bottomRailMode}
  data-v2-bottom-rail-mode={bottomRailMode}
  aria-label={bottomRailMode === "formation" ? "선택 대형 도구" : "편집 작업"}
>
  {(view.actionBar || view.bottomRail || []).map((action) => (
    <IconButton
      key={action.key || action.label}
      icon={action.icon}
      label={action.label}
      className={action.danger ? "is-danger" : ""}
      primary={action.primary}
      active={Boolean(action.active)}
      disabled={Boolean(action.disabled)}
      onClick={() => runBottomAction(action)}
    >
      <CoolIcon name={action.icon} />
      <span className="v2-bottom-label">{action.label}</span>
    </IconButton>
  ))}
</nav>
```

- [ ] **Step 5: Add action-bar CSS without changing layout height**

In `src/v2VisualEditor.css`, add:

```css
.v2-action-bar {
  display: flex;
  flex-wrap: nowrap;
  gap: 6px;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
}

.v2-action-bar::-webkit-scrollbar {
  display: none;
}

.v2-action-bar .v2-icon-button {
  flex: 0 0 64px;
  min-width: 64px;
}

.v2-action-bar .v2-bottom-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 58px;
}
```

- [ ] **Step 6: Update focused browser expectations**

In `tests/browser/v2-visual.spec.mjs`, change the default rail assertions in the existing top-menu/bottom-mode test to:

```js
const actionBar = root.locator("[data-v2-action-bar]");
await expect(actionBar).toBeVisible();
await expect(actionBar).toHaveAttribute("data-v2-action-bar-state", "default");
await expect(actionBar.getByRole("button", { name: "대형 추가" })).toBeVisible();
await expect(actionBar.getByRole("button", { name: "대형 목록" })).toBeVisible();
await expect(actionBar.getByRole("button", { name: "사람 추가" })).toBeVisible();
await expect(actionBar.getByRole("button", { name: "사람 목록" })).toBeVisible();
await expect(actionBar.getByRole("button", { name: "무대 설정" })).toBeVisible();
await expect(actionBar.getByRole("button", { name: "음악" })).toBeVisible();
await expect(actionBar.getByRole("button", { name: "해제" })).toHaveCount(0);
```

- [ ] **Step 7: Verify slice**

Run:

```bash
node --test src/v2EditorRuntime.test.mjs
npm run test:browser -- tests/browser/v2-visual.spec.mjs
npm run build
git diff --check
```

Expected: all pass. If full `v2-visual.spec.mjs` exposes stale old-label assertions, update only those assertions to the new action-bar contract.

- [ ] **Step 8: Commit slice**

Run:

```bash
git add src/v2EditorRuntime.mjs src/V2VisualEditor.jsx src/v2VisualEditor.css src/v2EditorRuntime.test.mjs tests/browser/v2-visual.spec.mjs
git diff --cached --stat
git commit -m "feat: add V2 action bar model"
```

---

### Slice 2: Formation Add Uses Visible Stage Positions

**Files:**
- Modify: `src/App.jsx`
- Test: `src/movementTimingControls.test.mjs`
- Test: `tests/browser/v2-visual.spec.mjs`

- [ ] **Step 1: Add source-level test for visible position capture**

In `src/movementTimingControls.test.mjs`, replace or extend the current `formation add keeps legacy selection while V2 can force playhead insertion` test with:

```js
test("V2 formation add captures visible positions before falling back to stored sections", () => {
  const addSection = appSource.match(/function addSection\(\{ forceAppend = false, forceCreate = false \} = \{\}\) \{[\s\S]*?\n  \}/)?.[0] || "";

  assert.match(appSource, /function formationCreationPositions\(/);
  assert.match(addSection, /formationCreationPositions\(\{/);
  assert.match(addSection, /visiblePositions/);
  assert.match(addSection, /previous\?\.positions/);
  assert.match(addSection, /action: "add-after"/);
  assert.match(v2Source, /runtimeActions\.addFormation\?\.\(\{ forceCreate: true \}\)/);
});
```

- [ ] **Step 2: Add browser test for transition-position insertion**

In `tests/browser/v2-visual.spec.mjs`, add a focused test near the existing V2 add-formation tests:

```js
test("V2 add formation inside a transition stores the visible interpolated positions", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedProject(page);
  await page.goto("/");

  const root = page.locator("[data-v2-visual-editor]");
  await expect(root).toBeVisible();
  const projectBefore = await storedProject(page);
  const previous = projectBefore.sections.find((section) => section.id === "intro");
  const next = projectBefore.sections.find((section) => section.id === "diamond");
  expect(previous).toBeTruthy();
  expect(next).toBeTruthy();
  const transitionTime = ((next.start ?? 0) + (next.time ?? next.end ?? 0)) / 2;
  await page.evaluate((value) => {
    const audio = document.querySelector("audio");
    if (audio) Object.defineProperty(audio, "currentTime", { configurable: true, value });
  }, transitionTime);
  await root.getByRole("button", { name: "대형 추가" }).click();

  const project = await storedProject(page);
  const added = project.sections.find((section) => section.name === "대형");

  expect(added).toBeTruthy();
  expect(added.positions.a1).not.toEqual(previous.positions.a1);
  expect(added.positions.a1).not.toEqual(next.positions.a1);
});
```

- [ ] **Step 3: Run failing tests**

Run:

```bash
node --test src/movementTimingControls.test.mjs
npm run test:browser -- tests/browser/v2-visual.spec.mjs
```

Expected: FAIL because `addSection` still copies the previous/last formation positions.

- [ ] **Step 4: Implement the position-source helper in `src/App.jsx`**

Add this helper near other small helpers before `function addSection`:

```jsx
function formationCreationPositions({ performers = [], visiblePositions = {}, fallbackPositions = {}, stageDimensions }) {
  const visibleEntries = Object.fromEntries(
    performers
      .map((performer) => {
        const position = visiblePositions?.[performer.id];
        if (!position || !Number.isFinite(Number(position.x)) || !Number.isFinite(Number(position.y))) return null;
        return [performer.id, clampPointToStage({ x: Number(position.x), y: Number(position.y) }, stageDimensions)];
      })
      .filter(Boolean)
  );
  if (Object.keys(visibleEntries).length) return visibleEntries;
  if (fallbackPositions && Object.keys(fallbackPositions).length) {
    return JSON.parse(JSON.stringify(fallbackPositions));
  }
  return Object.fromEntries(performers.map((performer, index) => [
    performer.id,
    clampPointToStage({ x: 18 + index * 8, y: 55 }, stageDimensions)
  ]));
}
```

Update `addSection`:

```jsx
const fallbackPositions = previous?.positions || {};
const positions = formationCreationPositions({
  performers: plan.performers,
  visiblePositions,
  fallbackPositions,
  stageDimensions
});
```

Remove the old direct `previous?.positions || Object.fromEntries(...)` assignment.

- [ ] **Step 5: Verify slice**

Run:

```bash
node --test src/movementTimingControls.test.mjs
npm run test:browser -- tests/browser/v2-visual.spec.mjs
npm test
npm run build
git diff --check
```

Expected: all pass.

- [ ] **Step 6: Commit slice**

Run:

```bash
git add src/App.jsx src/movementTimingControls.test.mjs tests/browser/v2-visual.spec.mjs
git diff --cached --stat
git commit -m "feat: capture visible positions for V2 formation add"
```

---

### Slice 3: Formation List Sheet And Single-Selection Actions

**Files:**
- Modify: `src/v2EditorRuntime.mjs`
- Modify: `src/V2VisualEditor.jsx`
- Modify: `src/v2VisualEditor.css`
- Test: `src/v2EditorRuntime.test.mjs`
- Test: `tests/browser/v2-visual.spec.mjs`

- [ ] **Step 1: Add runtime test for formation row labels and header state**

Add:

```js
test("V2 formation list sheet exposes fixed row labels and selected header actions", () => {
  const runtime = createV2EditorRuntime({
    activeBottomSheet: "formation-list",
    currentSectionId: "f1",
    mobileContextSelection: "formation",
    selectedSectionId: "f2",
    selectedSection: { id: "f2", name: "Chorus", time: 16, start: 12, end: 16, moveDuration: 4 },
    sortedSections: [
      { id: "f1", name: "Intro", time: 8, start: 4, end: 8, moveDuration: 4 },
      { id: "f2", name: "Chorus", time: 16, start: 12, end: 16, moveDuration: 4 }
    ],
    readonly: false
  });

  assert.equal(runtime.bottomSheet.key, "formation-list");
  assert.equal(runtime.bottomSheet.title, "대형 목록");
  assert.equal(runtime.bottomSheet.headerLabel, "F2 Chorus");
  assert.deepEqual(runtime.bottomSheet.headerActions.map((action) => action.key), [
    "delete-formation",
    "duplicate-formation",
    "formation-template",
    "formation-details",
    "close-sheet"
  ]);
  assert.deepEqual(runtime.bottomSheet.items.map((item) => [item.sequenceLabel, item.label, item.timeRangeLabel]), [
    ["F1", "Intro", "4.0s ~ 8.0s"],
    ["F2", "Chorus", "12.0s ~ 16.0s"]
  ]);
});
```

- [ ] **Step 2: Implement formation list view model**

In `src/v2EditorRuntime.mjs`, add helpers:

```js
function formationSequenceLabel(index) {
  return `F${index + 1}`;
}

function formationRangeLabel(section) {
  const timing = formationTimingFor(section);
  return `${formatSeconds(timing.start)} ~ ${formatSeconds(timing.end)}`;
}
```

Build `formation-list` sheet with:

```js
const selectedIndex = Math.max(0, sortedSections.findIndex((section) => section.id === selectedSectionId));

{
  key: "formation-list",
  title: "대형 목록",
  headerLabel: selectedSection ? `${formationSequenceLabel(selectedIndex)} ${sectionDisplayName(selectedSection)}` : "대형 목록",
  headerActions: selectedSection ? [
    { key: "delete-formation", icon: "close", label: "삭제", danger: true, disabled: readonly },
    { key: "duplicate-formation", icon: "add", label: "복제", disabled: readonly },
    { key: "formation-template", icon: "sparkle", label: "템플릿", sheet: "formation-template", disabled: readonly },
    { key: "formation-details", icon: "edit", label: "이름", sheet: "formation-details", disabled: readonly },
    { key: "close-sheet", icon: "close", label: "닫기" }
  ] : [
    { key: "multi-select", icon: "select", label: "다중선택", disabled: readonly },
    { key: "close-sheet", icon: "close", label: "닫기" }
  ],
  items: sortedSections.map((section, index) => ({
    key: `formation-${section.id}`,
    kind: "formation-row",
    sectionId: section.id,
    sequenceLabel: formationSequenceLabel(index),
    label: sectionDisplayName(section),
    timeRangeLabel: formationRangeLabel(section),
    active: section.id === selectedSectionId,
    current: section.id === currentSectionId,
    action: "select-formation"
  }))
}
```

- [ ] **Step 3: Render list header and rows**

In `src/V2VisualEditor.jsx`, update sheet header rendering:

```jsx
const runBottomSheetHeaderAction = (action) => {
  if (!action || action.disabled) return;
  if (action.key === "close-sheet") {
    runtimeActions.toggleBottomSheet?.(view.bottomSheet.key);
    return;
  }
  runBottomAction(action);
};

<div className="v2-bottom-sheet-header">
  <strong>{view.bottomSheet.headerLabel || view.bottomSheet.title}</strong>
  <div className="v2-bottom-sheet-header-actions">
    {(view.bottomSheet.headerActions || [{ key: "close-sheet", label: "닫기" }]).map((action) => (
      <button key={action.key} type="button" disabled={Boolean(action.disabled)} onClick={() => runBottomSheetHeaderAction(action)}>
        {action.label}
      </button>
    ))}
  </div>
</div>
```

Render `formation-row` items with:

```jsx
<button
  key={item.key}
  type="button"
  className={`v2-formation-list-row ${item.active ? "is-active" : ""} ${item.current ? "is-current" : ""}`}
  data-v2-formation-list-row={item.sectionId}
  data-v2-bottom-sheet-item={item.key}
  onClick={() => runBottomSheetItem(item)}
>
  <span className="v2-formation-row-sequence">{item.sequenceLabel}</span>
  <span className="v2-formation-row-name">{item.label}</span>
  <span className="v2-formation-row-time">{item.timeRangeLabel}</span>
</button>
```

- [ ] **Step 4: Ensure row tap keeps the sheet open**

In `runBottomSheetItem`, keep formation-list open after selecting:

```jsx
if (item.action === "select-formation") {
  const section = sectionById.get(item.sectionId);
  if (section) runtimeActions.selectFormation?.(section, { force: true, keepSheetOpen: true });
  return;
}
```

In `src/App.jsx`, update `selectFormationForMobileSurface` or the V2 formation select handler to honor `keepSheetOpen: true` and not clear `activeV2BottomSheet`.

- [ ] **Step 5: Add browser test for row selection**

Add:

```js
test("V2 formation list row selects and keeps the sheet open", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedProject(page);
  await page.goto("/");

  const root = page.locator("[data-v2-visual-editor]");
  await root.locator("[data-v2-action-bar]").getByRole("button", { name: "대형 목록" }).click();
  const sheet = root.locator('[data-v2-bottom-sheet="formation-list"]');
  await expect(sheet).toBeVisible();
  await expect(sheet.locator('[data-v2-formation-list-row="diamond"]')).toContainText("F2");
  await expect(sheet.locator('[data-v2-formation-list-row="diamond"]')).toContainText(/s ~ /);

  await sheet.locator('[data-v2-formation-list-row="diamond"]').click();
  await expect(sheet).toBeVisible();
  await expect(root.locator('[data-v2-formation-block="diamond"][aria-pressed="true"]').first()).toBeVisible();
});
```

- [ ] **Step 6: Verify slice**

Run:

```bash
node --test src/v2EditorRuntime.test.mjs
npm run test:browser -- tests/browser/v2-visual.spec.mjs
npm test
npm run build
git diff --check
```

- [ ] **Step 7: Commit slice**

Run:

```bash
git add src/v2EditorRuntime.mjs src/V2VisualEditor.jsx src/v2VisualEditor.css src/v2EditorRuntime.test.mjs tests/browser/v2-visual.spec.mjs src/App.jsx
git diff --cached --stat
git commit -m "feat: add V2 formation list sheet"
```

---

### Slice 4: Empty Formation State And Multi-Select Deletion

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/v2EditorRuntime.mjs`
- Modify: `src/V2VisualEditor.jsx`
- Modify: `src/v2VisualEditor.css`
- Test: `src/v2EditorRuntime.test.mjs`
- Test: `src/statusNoise.test.mjs`
- Test: `tests/browser/v2-visual.spec.mjs`

- [ ] **Step 1: Add runtime test for multi-select and empty state**

Add:

```js
test("V2 formation list supports multi-select and empty formation state", () => {
  const multi = createV2EditorRuntime({
    activeBottomSheet: "formation-list",
    formationListMode: "multi",
    selectedFormationIds: ["f1"],
    sortedSections: [
      { id: "f1", name: "Intro", time: 8, start: 4, end: 8 },
      { id: "f2", name: "Chorus", time: 16, start: 12, end: 16 }
    ]
  });

  assert.equal(multi.bottomSheet.headerLabel, "1개 선택됨");
  assert.deepEqual(multi.bottomSheet.headerActions.map((action) => action.key), ["select-all-formations", "delete-selected-formations", "cancel-multi-select"]);
  assert.equal(multi.bottomSheet.items[0].checked, true);

  const empty = createV2EditorRuntime({
    activeBottomSheet: "formation-list",
    sortedSections: [],
    readonly: false
  });

  assert.equal(empty.bottomSheet.emptyState.label, "대형 없음");
  assert.equal(empty.bottomSheet.emptyState.action.label, "대형 추가");
});
```

- [ ] **Step 2: Add App mutation helpers**

In `src/App.jsx`, add state:

```jsx
const [v2FormationListMode, setV2FormationListMode] = useState("normal");
const [v2SelectedFormationIds, setV2SelectedFormationIds] = useState([]);
```

Add handlers:

```jsx
function enterV2FormationMultiSelect() {
  setV2FormationListMode("multi");
  setV2SelectedFormationIds(selectedSectionId ? [selectedSectionId] : []);
}

function cancelV2FormationMultiSelect() {
  setV2FormationListMode("normal");
  setV2SelectedFormationIds([]);
}

function toggleV2FormationMultiSelect(sectionId) {
  setV2SelectedFormationIds((ids) => ids.includes(sectionId)
    ? ids.filter((id) => id !== sectionId)
    : [...ids, sectionId]);
}

function selectAllV2Formations() {
  setV2SelectedFormationIds(sortedSections.map((section) => section.id));
}
```

Replace `deleteSection` final-section guard with an empty-state-safe helper:

```jsx
function deleteSectionsByIds(sectionIds) {
  if (readonly || !sectionIds.length) return;
  const ids = new Set(sectionIds);
  const deletedIndexes = sortedSections
    .map((section, index) => ids.has(section.id) ? index : -1)
    .filter((index) => index >= 0);
  const firstDeletedIndex = Math.min(...deletedIndexes);
  const nextSections = sortedSections.filter((section) => !ids.has(section.id));
  const previous = nextSections[Math.max(0, firstDeletedIndex - 1)];
  const next = previous || nextSections[firstDeletedIndex] || nextSections[0] || null;

  updatePlan((current) => ({
    ...current,
    sections: current.sections.filter((section) => !ids.has(section.id))
  }));
  setSelectedSectionId(next?.id || "");
  setSelectedPerformerId("");
  setSelectedPairKey("");
  setSelectedPerformerIds([]);
  setSelectedMovementKeyframeId("");
  if (!next) setMobileContextSelection("");
}

function deleteSection() {
  if (!selectedSection) return;
  deleteSectionsByIds([selectedSection.id]);
}
```

Add multi-delete handler:

```jsx
function deleteV2SelectedFormations() {
  if (!v2SelectedFormationIds.length) return;
  if (v2SelectedFormationIds.length > 1 && !window.confirm(`선택한 대형 ${v2SelectedFormationIds.length}개를 삭제할까요?`)) return;
  deleteSectionsByIds(v2SelectedFormationIds);
  cancelV2FormationMultiSelect();
}
```

- [ ] **Step 3: Wire runtime inputs and actions**

Pass into `createV2EditorRuntime`:

```jsx
formationListMode: v2FormationListMode,
selectedFormationIds: v2SelectedFormationIds,
enterFormationMultiSelect: enterV2FormationMultiSelect,
cancelFormationMultiSelect: cancelV2FormationMultiSelect,
toggleFormationMultiSelect: toggleV2FormationMultiSelect,
selectAllFormations: selectAllV2Formations,
deleteSelectedFormations: deleteV2SelectedFormations,
```

Expose actions in `v2EditorRuntime.mjs`:

```js
enterFormationMultiSelect: input.enterFormationMultiSelect,
cancelFormationMultiSelect: input.cancelFormationMultiSelect,
toggleFormationMultiSelect: input.toggleFormationMultiSelect,
selectAllFormations: input.selectAllFormations,
deleteSelectedFormations: input.deleteSelectedFormations,
```

- [ ] **Step 4: Render checkboxes and empty state**

In `V2VisualEditor.jsx`, add header action routing:

```jsx
if (action.key === "multi-select") return runtimeActions.enterFormationMultiSelect?.();
if (action.key === "select-all-formations") return runtimeActions.selectAllFormations?.();
if (action.key === "delete-selected-formations") return runtimeActions.deleteSelectedFormations?.();
if (action.key === "cancel-multi-select") return runtimeActions.cancelFormationMultiSelect?.();
```

In row click:

```jsx
if (item.action === "toggle-formation-selection") {
  runtimeActions.toggleFormationMultiSelect?.(item.sectionId);
  return;
}
```

Render an empty state:

```jsx
{view.bottomSheet.emptyState && (
  <div className="v2-bottom-sheet-empty" data-v2-empty-formations>
    <strong>{view.bottomSheet.emptyState.label}</strong>
    <button type="button" onClick={() => runtimeActions.addFormation?.({ forceCreate: true })}>
      {view.bottomSheet.emptyState.action.label}
    </button>
  </div>
)}
```

- [ ] **Step 5: Update old final-delete status test**

In `src/statusNoise.test.mjs`, remove `"마지막 대형은 삭제할 수 없습니다"` from `importantFragments` and add a status fragment only if the implementation still sets a meaningful deletion status. If no status is used for deletion, do not add a replacement.

- [ ] **Step 6: Add browser tests**

Add:

```js
test("V2 formation multi-select can delete all formations and recover from empty state", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedProject(page);
  await page.goto("/");

  const root = page.locator("[data-v2-visual-editor]");
  await root.locator("[data-v2-action-bar]").getByRole("button", { name: "대형 목록" }).click();
  const sheet = root.locator('[data-v2-bottom-sheet="formation-list"]');
  await sheet.getByRole("button", { name: "다중선택" }).click();
  await sheet.getByRole("button", { name: "전체선택" }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await sheet.getByRole("button", { name: "삭제" }).click();

  await expect(root.locator("[data-v2-empty-formations]")).toBeVisible();
  await expect(root.locator("[data-v2-segment-kind='hold']")).toHaveCount(0);
  await root.locator("[data-v2-empty-formations]").getByRole("button", { name: "대형 추가" }).click();
  await expect(root.locator("[data-v2-segment-kind='hold']")).toHaveCount(1);
});
```

- [ ] **Step 7: Verify slice**

Run:

```bash
node --test src/v2EditorRuntime.test.mjs src/statusNoise.test.mjs
npm run test:browser -- tests/browser/v2-visual.spec.mjs
npm test
npm run build
git diff --check
```

- [ ] **Step 8: Commit slice**

Run:

```bash
git add src/App.jsx src/v2EditorRuntime.mjs src/V2VisualEditor.jsx src/v2VisualEditor.css src/v2EditorRuntime.test.mjs src/statusNoise.test.mjs tests/browser/v2-visual.spec.mjs
git diff --cached --stat
git commit -m "feat: support empty V2 formation state"
```

---

### Slice 5: Name/Memo Sheet And Template Sheet

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/v2EditorRuntime.mjs`
- Modify: `src/V2VisualEditor.jsx`
- Modify: `src/v2VisualEditor.css`
- Test: `src/v2EditorRuntime.test.mjs`
- Test: `tests/browser/v2-visual.spec.mjs`

- [ ] **Step 1: Add runtime tests for sheet models**

Add:

```js
test("V2 runtime exposes formation details and template sheets", () => {
  const runtime = createV2EditorRuntime({
    activeBottomSheet: "formation-details",
    mobileContextSelection: "formation",
    selectedSectionId: "f2",
    selectedSection: { id: "f2", name: "Chorus", notes: "Hold center", time: 16, start: 12, end: 16, moveDuration: 4 },
    sortedSections: [{ id: "f2", name: "Chorus", notes: "Hold center", time: 16, start: 12, end: 16, moveDuration: 4 }],
    readonly: false
  });

  assert.equal(runtime.bottomSheet.key, "formation-details");
  assert.equal(runtime.bottomSheet.fields.name.value, "Chorus");
  assert.equal(runtime.bottomSheet.fields.notes.value, "Hold center");
  assert.equal(runtime.bottomSheet.timeRangeLabel, "12.0s ~ 16.0s");

  const templateRuntime = createV2EditorRuntime({
    activeBottomSheet: "formation-template",
    mobileContextSelection: "formation",
    selectedSectionId: "f2",
    selectedSection: { id: "f2", name: "Chorus" },
    sortedSections: [{ id: "f2", name: "Chorus" }],
    formationTemplates: [{ id: "v", label: "V" }],
    readonly: false
  });

  assert.equal(templateRuntime.bottomSheet.key, "formation-template");
  assert.equal(templateRuntime.bottomSheet.items[0].label, "V");
  assert.deepEqual(templateRuntime.bottomSheet.actions.map((action) => action.key), [
    "save-current-template",
    "apply-template",
    "add-template-formation"
  ]);
});
```

- [ ] **Step 2: Add App actions**

In `src/App.jsx`, add:

```jsx
function updateSelectedFormationMetadataField(field, value) {
  if (readonly || !selectedSection || !["name", "notes"].includes(field)) return;
  updateSection(selectedSection.id, { [field]: value }, { history: false });
}

function finishSelectedFormationMetadataEdit(field, value) {
  if (readonly || !selectedSection || !["name", "notes"].includes(field)) return;
  updateSection(selectedSection.id, { [field]: value });
}

function applySelectedTemplateToCurrentFormation() {
  applyFormationPreviewToCurrent();
}

function addFormationFromSelectedTemplate() {
  createSectionFromFormationPreview();
}
```

Pass them to runtime:

```jsx
updateSelectedFormationMetadataField,
finishSelectedFormationMetadataEdit,
saveCurrentFormationTemplate: saveCurrentPersonalTemplate,
applySelectedTemplateToCurrentFormation,
addFormationFromSelectedTemplate,
selectTemplate: setSelectedTemplateId,
formationTemplates: [
  ...FORMATION_TEMPLATES,
  ...personalTemplates.map((template) => ({ id: `personal:${template.id}`, label: template.label }))
],
selectedTemplateId
```

- [ ] **Step 3: Expose the new runtime actions**

In `src/v2EditorRuntime.mjs`, add these keys to the returned `actions` object:

```js
updateSelectedFormationMetadataField: input.updateSelectedFormationMetadataField,
finishSelectedFormationMetadataEdit: input.finishSelectedFormationMetadataEdit,
saveCurrentFormationTemplate: input.saveCurrentFormationTemplate,
applySelectedTemplateToCurrentFormation: input.applySelectedTemplateToCurrentFormation,
addFormationFromSelectedTemplate: input.addFormationFromSelectedTemplate,
selectTemplate: input.selectTemplate,
```

- [ ] **Step 4: Render details fields**

In `V2VisualEditor.jsx`, render `formation-details`:

```jsx
{view.bottomSheet.key === "formation-details" && (
  <div className="v2-formation-details-sheet">
    <label>
      <span>이름</span>
      <input
        value={view.bottomSheet.fields.name.value}
        readOnly={view.readonly}
        onChange={(event) => runtimeActions.updateSelectedFormationMetadataField?.("name", event.target.value)}
        onBlur={(event) => runtimeActions.finishSelectedFormationMetadataEdit?.("name", event.target.value)}
      />
    </label>
    <label>
      <span>메모</span>
      <textarea
        value={view.bottomSheet.fields.notes.value}
        readOnly={view.readonly}
        onChange={(event) => runtimeActions.updateSelectedFormationMetadataField?.("notes", event.target.value)}
        onBlur={(event) => runtimeActions.finishSelectedFormationMetadataEdit?.("notes", event.target.value)}
      />
    </label>
    <p>{view.bottomSheet.timeRangeLabel}</p>
    <p>타이밍은 타임라인에서, 위치는 무대에서 편집합니다.</p>
  </div>
)}
```

- [ ] **Step 5: Render template sheet**

Render template items/actions:

```jsx
{view.bottomSheet.key === "formation-template" && (
  <div className="v2-template-sheet">
    <div className="v2-template-list">
      {view.bottomSheet.items.map((item) => (
        <button key={item.key} type="button" className={item.active ? "is-active" : ""} onClick={() => runtimeActions.selectTemplate?.(item.templateId)}>
          {item.label}
        </button>
      ))}
    </div>
    <div className="v2-template-actions">
      <button type="button" onClick={() => runtimeActions.saveCurrentFormationTemplate?.()}>현재 대형 저장</button>
      <button type="button" onClick={() => runtimeActions.applySelectedTemplateToCurrentFormation?.()}>현재 대형에 적용</button>
      <button type="button" onClick={() => runtimeActions.addFormationFromSelectedTemplate?.()}>새 대형으로 추가</button>
    </div>
  </div>
)}
```

- [ ] **Step 6: Add browser tests**

Add:

```js
test("V2 formation details edits name and memo immediately", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedProject(page);
  await page.goto("/");

  const root = page.locator("[data-v2-visual-editor]");
  await root.locator('[data-v2-formation-block="diamond"][data-v2-segment-kind="hold"]').click();
  await root.locator("[data-v2-action-bar]").getByRole("button", { name: "이름/메모" }).click();

  const sheet = root.locator('[data-v2-bottom-sheet="formation-details"]');
  await sheet.getByLabel("이름").fill("Chorus Updated");
  await sheet.getByLabel("메모").fill("Check spacing");
  await expect.poll(() => storedProject(page).then((project) => project.sections.find((section) => section.id === "diamond")?.name)).toBe("Chorus Updated");
  await expect.poll(() => storedProject(page).then((project) => project.sections.find((section) => section.id === "diamond")?.notes)).toBe("Check spacing");
});
```

Add:

```js
test("V2 template sheet applies and adds template formations", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedProject(page);
  await page.goto("/");

  const root = page.locator("[data-v2-visual-editor]");
  await root.locator('[data-v2-formation-block="diamond"][data-v2-segment-kind="hold"]').click();
  await root.locator("[data-v2-action-bar]").getByRole("button", { name: "템플릿" }).click();
  const sheet = root.locator('[data-v2-bottom-sheet="formation-template"]');
  await sheet.getByRole("button", { name: "V" }).click();
  await sheet.getByRole("button", { name: "현재 대형에 적용" }).click();
  const beforeCount = await storedProject(page).then((project) => project.sections.length);
  await sheet.getByRole("button", { name: "새 대형으로 추가" }).click();
  await expect.poll(() => storedProject(page).then((project) => project.sections.length)).toBe(beforeCount + 1);
});
```

- [ ] **Step 7: Verify slice**

Run:

```bash
node --test src/v2EditorRuntime.test.mjs
npm run test:browser -- tests/browser/v2-visual.spec.mjs
npm test
npm run build
git diff --check
```

- [ ] **Step 8: Commit slice**

Run:

```bash
git add src/App.jsx src/v2EditorRuntime.mjs src/V2VisualEditor.jsx src/v2VisualEditor.css src/v2EditorRuntime.test.mjs tests/browser/v2-visual.spec.mjs
git diff --cached --stat
git commit -m "feat: add V2 formation details and templates"
```

---

### Slice 6: Cast, Stage, Music Minimum Sheets And Readonly Gating

**Files:**
- Modify: `src/v2EditorRuntime.mjs`
- Modify: `src/V2VisualEditor.jsx`
- Modify: `src/v2VisualEditor.css`
- Test: `src/v2EditorRuntime.test.mjs`
- Test: `tests/browser/v2-visual.spec.mjs`

- [ ] **Step 1: Add runtime test for minimal sheets**

Add:

```js
test("V2 minimal cast stage and music sheets honor readonly gating", () => {
  const editable = createV2EditorRuntime({
    activeBottomSheet: "music",
    readonly: false,
    audioFileName: "song.mp3"
  });
  assert.equal(editable.bottomSheet.key, "music");
  assert.equal(editable.bottomSheet.actions.find((action) => action.key === "replace-audio").disabled, false);

  const readonly = createV2EditorRuntime({
    activeBottomSheet: "stage-settings",
    readonly: true,
    snapEnabled: true,
    showStageReferences: true,
    showStageReferenceLabels: true,
    showAllTransitionPaths: true
  });
  assert.equal(readonly.bottomSheet.key, "stage-settings");
  assert.equal(readonly.bottomSheet.items.find((item) => item.key === "toggle-snap").disabled, true);
  assert.equal(readonly.bottomSheet.items.find((item) => item.key === "front-caution-zone").disabled, true);

  const castAdd = createV2EditorRuntime({ activeBottomSheet: "cast-add", readonly: false });
  assert.equal(castAdd.bottomSheet.emptyState.label, "사람 추가는 다음 단계에서 지원합니다");
});
```

- [ ] **Step 2: Implement sheet keys**

In `v2EditorRuntime.mjs`, map:

```js
if (activeBottomSheet === "cast-list") {
  return {
    key: "cast-list",
    title: "사람 목록",
    items: cast.performers.map((performer) => ({
      key: `cast-${performer.id}`,
      kind: "performer",
      label: performerDisplayLabel(performer),
      metaLabel: performerMetaLabel(performer),
      stateLabel: performer.active ? "선택됨" : "",
      performerId: performer.id,
      active: Boolean(performer.active),
      action: "select-performer"
    }))
  };
}
if (activeBottomSheet === "cast-add") {
  return { key: "cast-add", title: "사람 추가", emptyState: { label: "사람 추가는 다음 단계에서 지원합니다" }, items: [] };
}
if (activeBottomSheet === "stage-settings") {
  return { key: "stage-settings", title: "무대 설정", items: settingsMenu };
}
if (activeBottomSheet === "music") {
  return {
    key: "music",
    title: "음악",
    stateLabel: input.audioFileName || input.musicTitle || "음악 없음",
    items: [],
    actions: [{ key: "replace-audio", label: input.audioFileName ? "교체" : "업로드", disabled: readonly }]
  };
}
```

- [ ] **Step 3: Wire sheet action handlers**

In `V2VisualEditor.jsx`:

```jsx
if (action.key === "replace-audio") {
  runtimeActions.addAudio?.();
  return;
}
```

Stage settings should reuse `runSettingsAction` / existing toggle handlers. Music must not call export/share actions.

- [ ] **Step 4: Render generic sheet actions**

In `V2VisualEditor.jsx`, after the sheet item list, render `view.bottomSheet.actions`:

```jsx
{Boolean(view.bottomSheet.actions?.length) && (
  <div className="v2-bottom-sheet-actions">
    {view.bottomSheet.actions.map((action) => (
      <button
        key={action.key}
        type="button"
        disabled={Boolean(action.disabled)}
        onClick={() => runBottomSheetHeaderAction(action)}
      >
        {action.label}
      </button>
    ))}
  </div>
)}
```

- [ ] **Step 5: Add browser tests**

Add:

```js
test("V2 minimal sheets open and keep readonly mutating controls disabled", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedProject(page);
  await page.goto("/");

  const root = page.locator("[data-v2-visual-editor]");
  const actionBar = root.locator("[data-v2-action-bar]");
  await actionBar.getByRole("button", { name: "사람 추가" }).click();
  await expect(root.locator('[data-v2-bottom-sheet="cast-add"]')).toContainText("사람 추가는 다음 단계에서 지원합니다");

  await actionBar.getByRole("button", { name: "무대 설정" }).click();
  await expect(root.locator('[data-v2-bottom-sheet="stage-settings"]')).toContainText("Snap");

  await actionBar.getByRole("button", { name: "음악" }).click();
  await expect(root.locator('[data-v2-bottom-sheet="music"]')).toBeVisible();
});
```

Add readonly coverage by adapting the existing readonly share test:

```js
await page.goto("/share/readonly-project");
const readonlyRoot = page.locator("[data-v2-visual-editor]");
await readonlyRoot.locator("[data-v2-action-bar]").getByRole("button", { name: "무대 설정" }).click();
await expect(readonlyRoot.locator('[data-v2-bottom-sheet="stage-settings"]').getByRole("button", { name: /Snap/ })).toBeDisabled();
await readonlyRoot.locator("[data-v2-action-bar]").getByRole("button", { name: "음악" }).click();
await expect(readonlyRoot.locator('[data-v2-bottom-sheet="music"]').getByRole("button", { name: /업로드|교체/ })).toBeDisabled();
```

- [ ] **Step 6: Verify slice**

Run:

```bash
node --test src/v2EditorRuntime.test.mjs
npm run test:browser -- tests/browser/v2-visual.spec.mjs
npm test
npm run build
git diff --check
```

- [ ] **Step 7: Commit slice**

Run:

```bash
git add src/v2EditorRuntime.mjs src/V2VisualEditor.jsx src/v2VisualEditor.css src/v2EditorRuntime.test.mjs tests/browser/v2-visual.spec.mjs
git diff --cached --stat
git commit -m "feat: add V2 minimal action sheets"
```

---

### Slice 7: Full Mobile Geometry And Regression Gate

**Files:**
- Modify: `tests/browser/v2-visual.spec.mjs`
- Modify: `src/v2VisualEditor.css`
- Modify: `src/V2VisualEditor.jsx` only for geometry fixes proven by the new 390px tests
- Modify: `src/v2EditorRuntime.mjs` only for readonly/empty-state model fixes proven by the new readonly empty-share test
- Modify: `src/App.jsx` only for route/runtime state fixes proven by the new readonly empty-share test

- [ ] **Step 1: Add final 390px geometry test**

Add:

```js
test("V2 action bar and sheets stay usable in 390px mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedProject(page);
  await page.goto("/");

  const root = page.locator("[data-v2-visual-editor]");
  const actionBar = root.locator("[data-v2-action-bar]");
  await expect(actionBar).toBeVisible();
  await actionBar.getByRole("button", { name: "대형 목록" }).click();
  const sheet = root.locator("[data-v2-bottom-sheet]");

  const boxes = await root.evaluate(() => {
    const bar = document.querySelector("[data-v2-action-bar]").getBoundingClientRect();
    const sheetNode = document.querySelector("[data-v2-bottom-sheet]").getBoundingClientRect();
    const stage = document.querySelector("[data-v2-stage]").getBoundingClientRect();
    return {
      barTop: bar.top,
      barBottom: bar.bottom,
      sheetBottom: sheetNode.bottom,
      stageTop: stage.top,
      stageBottom: stage.bottom,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight
    };
  });

  expect(boxes.viewportWidth).toBe(390);
  expect(boxes.barBottom).toBeLessThanOrEqual(boxes.viewportHeight);
  expect(boxes.sheetBottom).toBeLessThanOrEqual(boxes.barTop + 1);
  expect(boxes.stageTop).toBeGreaterThanOrEqual(0);
  expect(boxes.stageBottom).toBeLessThan(boxes.barTop);
  await page.screenshot({ path: "test-results/v2-action-bar-formation-workflow-390.png", fullPage: false });
});
```

- [ ] **Step 2: Add readonly empty-share test**

Add:

```js
test("readonly V2 share route remains valid with zero formations", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const readonlyProject = {
    ...seededV2Project(),
    title: "Readonly Empty V2 Fixture",
    sections: [],
    shareLinks: {
      view: { projectId: "readonly-empty-project", token: "", enabled: true },
      edit: { projectId: "readonly-empty-project", token: "edit-token", enabled: true }
    }
  };
  await page.route("**/rest/v1/movemap_projects**", async (route) => {
    await route.fulfill({ json: [{ id: "readonly-empty-project", plan: readonlyProject }] });
  });
  await page.route("**/rest/v1/choreo_projects**", async (route) => {
    await route.fulfill({ json: [] });
  });

  await page.goto("/share/readonly-empty-project");
  const root = page.locator("[data-v2-visual-editor]");
  await expect(root).toBeVisible();
  await root.locator("[data-v2-action-bar]").getByRole("button", { name: "대형 목록" }).click();
  await expect(root.locator("[data-v2-empty-formations]")).toBeVisible();
  await expect(root.getByRole("button", { name: "삭제" })).toHaveCount(0);
  await expect(root.getByRole("button", { name: "복제" })).toHaveCount(0);
  await expect(root.locator(".v2-track-add-button")).toHaveCount(0);
});
```

- [ ] **Step 3: Run complete verification**

Run:

```bash
git diff --check
npm test
npm run build
npm run test:browser -- tests/browser/v2-visual.spec.mjs
npm run test:browser
```

Expected: all pass. If `npm run test:browser` exposes unrelated old assertions, inspect the failure and update only expectations made stale by the action-bar workflow.

- [ ] **Step 4: Manual/mobile screenshot inspection**

Run the app:

```bash
npm run dev
```

Inspect at 390px:

- Default action bar shows a single horizontal row.
- Formation-selected action bar shows `삭제`, `복제`, `템플릿`, `대형 추가`, `대형 목록`, `이름/메모`.
- Open sheet sits above the fixed action bar.
- Empty formation state shows stage performers, empty timeline lane, and no readonly mutating controls.
- Top `Share`, `Export`, and `More` menus still separate link/artifact/settings ownership.

- [ ] **Step 5: Commit final hardening slice**

Run:

```bash
git add tests/browser/v2-visual.spec.mjs src/v2VisualEditor.css
# If the 390px/readonly tests forced source fixes, add only the files that changed for this slice:
# git add src/V2VisualEditor.jsx src/v2EditorRuntime.mjs src/App.jsx
git diff --cached --stat
git commit -m "test: harden V2 action bar workflow"
```

---

## Final Delivery After All Slices

- [ ] **Step 1: Confirm branch state**

Run:

```bash
git status --short --branch
git log --oneline -8
```

Expected: source/test working tree is clean except intentionally untracked unrelated files, and the slice commits appear in order.

- [ ] **Step 2: Run final gate**

Run:

```bash
git diff --check
npm test
npm run build
npm run test:browser
```

Expected: all pass.

- [ ] **Step 3: Push only when requested or when the execution request includes push**

Run:

```bash
git push
```

Expected: branch updates on origin. If push is rejected because the branch is ahead/behind or upstream changed, stop and report the exact git error before rebasing or force-pushing.

## Self-Review Checklist

- The plan starts from the current root V2 implementation, not legacy `/v2`.
- Each slice has a separate commit command.
- `Share`, `Export`, and `More` ownership stays unchanged.
- The 0-formation policy is isolated to its own slice.
- The visible-position formation-add behavior is isolated before list/delete/template work.
- Readonly/share behavior is verified after mutating sheet controls are introduced.
- 390px mobile browser/screenshot inspection is mandatory before claiming done.
