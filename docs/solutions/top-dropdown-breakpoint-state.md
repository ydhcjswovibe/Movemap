# Top Dropdown Breakpoint State

## Problem
Shared top-menu state can mount duplicate dropdowns when mobile and desktop headers both remain in the React tree and CSS only hides one breakpoint.

## Context
Movemap keeps separate mobile and desktop command bars mounted. If both bars render `topActionMenu === "share"` from the same state, opening one menu also creates a hidden duplicate menu in the inactive breakpoint. Browser tests can then pass while targeting a hidden file input or hidden menu, because the command handler is shared.

## Fix
Track both the menu key and the surface that opened it. Render a top dropdown only when both values match the current surface, such as `topActionMenu === TOP_ACTION_MENUS.more && topActionSurface === "desktop"`.

Keep the outside-click scope narrow. Mark only the actual menu button group or mobile top action cluster as `.top-action-scope`, not the whole desktop toolbar. Unrelated toolbar actions such as save or tool-drawer toggles should explicitly close the top menu before running their command.

## Prevention
When a responsive UI keeps multiple breakpoint variants mounted:

- Store enough state to identify which variant owns an overlay.
- Assert that opening a menu mounts one visible menu, not hidden duplicates.
- Scope Playwright locators to the visible surface, such as `.desktop-command-bar .more-action-menu input`.
- Test that unrelated toolbar controls close open dropdowns.

## References
- `src/App.jsx`
- `src/styles.css`
- `tests/browser/timeline-smoke.spec.mjs`
