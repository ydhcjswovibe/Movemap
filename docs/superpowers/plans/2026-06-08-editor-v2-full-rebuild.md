# Editor v2 Full Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full Movemap editor experience inside `/editor-v2` using the Stitch visual direction, while keeping legacy `/` available until v2 reaches parity.

**Architecture:** `/editor-v2` is the new editor surface, not a light reskin of `/`. Legacy `/` remains as the stable comparison path. V2 consumes a headless editor runtime contract, renders through focused stage/timeline/action/inspector modules, and keeps visual metrics separate from domain geometry so UI tuning does not break drag, collision, or timeline math.

**Tech Stack:** React 19, Vite, Playwright, Node test runner, existing Movemap domain modules.

**Design Contract:** Follow `docs/solutions/editor-v2-stitch-design-contract.md` for visual direction, UX hierarchy, CSS boundaries, acceptable changes, unacceptable changes, and visual review checks.

---

## Product Direction

- `/editor-v2` is the new canonical editor under construction. New v2 UI, layout, renderer, and interaction work belongs in `/editor-v2`, not in the legacy `/` editor.
- The legacy `/` editor is a stable comparison and fallback path until v2 reaches parity. It should remain usable, but it is not the target surface for the rebuild.
- The visual target is the previous Stitch editor design, reproduced as closely as practical in React and scoped CSS. Treat Stitch as the visual source of truth, not as loose inspiration for a generic redesign.
- V2 must include the full Movemap editor workflow: project load/start, stage editing, token select/drag, formation select/edit, timeline edit, audio, 2D/3D view, save, share, export, top menus, contextual bottom actions, and mobile/desktop responsive states.
- Desktop v2 should feel like a Stitch editor adapted to desktop space, not a legacy desktop editor restyled and not a mobile mockup blindly enlarged.

## Hard Rules

- Keep all v2 UI styling scoped under `.stitch-mobile-editor.editor-v2` or a future `.editor-v2` namespace. Do not add new v2 behavior that depends on global `.token`, `.stage`, `.timeline-*`, or legacy desktop selectors.
- Keep domain geometry and visual metrics separate. `stageGeometry` owns coordinates, bounds, drag conversion, and collision-related math. `stageVisualMetrics` owns token, ring, label, grid, and reference visual sizes.
- Stage, timeline, action rail, top bar, and inspector must remain separate renderer responsibilities. Do not let one renderer own another renderer's layout, state, or command behavior.
- `App.jsx` should become thinner over time. Do not add new v2-specific rendering branches to `App.jsx` when the behavior can live in the runtime contract or an `EditorV2*` component.
- V2 components consume runtime/view-model data and command callbacks. They should not reach into raw app state, storage, Supabase, share-link, or export logic directly.
- Every visual tuning change must preserve behavior tests and browser visual checks for both `/` and `/editor-v2`.

## Do Not

- Do not continue polishing the legacy `/` editor as a substitute for building `/editor-v2`.
- Do not reinterpret the Stitch direction into a new unrelated visual language.
- Do not copy generated Stitch HTML directly into the app.
- Do not merge visual token sizing back into domain geometry.
- Do not make timeline CSS affect stage rendering, or stage CSS affect timeline rendering.
- Do not hide missing parity behind screenshots. If `/editor-v2` cannot perform a core editor workflow, track it as unfinished.
- Do not promote `/editor-v2` to `/` until parity tests pass and the user explicitly approves the cutover.

## Current Baseline

- `/editor-v2` already routes to the Stitch shell through `App forceStitchEditor`.
- `src/editorV2Runtime.mjs` already creates a first Stitch-ready `model` and `actions` contract.
- `src/stageVisualMetrics.mjs` already owns token visual metrics; `src/stageGeometry.mjs` owns domain geometry.
- Existing `/` must stay usable while v2 is built.

## Target Boundaries

- `src/editorV2Runtime.mjs`: headless runtime/view-model contract for v2.
- `src/EditorV2Shell.jsx`: top-level Stitch layout for `/editor-v2`.
- `src/EditorV2Stage.jsx`: stage-only renderer and stage interaction wiring.
- `src/EditorV2Timeline.jsx`: timeline-only renderer and timeline interaction wiring.
- `src/EditorV2ActionRail.jsx`: contextual bottom action rail.
- `src/EditorV2Inspector.jsx`: selected performer, formation, stage, view, and share panels.
- `src/stageVisualMetrics.mjs`: visual-only token/reference/grid metrics.
- `src/stitchMobileEditor.css`: keep v2 styles under `.stitch-mobile-editor.editor-v2` or migrate them into `.editor-v2` scoped selectors.

## Parity Checklist

V2 is not parity-complete until `/editor-v2` supports all of these workflows:

