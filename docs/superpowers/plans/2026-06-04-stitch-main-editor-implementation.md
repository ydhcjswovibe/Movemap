# Stitch Main Editor Implementation Plan

## Source PRD

Use `docs/superpowers/specs/2026-06-04-stitch-main-editor-state-prd.md` as the approved requirements source.

The implementation goal is not to copy Stitch HTML. The goal is to apply the Stitch state model to the current Movemap editor while preserving the existing React app behavior.

Reference mapping:

| Editor state | Stitch reference | Source screen ID |
| --- | --- | --- |
| Formation selected | `Movemap Pro Editor (Formation Selected - Enhanced)` | `b852de0c1b95405892776d8e239235f6` |
| Idle/default | `Movemap Pro Editor (Idle State)` | `f431ff3c199547f1b47c120cced57e3d` |
| Token selected | `Movemap Pro Editor (Token Selected)` | `6e425878951043b6a9c4894507abe7b9` |
| Timeline manipulation | `Movemap Pro Editor (Enhanced Visual Timeline)` | `88c27c0bb6674b66824b14b3e4bd3f12` |
| Legacy comparison | `Movemap Pro Editor (Formation Selected)` | `3a542aa5b3f2472a814f5e2d565c6d25` |

## Current Code Landmarks

Primary files:

- `src/App.jsx`
  - Editor state already tracks `selectedSectionId`, `selectedPerformerId`, `selectedPerformerIds`, `selectedMovementKeyframeId`, `topActionMenu`, and `topActionSurface`.
  - Timeline layout data is already computed through `timelineFormationBlocks`, `timelineContentWidth`, and related timeline state.
  - Existing mobile/menu interactions should be reused rather than replaced.

- `src/styles.css`
  - Editor shell and stage layout selectors live around `.stage-area`, `.stage-panel`, `.selected-formation-tools`, `.stage-toolbar`, `.stage-frame`, and `.stage-corner-tools`.
  - Tooltip/hint styling already exists around `.icon-hint-wrapper` and `.icon-hint-popover`.
  - Timeline styling lives around `.timeline-editor`, `.bottom-timeline-rail`, `.timeline-control-rail`, `.timeline-transport-controls`, `.timeline-zoom-controls`, `.timeline-icon-button`, and `.selected-formation-bar`.
  - Mobile command/menu styling lives around `.mobile-selection-grid`, `.mobile-command-grid`, `.mobile-action-bar`, `.mobile-more-panel`, and `.mobile-status-strip`.

- `src/IconHintButton.jsx`
  - Reuse for compact icon-only controls that need `aria-label` and hint affordances.

- `src/TopActionDropdown.jsx`
  - Preserve current top action dropdown behavior. Restyle or reorganize only as needed.

- `src/Stage3dPreview.jsx`
  - Keep rendering behavior intact. Limit changes to container integration if visual shell work requires it.

Relevant tests and verification:

- `npm test`
- `npm run build`
- `npm run test:browser`
- `tests/browser/timeline-smoke.spec.mjs`
- Existing unit tests under `src/*.test.mjs`, especially timeline, selection, share, auth, geometry, and project JSON tests.

## Execution Rule

For agentic execution, use `superpowers:subagent-driven-development` or `superpowers:executing-plans` before implementing this plan. Work through the checkboxes in order and keep commits or review slices small.

Do not combine all visual changes into one large pass. Each phase should be independently reviewable and should preserve current behavior.

## Phase 0: Baseline Capture

- [ ] Verify the working tree before edits.

```bash
git status --short
```

- [ ] Run the baseline automated checks.

```bash
npm test
npm run build
npm run test:browser
```

- [ ] Start the app for visual review.

```bash
npm run dev
```

- [ ] Capture or review the current editor at minimum:
  - Mobile 390px width idle/default editor
  - Mobile formation selected state
  - Mobile token selected state
  - Mobile timeline-visible state
  - Mobile menu/tool expanded state
  - Desktop editor state

