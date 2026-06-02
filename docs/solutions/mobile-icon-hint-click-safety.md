# Mobile Icon Hint Click Safety

## Problem
Stateful icon hints can break mobile and Playwright click behavior when they render on `pointerdown` or focus before the button command runs.

## Context
The compressed mobile timeline uses icon-only controls with short hints. Early implementations showed the hint on `pointerdown`/focus, which re-rendered the button before React delivered the command click. The first tap could select the existing intro formation instead of appending a new formation.

## Fix
Run the command first in the button `onClick`, then show the hint popover. Keep `aria-label` and `title` on the control so the accessible name does not depend on the hint.

Use a fixed-position overlay owned by the shared icon button module instead of rendering popovers inside the clicked button. This keeps one hint visible at a time, prevents clipped hints inside timeline/stage containers, and avoids local state churn in `App.jsx`.

For controls near the top edge, place the hint below the control instead of above it. Clamp the horizontal position against viewport edges so mobile toolbar hints do not render offscreen.

## Prevention
When adding compact icon controls:

- Do not set hint state from `pointerdown` or focus if it can re-render the clicked control.
- Keep icon hint rendering in the shared component rather than duplicating local popover state.
- Browser-test both the command effect and the hint effect.
- For add controls, assert the new item lands at the expected time or position, not only that a count changed.
- Check hint placement inside any clipped or scrollable parent.

## References
- `src/App.jsx`
- `src/IconHintButton.jsx`
- `src/styles.css`
- `tests/browser/timeline-smoke.spec.mjs`