- Project start from the wizard sample path.
- Project load from existing local storage.
- Token selection.
- Token drag.
- Multi-token selection where current Movemap supports it.
- Pair selection and pair movement where current Movemap supports it.
- Formation selection from stage or timeline.
- Formation duplicate.
- Formation delete.
- Formation rename.
- Formation add at current time.
- Timeline block select.
- Timeline hold trim.
- Timeline body drag or reorder behavior where current Movemap supports it.
- Timeline zoom.
- Timeline scroll.
- Audio upload.
- Audio playback.
- Audio fallback/reconnect behavior.
- 2D stage view.
- 3D stage view.
- Stage reference visibility toggle.
- Stage reference label toggle.
- Transition path visibility/filter behavior.
- Undo.
- Redo.
- Save.
- Share link creation.
- Edit link creation where allowed.
- Export/download menu actions.
- Top action menus.
- Contextual bottom action rail.
- Bottom inspector/panel states.
- Readonly review route behavior.
- Valid edit-link route behavior.
- Invalid or disabled link fallback behavior.

## Regression Rules

- Stage renderer changes require `npm test` and the Stitch browser visual spec.
- Timeline renderer changes require `npm test` and the Stitch browser visual spec.
- CSS changes require 390px mobile and 1440px desktop screenshot checks.
- Token visual metric changes require unit tests for `stageVisualMetrics` and browser checks for token size, selected ring fill, and label size.
- Geometry changes require unit tests for `stageGeometry`, drag policy, and pair layout where relevant.
- Runtime contract changes require `src/editorV2Runtime.test.mjs` plus at least one browser smoke test for `/editor-v2`.
- Any change touching share, auth, export, audio, or route behavior must keep the existing browser route smoke tests passing.
- A visual screenshot is not enough. If a core workflow is not implemented or not interactable, the change is incomplete.

## Cutover Criteria

Do not promote `/editor-v2` to `/` until all conditions are true:

- Every item in the Parity Checklist is implemented or explicitly accepted as out of scope by the user.
- `npm test` passes.
- `npm run build` passes.
- `npm run test:browser` passes.
- 390px mobile Stitch screenshots are reviewed.
- 1440px desktop `/editor-v2` screenshot is reviewed.
- Legacy `/` still opens before cutover.
- User explicitly approves replacing `/` with `/editor-v2`.

## Task 1: Lock v2 Route and Contract Tests

**Files:**
- Modify: `src/editorV2Runtime.test.mjs`
- Modify: `tests/browser/stitch-editor-visual.spec.mjs`

- [ ] Add or keep a runtime test proving `createEditorV2Runtime()` returns `{ model, actions }` with `projectTitle`, `selectionVisualState`, `selectedSectionId`, `stageDimensions`, `timelineContentWidth`, and callable command fields.
- [ ] Add or keep a browser test proving `/editor-v2` renders `[data-stitch-mobile-editor][data-editor-v2='true']` on a 1440px viewport and does not render `.desktop-editor`.
- [ ] Add or keep a source assertion that `/editor-v2` uses `forceStitchEditor` and legacy `/` does not.
- [ ] Run `npm test` and expect all tests to pass.
- [ ] Run `npx playwright test tests/browser/stitch-editor-visual.spec.mjs` and expect the v2 desktop test to pass.

## Task 2: Split Stage Renderer

**Files:**
- Create: `src/EditorV2Stage.jsx`
- Modify: `src/StitchMobileEditor.jsx`
- Test: `tests/browser/stitch-editor-visual.spec.mjs`

- [ ] Move the current `StitchStage` implementation into `EditorV2Stage.jsx`.
- [ ] Export `EditorV2Stage({ model, actions })`.
- [ ] Keep the same DOM compatibility selectors: `.stage-area`, `.stage-frame`, `.stage`, `.token`, `.stitch-token-ring`, `.stage-grid`, `.stage-reference-layer`.
- [ ] Import visual token metrics from `stageVisualMetrics.mjs`; do not import token visual sizing from `stageGeometry.mjs`.
- [ ] Import and render `EditorV2Stage` from `StitchMobileEditor.jsx`.
- [ ] Run `npm test` and expect no source contract regressions.
- [ ] Run `npx playwright test tests/browser/stitch-editor-visual.spec.mjs` and expect stage visual checks to pass.

## Task 3: Split Timeline Renderer

**Files:**
- Create: `src/EditorV2Timeline.jsx`
- Modify: `src/StitchMobileEditor.jsx`
- Test: `tests/browser/stitch-editor-visual.spec.mjs`

- [ ] Move the current `StitchTimeline` implementation into `EditorV2Timeline.jsx`.
- [ ] Export `EditorV2Timeline({ model, actions })`.
- [ ] Keep the same DOM compatibility selectors: `.timeline-editor`, `.timeline-workbench`, `.timeline-track-row`, `.timeline-lane`, `.formation-block`, `.audio-lane`, `.timeline-playhead`.
- [ ] Keep timeline scroll, ruler, playhead, audio lane, and formation block styling inside timeline-owned selectors.
- [ ] Import and render `EditorV2Timeline` from `StitchMobileEditor.jsx`.
- [ ] Run `npm test`.
- [ ] Run `npx playwright test tests/browser/stitch-editor-visual.spec.mjs`.