- [ ] Make the visual review states reproducible before changing styling.
  - Use the existing app/project fixture if one already exists in browser tests.
  - If browser tests do not already provide state setup helpers, create a small browser-test helper that enters each state through UI interactions rather than by mutating app internals.
  - Save or name screenshots consistently so before/after comparison is possible:
    - `stitch-editor-mobile-idle-390`
    - `stitch-editor-mobile-formation-selected-390`
    - `stitch-editor-mobile-token-selected-390`
    - `stitch-editor-mobile-timeline-390`
    - `stitch-editor-mobile-menu-390`
    - `stitch-editor-desktop-regression`

- [ ] Record any existing failures before making changes. Do not attribute pre-existing failures to the redesign.

## Phase 1: Add Explicit Editor State Semantics

Goal: make the UI state model explicit enough to style and test without rewriting behavior.

- [ ] In `src/App.jsx`, derive presentation-only state axes from existing state:
  - Selection axis:
    - `idle`: no selected formation and no selected performer token
    - `formation-selected`: `selectedSectionId` is set and token selection is not the primary focus
    - `token-selected`: `selectedPerformerId` or `selectedPerformerIds` has active member selection
  - Timeline axis:
    - `idle`: no timeline-specific interaction is active
    - `active`: playback/scrub/timeline interaction, selected movement keyframe, timeline control focus, or timeline editing is active
  - Menu axis:
    - `closed`: no expanded menu/tool surface is open
    - `expanded`: `topActionMenu`, bottom more panel, or compact tool menu is open

Implementation notes:

- Keep this derivation presentation-only.
- Do not change selection, drag, playback, save, share, auth, project, or provider behavior.
- Prefer independent data attributes on existing root/editor containers over introducing a new global state manager.
- Do not use one single `editorVisualState` value unless the plan also defines a clear priority order. Simultaneous states are expected, for example token selected plus menu expanded.

- [ ] Add stable state markers where useful for browser verification.

Recommended examples:

```jsx
<main
  className="app-shell"
  data-selection-state={selectionVisualState}
  data-timeline-state={timelineVisualState}
  data-menu-state={menuVisualState}
>
```

or, if the app already has a more appropriate editor root:

```jsx
<section
  className="stage-area"
  data-selection-state={selectionVisualState}
  data-timeline-state={timelineVisualState}
  data-menu-state={menuVisualState}
>
```

- [ ] Add or update a focused unit test only if the state derivation is extracted to a pure helper. If kept inline in `App.jsx`, verify through browser tests instead.

Verification:

```bash
npm test
```

Manual/browser verification:

- Idle has no selected-state marker.
- Formation selected and token selected produce distinct markers.
- Timeline active and menu expanded can coexist with selection state markers.
- Menu-expanded marker appears only when a menu is open.

## Phase 2: Editor Shell And Idle State

Goal: align the default mobile editor shell with the Stitch idle/default reference while keeping the app immediately usable.

- [ ] In `src/styles.css`, update editor shell tokens and mobile layout only where they affect the current editor surface:
  - `.stage-area`
  - `.stage-panel`
  - `.stage-toolbar`
  - `.stage-frame`
  - `.stage-corner-tools`
  - `.mobile-action-bar`
  - `.mobile-status-strip`

- [ ] Keep the idle state product-facing:
  - Stage remains visible.
  - Timeline remains visible.
  - Primary actions remain reachable.
  - No instructional hero/onboarding copy is introduced.

- [ ] Avoid broad desktop restyling in this phase. Desktop changes should be limited to preventing shared-style regressions.

Verification:

```bash
npm test
npm run build
```

Visual review:

- Mobile 390px idle/default editor.
- Desktop editor regression check.

## Phase 3: Formation Selected State

Goal: use `Formation Selected - Enhanced` as the primary implementation reference for selected formation hierarchy.

- [ ] In `src/App.jsx`, confirm the selected formation UI uses the existing `selectedSectionId` and `selectedSection` behavior.

