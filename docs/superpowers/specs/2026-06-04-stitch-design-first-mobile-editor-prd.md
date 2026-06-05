# Stitch Design-First Mobile Editor PRD

## Summary

Rebuild the mobile editor as a Stitch-first tool surface instead of continuing to reskin the legacy Movemap mobile layout. The new mobile shell owns the visual structure, while existing Movemap state, timeline data, stage geometry, and handlers are adapted into it.

## Product Goal

At 390px mobile portrait, the first impression should read as a compact dark Stitch toolbelt UI: a top utility bar, dark stage canvas, compact transport rail, event timeline rail, contextual action rail, and bottom inspector/menu surfaces.

## Requirements

- Preserve existing editor behavior: formation selection, performer selection, drag/tap movement, timeline calculations, share/auth/provider logic, import/export, and 2D/3D stage switching.
- Keep desktop as a regression-safe existing editor path.
- Introduce a new mobile-only shell with a distinct `data-stitch-mobile-editor` root.
- Keep legacy test compatibility selectors visible in the new mobile shell: `.mobile-status-bar`, `.stage-area`, `.stage-frame`, `.stage`, `.timeline-editor`, `.timeline-control-rail`, `.formation-block`, `.mobile-action-bar`, `.mobile-global-actions`, and `.mobile-bottom-sheet`.
- Use Stitch fixed tokens:
  - base `#131313`
  - low panel `#1c1b1b`
  - panel `#201f1f`
  - high panel `#2a2a2a`
  - highest panel `#353534`
  - outline `#434656`
  - strong outline `#8d90a2`
  - selection blue `#2e62ff`
  - blue soft `#b7c4ff`
  - play green `#05e777`
  - green soft `#7dffa2`
  - danger red `#d43237`
  - compact radii `4px` and `8px`

## Acceptance Criteria

- 390px horizontal overflow is `0`.
- Stage, timeline, transport, action rail, and inspector/menu surfaces fit in the viewport.
- Forms and Audio lanes remain visible.
- Action buttons remain clickable and accessible by name.
- Formation and token selected states are visibly different.
- The stage reads as a dark Stitch canvas, not a light Movemap canvas.
- `npm test`, `npm run build`, and `npm run test:browser` pass.

## Supersedes

This PRD supersedes:

- `docs/superpowers/specs/2026-06-04-stitch-main-editor-state-prd.md`
- `docs/superpowers/plans/2026-06-04-stitch-main-editor-implementation.md`
- `docs/superpowers/plans/2026-06-04-stitch-main-editor-prd-plan.md`