## Task 4: Split Action Rail and Top Bar

**Files:**
- Create: `src/EditorV2ActionRail.jsx`
- Create: `src/EditorV2TopBar.jsx`
- Modify: `src/StitchMobileEditor.jsx`
- Test: `src/editorV2Runtime.test.mjs`

- [ ] Move the utility bar rendering into `EditorV2TopBar`.
- [ ] Move the bottom contextual action rail rendering into `EditorV2ActionRail`.
- [ ] Keep global action commands routed through `actions.handleMobileAction`, `actions.openTopActionMenu`, and menu render callbacks.
- [ ] Keep action rail commands routed through `model.mobileActions` and `actions.handleMobileAction`.
- [ ] Do not duplicate save/share/download/export logic in the rail or top bar; call runtime commands only.
- [ ] Add a source or runtime test that v2 exposes save/share/download/more and contextual action arrays through the runtime contract.
- [ ] Run `npm test`.

## Task 5: Promote Runtime Contract

**Files:**
- Modify: `src/editorV2Runtime.mjs`
- Modify: `src/App.jsx`
- Test: `src/editorV2Runtime.test.mjs`

- [ ] Change `createEditorV2Runtime()` to return grouped fields: `model.stage`, `model.timeline`, `model.selection`, `model.shell`, `model.actions`, while preserving temporary top-level aliases needed by existing renderers.
- [ ] Move field naming decisions out of `App.jsx`; `App.jsx` should pass raw editor facts and command callbacks, not assemble renderer-specific labels.
- [ ] Do not move storage, auth, share-link, export, or audio provider logic into v2 renderers.
- [ ] Add tests for `model.stage.stageDimensions`, `model.timeline.timelineContentWidth`, `model.selection.selectionVisualState`, and `actions.onFormationSelect`.
- [ ] Run `npm test`.
- [ ] Keep `/` and `/editor-v2` browser smoke tests passing.

## Task 6: Build v2 Inspector

**Files:**
- Create: `src/EditorV2Inspector.jsx`
- Modify: `src/StitchMobileEditor.jsx`
- Modify: `src/editorV2Runtime.mjs`
- Test: `tests/browser/stitch-editor-visual.spec.mjs`

- [ ] Move bottom-sheet body rendering behind `EditorV2Inspector`.
- [ ] Support these states: idle, formation selected, token selected, view tools, stage tools, people panel, share/export menu surfaces.
- [ ] Keep existing callbacks from `actions.renderMobilePanelContent()` until the runtime contract owns panel data directly.
- [ ] Keep inspector state contextual; do not make the inspector the owner of stage or timeline state.
- [ ] Add a browser assertion that selecting a token changes the v2 shell to `token-selected` and does not open an unintended bottom sheet.
- [ ] Run browser tests.

## Task 7: Visual Parity Pass

**Files:**
- Modify: `src/stitchMobileEditor.css`
- Modify: `tests/browser/stitch-editor-visual.spec.mjs`

- [ ] Keep Stitch fixed tokens: `#131313`, `#201f1f`, `#2a2a2a`, `#353534`, `#434656`, `#2e62ff`, `#05e777`, `#d43237`.
- [ ] Keep v2 selectors scoped under `.stitch-mobile-editor.editor-v2` or `.editor-v2`.
- [ ] Tune desktop `/editor-v2` so it no longer reads as a mobile shell simply enlarged: stage, timeline, and action rail stay Stitch-like but use desktop spacing.
- [ ] Compare changes against the Stitch direction first. Do not introduce a new palette, card system, landing-page style, or decorative background that is not part of the editor tool surface.
- [ ] Add screenshot outputs for `editor-v2-desktop-stitch-1440.png` and existing 390px Stitch states.
- [ ] Run `npm run test:browser`.

## Task 8: Full Parity Gate

**Files:**
- Modify tests only unless a parity bug is found.

- [ ] Verify `/` legacy editor still opens and passes browser smoke tests.
- [ ] Verify `/editor-v2` supports sample project start, token selection, token drag, formation selection, timeline block selection, top menus, bottom actions, stage reference visibility, and 2D/3D toggle.
- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Run `npm run test:browser`.
- [ ] Do not promote `/editor-v2` to `/` until all parity checks pass and the user approves cutover.

## Non-Goals

- Do not change project save format.
- Do not remove legacy `/` yet.
- Do not rewrite Supabase, share-link, auth, export, or audio storage logic.
- Do not add new v2 UI work to legacy `/` unless it is required to keep `/` working during the migration.
- Do not copy generated Stitch HTML directly into the app; reproduce the visual direction through React components and scoped CSS.
- Do not add broad global CSS for v2.
- Do not make `App.jsx` the permanent owner of v2 renderer-specific model fields.
