# Movemap Agent Instructions

## Product Contract

- `SPEC.md` is the canonical product contract for Movemap.
- `MVP.md` translates `SPEC.md` into staged implementation state and next executable slices.
- If dated docs under `docs/superpowers/` conflict with `SPEC.md`, follow `SPEC.md` unless `SPEC.md` explicitly delegates that topic.
- For substantial redesign or product-direction changes, use the sequence: PRD/spec first, implementation plan second, code third.

## Workflow

- Keep routine work lightweight. Load Superpowers or Compound workflows only when explicitly requested or when a task-specific instruction requires them.
- When a checked-in Superpowers plan/spec is the active task source, follow its required workflow skill unless the user explicitly overrides it.
- Preserve dirty worktrees. Do not revert unrelated user or previous-agent changes.
- Stage, commit, or push only the intended slice unless the user explicitly asks for broader cleanup.
- Prefer narrow behavior changes over broad refactors.
- Do not commit generated build/test artifacts such as `dist/` or `test-results/` unless explicitly requested.

## Editor Boundaries

- Mobile editing is first-class; do not treat mobile as review-only.
- 2D formation and timeline data are canonical. 3D is a preview surface, not a second source of truth.
- `/v2` is the intended next main editor, but it must remain a protected parallel route until the migration into `/` is explicitly planned, tested, and documented.
- Do not partially replace `/` with `/v2` behavior opportunistically. Cutover work should be a named slice with browser coverage for both `/` and `/v2`.
- When `/v2` becomes `/`, update this file and `MVP.md` in the same planned slice so future agents do not follow stale route guidance.
- Do not revive legacy `/editor-v2` unless explicitly requested.
- Do not invent controls or workflows that are not supported by `SPEC.md`, `MVP.md`, or the active implementation plan.

## Key Surfaces

Verify current ownership with `rg` before broad edits; these are the current high-risk seams:

- `src/App.jsx` owns main editor state, route-level adapters, and V2 wiring.
- `src/V2VisualEditor.jsx` owns the V2 visual surface.
- `src/v2VisualEditor.css` owns V2 layout and geometry.
- `tests/browser/v2-visual.spec.mjs` is the main V2 browser coverage surface.

## Verification

Use the smallest sufficient verification set for the change. For normal editor/UI work, prefer:

- `git diff --check`
- `npm test`
- `npm run build`
- targeted `npm run test:browser` such as `npm run test:browser -- tests/browser/v2-visual.spec.mjs`

For visual editor or mobile work, include browser/screenshot inspection. Use a 390px mobile viewport when the change affects the mobile editor.
