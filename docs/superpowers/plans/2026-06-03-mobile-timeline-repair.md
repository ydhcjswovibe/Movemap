# Mobile Timeline Repair Plan

## Context

The latest screenshot at `/tmp/movemap-wanted-review/05-editor-mobile.png` shows the mobile timeline compressed at the bottom of the editor. The `FORMS` lane is visible, but the `AUDIO` lane is effectively lost below the visible timeline area. The formation block is still readable, but the rail no longer looks like a complete two-lane timeline.

This happened after the mobile density pass, but the direct failure is in the mobile timeline sizing contract:

- `src/styles.css` sets the portrait mobile stage grid row for the timeline to `minmax(112px, 136px)`.
- The timeline editor must contain a control rail plus two timeline lanes: `FORMS` and `AUDIO`.
- `.timeline-editor` uses `overflow: hidden`, so when the available row is too short, the lower lane disappears instead of scrolling or resizing gracefully.

## Goal

Restore a usable mobile timeline without undoing the compact dropdown work.

Acceptance criteria:

- Mobile timeline shows both `FORMS` and `AUDIO` lanes in the default mobile editor screenshot.
- The timeline does not overlap or hide behind the bottom action bar.
- Timeline controls remain one compact row.
- Formation block text stays single-line/readable enough.
- Desktop timeline remains visually unchanged.
- Existing mobile dropdown width remains `200px`.

## Approaches Considered

### Approach A: Increase the mobile timeline grid slot

Raise the portrait mobile `.stage-area` timeline row from `minmax(112px, 136px)` to a larger but bounded value, for example `minmax(148px, 176px)`.

Pros:

- Minimal change.
- Keeps existing timeline markup and behavior.
- Directly fixes the missing `AUDIO` lane.

Cons:

- Takes vertical space from the stage.
- Could make the stage feel slightly shorter on small phones.

### Approach B: Keep the slot height and compress lane internals

Keep `minmax(112px, 136px)` and reduce `.timeline-editor` padding, lane heights, block heights, row-label width, and control row height.

Pros:

- Preserves current stage height.
- Keeps the compact mobile density principle.

Cons:

- There is little remaining vertical budget.
- The timeline may still feel cramped, and audio controls become too small.

### Approach C: Make the mobile timeline vertically scrollable

Keep the slot height and change `.timeline-editor` from `overflow: hidden` to vertical scrolling.

Pros:

- Avoids taking stage space.
- Both lanes become reachable.

Cons:

- Poor mobile ergonomics for a timeline; users should not have to scroll inside the rail to see the audio lane.
- Adds nested scrolling near the bottom action bar.

## Chosen Direction

Use Approach A with a small amount of Approach B.

The timeline needs a real minimum visual budget. The correct fix is to allocate enough height for the complete two-lane timeline, then lightly compact internals so the row increase stays modest.

## Implementation Steps

1. Update the portrait mobile timeline grid row in `src/styles.css`.
   - Change `.stage-area` from `minmax(112px, 136px)` to a larger bounded row.
   - Initial target: `minmax(150px, 172px)`.
   - Keep `--mobile-action-bar-height: 54px` unchanged.

2. Tighten the mobile timeline internals only where needed.
   - Reduce `.timeline-editor` padding from `6px` to `5px`.
   - Keep `.timeline-control-rail` single-row.
   - Keep `.timeline-workbench` at two visible lanes.
   - If needed, reduce mobile `.formation-block` minimum height slightly, but do not drop below `32px`.

3. Add or update CSS contract tests in `src/movementTimingControls.test.mjs`.
   - Assert the mobile stage grid timeline row uses the new bounded size.
   - Assert mobile timeline still keeps one control rail.
   - Assert mobile timeline continues to include both `Forms` and `Audio` lanes.

4. Run verification.
   - `npm test`
   - `npm run build`
   - `npm run test:browser`
   - `node scripts/capture-wanted-review.mjs`

5. Visual review targets.
   - `/tmp/movemap-wanted-review/05-editor-mobile.png`
   - `/tmp/movemap-wanted-review/opened-surfaces/mobile-bottom-people-sheet.png`
   - `/tmp/movemap-wanted-review/03-editor-desktop.png`

## Risk Controls

- Do not change JSX unless CSS cannot restore both lanes.
- Do not modify the `200px` dropdown token.
- Keep desktop selectors untouched.
- Do not remove `overflow: hidden` unless the larger row still fails; hidden overflow protects against timeline widening and nested scroll problems.

## Expected Result

The mobile screen should show the stage, a complete two-lane timeline, and the bottom action bar at once. The stage will lose a small amount of vertical height, but the timeline will stop looking broken.
