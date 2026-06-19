# Movemap Agent Instructions

## Product Contract

- `SPEC.md` is the canonical product contract for Movemap.
- `MVP.md` translates `SPEC.md` into staged implementation state and next executable slices.
- If dated docs under `docs/superpowers/` conflict with `SPEC.md`, follow `SPEC.md` unless `SPEC.md` explicitly delegates that topic.
- For substantial redesign or product-direction changes, use the sequence: PRD/spec first, implementation plan second, code third.

## Workflow

- Keep routine work lightweight. Load Superpowers or Compound workflows only when explicitly requested or when a task-specific instruction requires them. For non-trivial implementation plans, write plans for fresh-session execution with files to inspect, execution order, verification, and commit criteria.
- Default non-trivial implementation-plan execution to `superpowers:subagent-driven-development`. If changes are tightly coupled or product/UX judgment is high-risk, keep main-agent control and use subagents only for independent work, review, or verification.
- When a checked-in Superpowers plan/spec is the active task source, follow its required workflow skill unless the user explicitly overrides it.
- Preserve dirty worktrees. Do not revert unrelated user or previous-agent changes.
- Stage, commit, or push only the intended slice unless the user explicitly asks for broader cleanup.
- After implementation is complete and verification passes, commit the intended slice without another prompt. Do not commit unrelated dirty worktree changes, generated artifacts, or local tool/planning files unless explicitly requested.
- Prefer narrow behavior changes over broad refactors.
- Do not commit generated build/test artifacts such as `dist/` or `test-results/` unless explicitly requested.

## Editor Boundaries

- Mobile editing is first-class; do not treat mobile as review-only.
- 2D formation and timeline data are canonical. 3D is a preview surface, not a second source of truth.
- V2 is the main editor on `/` for normal edit, share, and edit-link routes.
- Legacy `/v2`, `/share/:id/v2`, and `/edit/:id/v2` routes are unsupported; do not restore them without an explicit compatibility slice.
- Keep `/stitch-mobile-mock` available only as a test/design mock, not as a user-facing editor route.
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