- [ ] In `src/styles.css`, update selected formation presentation:
  - `.selected-formation-tools`
  - `.selected-formation-tool-actions`
  - `.selected-formation-bar`
  - `.formation-block.selected`
  - Stage/control spacing around selected formation context

- [ ] Keep formation-level actions reachable without increasing stage clutter.

- [ ] Treat `Movemap Pro Editor (Formation Selected)` as comparison-only. Do not add a second visual direction for formation selection.

Verification:

```bash
npm test
npm run build
```

Visual review:

- Mobile 390px formation selected state.
- Confirm selected formation is visually distinct.
- Confirm selection/editing/playback still works.

## Phase 4: Token Selected State

Goal: make member/token selection distinct from formation selection using the Stitch token-selected reference.

- [ ] In `src/App.jsx`, identify the current selected performer surfaces:
  - `selectedPerformerId`
  - `selectedPerformerIds`
  - token drag/selection controls
  - mobile selection summary or command grid

- [ ] In `src/styles.css`, adjust token/member selection styling without introducing a broad inspector:
  - Selected token emphasis on the stage
  - Compact token-specific actions
  - Distinct visual treatment from `.formation-block.selected`
  - Mobile selection summary readability

- [ ] Preserve drag, multi-select, pair, and section editing behavior.

Verification:

```bash
npm test
npm run build
```

Visual review:

- Mobile 390px token selected state.
- Confirm token selection is not confused with formation selection.
- Confirm token drag and selection interactions still work.

## Phase 5: Timeline Manipulation State

Goal: apply the enhanced visual timeline direction while satisfying the PRD's 390px mobile control rail requirement.

- [ ] In `src/App.jsx`, keep existing timeline logic intact:
  - `timelineFormationBlocks`
  - `timelineContentWidth`
  - playback and current time controls
  - zoom controls
  - formation block add/reorder behavior

- [ ] In `src/styles.css`, update timeline presentation:
  - `.timeline-editor`
  - `.bottom-timeline-rail`
  - `.timeline-control-rail`
  - `.timeline-transport-controls`
  - `.timeline-zoom-controls`
  - `.timeline-icon-button`
  - `.timeline-time-readout`
  - lane and block styling for formation/audio visibility

- [ ] At 390px width, playback, add, time, and zoom controls should fit as one compact rail.

- [ ] If narrower viewports require wrapping, preserve:
  - Control order
  - Control visibility
  - Accessible labels
  - Tooltip or hint affordances
  - Formation and audio lane visibility

- [ ] Reuse `IconHintButton` for icon-only controls where possible. Do not create unlabeled icon buttons.

Testing:

- [ ] Add or update focused tests for durable timeline contracts:
  - Timeline rail exists.
  - Key icon-only controls have accessible labels.
  - Formation and audio lanes remain represented.

- [ ] Add a browser test or screenshot assertion that verifies the 390px mobile timeline-visible state.
  - The viewport must be 390px wide.
  - Playback, add, time, and zoom controls must be visible.
  - Formation and audio lanes must be visible.
  - If the implementation cannot assert exact one-row geometry reliably, the screenshot review must be recorded as the required visual gate for this phase.

Verification:

```bash
npm test
npm run build
npm run test:browser
```

Visual review:

- Mobile 390px timeline-visible state.
- Confirm playback, add, time, and zoom controls are visible in one compact rail.
- Confirm formation and audio lanes are both visible.
- Do not proceed to menu/tool surface work until the 390px timeline visual gate passes or a documented blocker is accepted.

## Phase 6: Menu And Tool Surfaces

Goal: preserve the current Movemap menu/dropdown behavior while styling expanded tools to feel connected to the Stitch editor system.

- [ ] In `src/App.jsx`, keep current menu opening/closing behavior:
  - `topActionMenu`
  - `topActionSurface`
  - bottom more/tool panels
  - existing compact command surfaces

- [ ] In `src/TopActionDropdown.jsx`, preserve current semantics and `aria-label` behavior.

