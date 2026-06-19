# Movemap design system

Movemap should feel like a precision dark editing tool built around a large visual workspace, not a generic dark dashboard. Use Linear as the primary reference for surface discipline and Miro as the secondary reference for object clarity on a board. Do not copy either brand. Translate those ideas into a choreography editor where stage tokens, timeline blocks, menus, and sheets all belong to one working environment.

## Principles

- The canvas is near-black, calm, and spatial. Panels step upward in small, deliberate surface changes.
- Hairlines carry hierarchy. Prefer 1px borders and inset separators over heavy shadows or bright fills.
- Color is semantic, not decorative. Blue means primary selection or command focus. Green means current time, movement, progress, or saved state. Red means blocked, destructive, disabled-by-policy, or danger.
- Magenta and purple are not default accents. Use them only when the product model assigns a real meaning.
- Stage objects and timeline objects must be easy to scan at a glance. Selected, current, blocked, and drag-preview states must be visually different without changing layout geometry.
- Mobile editing is first-class. A 390px viewport must show the stage, timeline, action rail, and active sheet without accidental overlap.

## Surface Ladder

- `canvas`: `#05070a` to `#080b10`, used behind the whole editor.
- `panel`: `#0d1117`, the default toolbar, rail, and sheet base.
- `panel-soft`: `#111720`, used for rows, secondary controls, and low-emphasis cards.
- `panel-raised`: `#161d27`, used for menus, active rails, and elevated sheets.
- `panel-peak`: `#1c2633`, used sparingly for selected rows and pressed surfaces.
- `line`: low-contrast 1px separators.
- `line-strong`: selected or structural separators.

Avoid cards inside cards. Use full-width bands, rails, and unframed work areas unless a repeated item or menu truly needs a frame.

## Type

- Keep the existing stack: `"Wanted Sans"`, `"Pretendard"`, system sans.
- Use compact, confident labels. Avoid visible instructional copy in the app chrome.
- Use tabular numerics for timecode, coordinates, durations, and row numbers.
- Keep letter spacing at `0` for UI text. Small labels may use weight and color instead of tracking.

## Object States

- `selected`: blue border, subtle blue inset, no size change.
- `selected` must never use white fills, white outlines, or white pills as the primary state signal. White may appear only as tiny readable text or icons where contrast requires it.
- `current`: green edge or marker, no competing blue unless also selected.
- `blocked`: red border/halo, never yellow unless warning is explicitly separate from blocked.
- `drag-preview`: translucent raised object with a clear insertion line or slot. It must not resize neighboring objects.
- `readonly`: controls are hidden or disabled with clear muted styling; review surfaces stay polished.

## Motion

- Interactive chrome should have short tactile feedback using `opacity`, `background`, `border-color`, `box-shadow`, and small `transform` changes.
- Do not animate `left`, `top`, `width`, `height`, or timeline geometry during drag, trim, reorder, or scrub.
- Resting transforms for stage tokens and timeline blocks must remain position-preserving so hit targets and tests stay stable.

## Route Surfaces

- `/`, `/share/:id`, and `/edit/:id` use the V2 editor shell.
- Unsupported route notices use the same dark surface ladder as the editor.
- `/stitch-mobile-mock` remains a design mock. Align its colors and object states, but do not redesign its workflow.

## Final Acceptance Checklist

- Selected-state cohesion: the selected formation reads as the same blue state across the stage info line, timeline hold block, formation list row, bottom sheet header, and active command rail button.
- Stage workspace clarity: the stage remains the largest calm work area, with readable grid/front/audience hierarchy and no token size or hit-target regression.
- Timeline object clarity: hold blocks read as editable objects, move blocks read as transition context, current progress stays green, and blocked/drop states stay red or neutral as defined above.
- Mobile no-overlap: at 390px width, the stage, transport, timeline, bottom sheet, and action rail remain visible and ordered without horizontal overflow or accidental text collisions.
