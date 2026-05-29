# Stage 4-9 MVP Local Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete Movemap through Stage 9 as a provider-neutral MVP foundation: stage references, read-only 3D preview, deterministic templates, bounded AI proposal validation, plan/billing/team seams, and import/export hardening.

**Architecture:** Keep canonical choreography data in the existing 2D project JSON model. Add pure helpers first, then thin UI integrations in `App.jsx`, so tests can prove safety without relying on browser-only state. External billing and AI provider calls remain behind local/provider-neutral seams; this stage implements the validated accept/apply path, not a live paid provider integration.

**Tech Stack:** React/Vite, plain ES modules, Node test runner, existing Playwright browser suite.

---

## File Structure

- Create `src/stageReference.mjs`: normalize and render fixed stage reference marks.
- Create `src/stageReference.test.mjs`: reference model tests.
- Modify `src/App.jsx`: normalize plan references, render reference layer, add simple reference controls, include references in export SVG.
- Modify `src/styles.css`: compact controls and stage/reference/preview styling.
- Create `src/formationTemplates.mjs`: deterministic template generation and apply helpers.
- Create `src/formationTemplates.test.mjs`: deterministic template tests.
- Create `src/formationProposal.mjs`: bounded proposal validation and accept payload helpers.
- Create `src/formationProposal.test.mjs`: proposal safety tests.
- Create `src/stage3dProjection.mjs`: 2D-to-read-only-3D projection data.
- Create `src/stage3dProjection.test.mjs`: projection tests.
- Modify `src/planCapabilities.mjs`: explicit Free/Pro/Team limits, export/AI/team capability helpers, billing-state normalization.
- Modify `src/planCapabilities.test.mjs`: plan and billing seam tests.
- Modify `src/projectJson.mjs`: structured import validation and snapshot metadata helpers.
- Modify `src/projectJson.test.mjs`: import/export hardening tests.
- Modify `MVP.md`: update Stage 4-9 status to implemented locally / provider-neutral where appropriate.

## Task 1: Stage Reference Model, Rendering, And Export

**Files:**
- Create: `src/stageReference.mjs`
- Create: `src/stageReference.test.mjs`
- Modify: `src/App.jsx`
- Modify: `src/styles.css`

- [ ] Add a pure reference model with default fixed marks: center line, front edge, left/right hash marks, and optional custom labels.
- [ ] Normalize `plan.stageReferences` during project load/create/import without breaking old project JSON.
- [ ] Render visible reference marks behind performers in the live SVG stage and exported SVG.
- [ ] Add compact controls to show/hide the reference layer and toggle labels.
- [ ] Verify with `npm test` and commit as `feat: add stage reference layer`.

## Task 2: Deterministic Templates And Bounded Proposals

**Files:**
- Create: `src/formationTemplates.mjs`
- Create: `src/formationTemplates.test.mjs`
- Create: `src/formationProposal.mjs`
- Create: `src/formationProposal.test.mjs`
- Modify: `src/App.jsx`
- Modify: `src/styles.css`

- [ ] Add deterministic templates for line, two-line, V, circle, diagonal, and block layouts that adapt to arbitrary roster counts.
- [ ] Add preview-before-apply state in the tools drawer and mobile sheet.
- [ ] Support applying a template to the current formation or creating a new formation with provenance.
- [ ] Add proposal validation that rejects unknown performer IDs, non-finite coordinates, missing required performers, and out-of-bounds positions before mutating `plan`.
- [ ] Add a local/mock proposal preview using the same apply path as templates; explicit accept is required before project data changes.
- [ ] Verify with `npm test` and commit as `feat: add template and bounded proposal foundations`.

## Task 3: Basic Read-Only 3D Preview

**Files:**
- Create: `src/stage3dProjection.mjs`
- Create: `src/stage3dProjection.test.mjs`
- Modify: `src/App.jsx`
- Modify: `src/styles.css`

- [ ] Add a pure projection helper from canonical `{x,y}` stage coordinates to a read-only 3D-like ground plane.
- [ ] Include selected transition samples and selected performer emphasis in the projection model.
- [ ] Add a `2D / 3D` segmented toggle that shows a read-only 3D preview without changing edit behavior.
- [ ] Keep the 3D preview available in editor/mobile/review contexts where screen space allows.
- [ ] Verify with `npm test` and commit as `feat: add basic 3d preview`.

## Task 4: Pro, Billing, And Team Foundations

**Files:**
- Modify: `src/planCapabilities.mjs`
- Modify: `src/planCapabilities.test.mjs`
- Modify: `src/App.jsx`

- [ ] Add named limits for guest/free/pro/team covering projects, audio, links, exports, snapshots, and AI proposals.
- [ ] Add provider-neutral billing state normalization for inactive, trialing, active, past-due, canceled, and unknown states.
- [ ] Add team role placeholders for owner/admin/editor/viewer without visible multi-user workflow.
- [ ] Surface plan capabilities in existing account/project UI without adding checkout or team management UI.
- [ ] Verify with `npm test` and commit as `feat: add plan billing team foundations`.

## Task 5: Export, Import, Snapshot, And MVP Status Hardening

**Files:**
- Modify: `src/projectJson.mjs`
- Modify: `src/projectJson.test.mjs`
- Modify: `src/App.jsx`
- Modify: `MVP.md`

- [ ] Extract structured import validation from `App.jsx` into `projectJson.mjs`.
- [ ] Validate malformed performers, empty sections, invalid positions, invalid timing, and invalid stage metadata with user-readable errors.
- [ ] Add snapshot metadata helpers for portable project JSON.
- [ ] Gate advanced exports through plan capabilities while preserving the existing basic JSON save path.
- [ ] Update `MVP.md` to reflect Stage 4-9 local/provider-neutral implementation status and remaining external provider work.
- [ ] Verify with `npm test`, `npm run build`, `npm run test:browser`, and `git diff --check`; commit as `feat: harden mvp export packaging`.

## Review Gates

- After each task, run the task-specific verification before committing.
- After all tasks, run a final code review pass for correctness, maintainability, and scope.
- Do not mark provider-backed billing or live AI generation as complete unless actual external integrations exist; mark only the local/provider-neutral MVP foundation complete.