- [ ] In `src/styles.css`, restyle menu/tool surfaces only after confirming current behavior:
  - `.mobile-more-panel`
  - `.mobile-command-grid`
  - `.mobile-command-list`
  - `.top-action-group`
  - related dropdown/panel selectors

- [ ] Do not invent a new menu-expanded surface unless current behavior cannot satisfy the PRD. If a new reference is needed, stop and capture or design a menu-expanded reference before replacing current behavior.

Verification:

```bash
npm test
npm run build
```

Visual review:

- Mobile 390px menu/tool expanded state.
- Confirm top and bottom actions remain reachable.
- Confirm menus do not cover critical stage content unnecessarily.

## Phase 7: Accessibility And Visual Polish

Goal: make compact controls usable, readable, and robust after the main state work lands.

- [ ] Audit icon-only controls touched by the redesign:
  - Every icon-only button has `aria-label`.
  - Every ambiguous icon-only action has tooltip or hint affordance.
  - Touch targets remain practical on mobile.

- [ ] Check text fitting:
  - Buttons do not overflow at 390px width.
  - Timeline time readout does not push controls off rail.
  - Menu labels do not wrap into broken layouts.

- [ ] Keep palette balanced and domain-appropriate:
  - Dark editor tone is acceptable, but avoid making the UI a one-note dark blue/slate wash.
  - Use primary action blue selectively for active states and primary CTAs.
  - Use warning and success colors only for actual state feedback.

Verification:

```bash
npm test
npm run build
npm run test:browser
```

Visual review:

- Mobile 390px idle, formation selected, token selected, timeline, and menu states.
- Desktop editor regression check.

## Phase 8: Final Verification And Handoff

- [ ] Run the full minimum verification bar from the PRD.

```bash
npm test
npm run build
npm run test:browser
```

- [ ] Capture or review final screenshots:
  - Mobile 390px idle/default editor
  - Mobile formation selected state
  - Mobile token selected state
  - Mobile timeline-visible state
  - Mobile menu/tool expanded state
  - Desktop editor regression check

- [ ] Compare results against the PRD acceptance criteria:
  - Idle/default editor shows stage, timeline, and primary actions.
  - Formation selected state is visually distinct.
  - Token selected state is visually distinct from formation selection.
  - Timeline rail fits playback, add, time, and zoom at 390px.
  - Formation and audio lanes remain visible.
  - Icon-only controls have labels and hints.
  - Menu/tool surfaces remain reachable and visually connected.
  - Desktop does not regress.

- [ ] If implementation surfaced a durable lesson, add a short `docs/solutions/` note before final handoff.

## Risk Controls

- Do not rewrite formation, token, timeline, share, auth, Supabase, provider, or stage rendering logic for this redesign.
- Do not paste Stitch HTML into the React app.
- Do not introduce a second editor shell.
- Do not hide existing core actions to make the screen appear cleaner.
- Do not let the timeline compactness hide the audio lane.
- Do not ship icon-only controls without labels and hints.
- Keep desktop changes scoped to regression prevention unless desktop redesign is explicitly reopened.

## Suggested Review Slices

1. State markers and editor shell
   - Required before next slice:
     - `npm test`
     - `npm run build`
     - Mobile 390px idle screenshot/review

2. Formation selected and token selected states
   - Required before next slice:
     - `npm test`
     - `npm run build`
     - Mobile 390px formation-selected screenshot/review
     - Mobile 390px token-selected screenshot/review

3. Timeline rail and lanes
   - Required before next slice:
     - `npm test`
     - `npm run build`
     - `npm run test:browser`
     - Mobile 390px timeline-visible screenshot/review showing playback, add, time, zoom, formation lane, and audio lane

4. Menu/tool surfaces
   - Required before next slice:
     - `npm test`
     - `npm run build`
     - Mobile 390px menu/tool expanded screenshot/review

5. Accessibility and screenshot QA
   - Required before handoff:
     - `npm test`
     - `npm run build`
     - `npm run test:browser`
     - Final mobile 390px and desktop regression screenshot/review set

Each slice should be reviewable independently and should include the relevant verification command output or screenshot notes.
