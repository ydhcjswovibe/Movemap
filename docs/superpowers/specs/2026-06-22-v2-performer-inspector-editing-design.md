# V2 Performer Inspector Editing Design

## Purpose

V2 performer editing should let users change names, token display, and colors without turning the performer list into a heavy form table or making stage token selection a bottom action-bar context.

This design follows the current V2 action-bar policy:

- Selecting a stage token keeps the global bottom action bar in its default state.
- Performer-specific actions live in the `사람 목록` sheet.
- The performer list remains easy to scan.

## Scope

This slice covers:

- selecting a performer from `사람 목록`
- showing a selected-performer inspector inside the same sheet
- editing performer name
- editing token display with automatic fallback
- editing color
- duplicating a performer
- deleting a performer
- readonly behavior for share routes

This slice does not cover:

- role or group editing
- pair or partner editing
- multi-performer bulk actions
- position reset
- transition path filtering
- permissions or per-performer accounts

## Interaction Model

### 사람 목록

The `사람 목록` sheet is a lightweight roster scanning surface.

Each row should show only:

- color swatch
- performer name
- resolved token display
- selected state

Rows should not expose inline edit fields or per-row duplicate/delete buttons. Those controls make the list visually heavy and increase mobile mis-tap risk.

Selecting a row:

- selects the performer on the stage
- keeps the global bottom action bar in `default`
- shows the performer inspector inside the `사람 목록` sheet
- keeps the list visible so the user can quickly switch to another performer

### Performer Inspector

The inspector is the action surface for the selected performer.

It should show:

- selected performer name
- resolved token display
- color swatch
- actions: `편집`, `복제`, `삭제`

`편집` expands inline fields inside the inspector:

- `이름`
- `토큰 표시`
- `색상`

The inspector should not navigate to a separate full detail page for this slice. Keeping it inside the list sheet preserves context and supports quickly editing multiple performers.

### Token Display

Token display is automatic by default and user-overridable.

Rules:

- If a manual token display value exists, use it.
- If the manual value is empty, derive the token display from the performer name.
- If the name is empty, fall back to the existing label or id.
- Clearing the manual token display returns the performer to automatic mode.

Suggested auto behavior:

- Korean names: first two visible characters, e.g. `김민지` -> `김민`
- short single-word names: first two or three visible characters, e.g. `Bo` -> `Bo`
- multi-word Latin names: initials, e.g. `Ari Kim` -> `AK`

The field helper copy should be simple:

```text
비워두면 이름에서 자동 생성
```

This lets default users ignore token-display mechanics while preserving control for teams that use labels such as `A1`, `B2`, `센터`, or `서브1`.

## Actions

### 편집

Expands the inspector edit fields. The user can update:

- name
- manual token display
- color

Changes should update stage tokens and roster rows immediately.

### 복제

Duplicates the selected performer.

Expected behavior:

- creates a new performer with a unique id
- copies color as the starting value
- creates a distinct name and token display fallback, rather than duplicating the exact visible token into ambiguity
- materializes a position for the new performer in the current formation using the nearest safe placement policy already used by performer-add flows, or a simple adjacent offset if that is the local pattern
- selects the new performer after creation

### 삭제

Deletes the selected performer.

Expected behavior:

- presented as a danger action
- disabled in readonly
- should not leave invalid performer ids in current formation positions
- should not delete the last performer unless the existing product policy allows an empty roster

If the current app does not already have a delete-confirmation pattern for destructive roster actions, this slice should use a lightweight two-step confirmation inside the inspector rather than a blocking modal.

## Readonly Behavior

On readonly share routes:

- users may select performers
- `사람 목록` remains available
- the inspector may show selected performer information
- edit fields are readonly or hidden behind disabled controls
- `복제` and `삭제` are disabled
- global bottom action bar remains default during performer selection

## Data Model Notes

The current app already has performer fields such as:

- `id`
- `name`
- `label`
- `color`
- `role`

This design treats `role` as out of scope.

Implementation should avoid a broad data migration. Prefer a compatibility layer:

- preserve existing `label` values
- introduce or reuse a manual token display field only if the current model has a safe place for it
- resolve display through a helper that can read manual token display, name, label, and id in order

If `label` is currently the only stable token-display field, it may temporarily serve as the manual override, but the UI should still describe the behavior as automatic unless the value has been intentionally edited.

## Implementation Seams

Likely seams:

- `src/v2EditorRuntime.mjs`
  - model `cast-list` rows
  - add selected performer inspector model
  - add readonly states
  - expose actions for performer edit, duplicate, delete
- `src/V2VisualEditor.jsx`
  - render lightweight roster rows
  - render inspector and edit fields
  - route inspector actions
- `src/App.jsx`
  - own mutations for performer name, token display, color, duplicate, delete
  - preserve stage selection behavior
- `src/v2EditorRuntime.test.mjs`
  - runtime model for selected performer inspector
  - automatic token display fallback
  - readonly disabled states
- `tests/browser/v2-visual.spec.mjs`
  - mobile 390px roster list remains scannable
  - selected performer inspector appears
  - editing name/token/color updates token and row
  - duplicate selects the new performer
  - delete removes the performer safely
  - readonly route disables mutation controls

## Acceptance Criteria

- `사람 목록` remains visually lightweight and scan-friendly.
- Selecting a performer from the list opens an inspector in the same sheet.
- The inspector shows `편집`, `복제`, and `삭제`.
- `편집` exposes only `이름`, `토큰 표시`, and `색상`.
- `토큰 표시` is automatic by default and manually overridable.
- Clearing manual token display returns to automatic display.
- Stage tokens and list rows update after edits.
- Performer selection does not change the global bottom action bar from `default`.
- Readonly share routes can inspect performer information but cannot edit, duplicate, or delete.
- Verification includes unit runtime coverage and 390px browser coverage.
