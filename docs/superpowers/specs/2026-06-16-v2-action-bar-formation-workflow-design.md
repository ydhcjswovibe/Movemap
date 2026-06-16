# V2 Action Bar And Formation Workflow Design

## Summary

V2 turns the fixed `대형 / 사람 / 무대` bottom rail into a mobile-first, horizontally scrollable action bar. The bar acts as a state-based command palette: it shows the actions that are useful for the current editing context instead of forcing the user through category tabs.

This does not revive legacy `/v2` routes, and it does not reintroduce a desktop-style tab surface. Root V2 remains the main editor on `/`; this slice changes the bottom command model while preserving the existing stage, timeline, cast, readonly, and share route boundaries.

This slice focuses on the formation workflow. It also introduces minimal sheets for cast, stage, and music so the default action bar is complete, but those areas are intentionally not fully designed here.

## Product Decisions

- The bottom control is an action bar, not a tab bar.
- The action bar supersedes the current fixed category rail, but it must preserve the current root V2 task boundaries: stage editing stays on the stage, timing stays on the timeline, roster selection stays in cast/list surfaces, and share/export/more stay in the top menus.
- The action bar is always one horizontal row. It scrolls sideways when actions overflow.
- Buttons use an icon above a clear short label, such as `대형 추가` or `사람 목록`.
- The action bar stays fixed at the bottom. Bottom sheets open above it.
- Pressing an action bar item closes the current sheet before opening the next sheet or running the action.
- Pressing the same sheet action again toggles that sheet closed.
- Existing V2 bottom rail DOM selectors stay available for compatibility while new action bar selectors are added.
- Removing `해제` from the action bar is allowed only if empty-stage tap, row reselection, and alternate-object selection remain reliable on mobile and readonly share routes.

## Action Bar States

Default state actions, in order:

1. `대형 추가`
2. `대형 목록`
3. `사람 추가`
4. `사람 목록`
5. `무대 설정`
6. `음악`

Formation-selected state actions, in order:

1. `삭제`
2. `복제`
3. `템플릿`
4. `대형 추가`
5. `대형 목록`
6. `이름/메모`

There is no `해제` action. Selection is cleared through existing direct manipulation patterns such as tapping empty stage space, reselecting, or selecting another object.

## Formation Add

`대형 추가` is an immediate action.

- It captures the positions currently visible on the stage, using the runtime `visiblePositions` / interpolated stage positions as the first source of truth.
- It uses the current playhead time as the insertion point.
- It follows the existing minimum 4 second creation rule.
- It selects the newly created formation.
- If the current playhead is inside a transition, the visible in-between positions become the new formation.
- If runtime visible positions are unavailable, fall back to the nearest or previous formation positions, matching the existing SPEC rule for new formations.
- The implementation must not accidentally keep using only the previous or last formation when visible in-between positions are available.

Template-driven `새 대형으로 추가` uses the same timing and minimum-duration policy, then applies the selected template positions to the new formation.

## Formation List Sheet

`대형 목록` opens the formation list sheet. The sheet is for finding, selecting, and deleting formations. It is not a full editing form.

Default header:

```text
대형 목록                 [다중선택] [닫기]
```

Single-selected header:

```text
F2 Chorus                 [삭제] [복제] [템플릿] [이름] [닫기]
```

Multi-select header:

```text
N개 선택됨                [전체선택] [삭제] [취소]
```

Formation rows are a single line:

```text
F2  Chorus                12.0s ~ 16.0s
```

Row rules:

- `F#` is fixed width.
- The formation name truncates with ellipsis.
- The time range is right aligned and fixed width.
- The time range is the formation hold interval, not the following move.
- The current playhead formation is shown with a left accent bar.
- The selected formation is shown with active row styling.
- There are no warning badges.
- There is no row accordion.

Tap rules:

- In normal mode, tapping a row selects that formation and moves current time to the start of its displayed range.
- The sheet stays open after row tap on both mobile and desktop.
- In multi-select mode, tapping a row only toggles its checkbox. It does not move current time or change the single selected formation.

## Formation List Header Actions

Single-selected header actions duplicate the formation-selected action bar behavior.

- `삭제`: immediate single-delete plus undo.
- `복제`: immediate duplicate.
- `템플릿`: switches to the template sheet.
- `이름`: switches to the name/memo sheet.
- `닫기`: closes the sheet.

These actions intentionally duplicate the action bar actions. The action bar is useful when the sheet is closed; the sheet header is useful while the user is browsing the list.

## Multi-Select Deletion

The formation list sheet has a multi-select mode entered from the header selection icon.

- The selection control is an icon button, not a text `선택` button.
- Rows show checkboxes only in multi-select mode.
- Header actions are icon buttons for `전체선택`, `삭제`, and `취소`.
- Multi-select mode takes header priority over single-selection actions.
- Cancelling multi-select restores the previous single selection, if one existed.
- Deleting zero selected formations is disabled.
- Deleting one selected formation runs immediately.
- Deleting multiple formations uses a normal confirmation dialog: `선택한 대형 N개를 삭제할까요?`
- Deleting all formations is allowed.

After deletion:

- Prefer selecting the formation immediately before the deleted range.
- If none exists, select the next remaining formation.
- If no formations remain, clear the selected formation and keep the playhead at its current time.

## Empty Formation State

Zero formations are allowed as a deliberate new data policy for this slice.

This changes the current implementation contract, which previously refused to delete the last formation. Implementing this policy requires updating formation deletion helpers, empty timeline rendering, selected-section fallback behavior, readonly/share views, and tests that currently assume the final formation cannot be removed.

When the project has no formations:

- The stage still shows performer tokens using the last available visible position or a default fallback.
- The timeline formation lane is empty.
- The formation list sheet shows an empty state and a `대형 추가` CTA.
- `대형 추가` creates the first formation from the current visible stage positions and current playhead time.
- Shared review and readonly editor routes remain valid when the formation list is empty. They must not expose trim, delete, duplicate, template, or other mutating controls.

## Name/Memo Sheet

`이름/메모` opens a dedicated sheet for the selected formation.

The sheet includes:

- Formation name input.
- Formation memo textarea.
- Read-only time range summary.
- A brief read-only reminder that timing is edited directly on the timeline and positions are edited on the stage.

Editing rules:

- Name and memo update immediately.
- There is no save button.
- Existing autosave/local persistence handles the saved state.
- Name/memo edits must use the same undoable plan-update path as other formation metadata edits. To avoid noisy undo history while typing, implementation batches one undo checkpoint per focused field edit session.

## Template Sheet

`템플릿` opens a dedicated sheet for the selected formation.

The sheet includes:

- Built-in formation templates.
- User-saved formation templates.
- `현재 대형 저장` for saving the selected formation as a user template.
- Template preview.
- `현재 대형에 적용`.
- `새 대형으로 추가`.

Rules:

- Applying a template to the current formation changes positions only.
- Applying a template does not change formation name, memo, timing, or section identity.
- Saving a user template happens inside the template sheet, not as a separate action bar item.
- Adding a new formation from a template follows the same playhead-based minimum 4 second creation policy as `대형 추가`.

## Cast, Stage, And Music Minimal Sheets

The default action bar exposes cast, stage, and music entry points so it must open real sheets for them.

This slice only requires minimum behavior:

- `사람 목록`: show the existing performer list and allow selection.
- `사람 추가`: open a minimal sheet with a non-mutating `사람 추가는 다음 단계에서 지원합니다` state. It must not silently create performers in this slice.
- `무대 설정`: expose existing toggles for snap, stage references, reference labels, transition paths, and the front caution zone control. On readonly/share routes, mutating controls stay disabled or hidden exactly as they are today.
- `음악`: show current music state and connect upload/replace to the existing file picker when editing is allowed. On readonly/share routes, it is status-only.

Full cast editing, role/color editing, pair management, and richer music controls are out of scope for this slice.

These sheets should not move JSON, PNG, PDF, link sharing, or settings menu ownership out of the existing top `Share`, `Export`, and `More` menus.

## Implementation Shape

- Add a V2 `actionBar` model to `createV2EditorRuntime`.
- Keep `bottomRail` and `bottomRailMode` aliases temporarily for compatibility.
- Render DOM with both legacy and new attributes:
  - keep `data-v2-bottom-rail`
  - add `data-v2-action-bar`
- Keep existing bottom sheet rendering structure, but expand sheet keys and item models:
  - `formation-list`
  - `formation-details`
  - `formation-template`
  - `cast-list`
  - `cast-add`
  - `stage-settings`
  - `music`
- Keep CSS compatible with existing V2 tests while adding action-bar-specific classes.
- Prefer small runtime helper functions for row labels, time ranges, action state, and deletion fallback selection.
- Add an explicit position-source helper for formation creation so the action can choose runtime visible positions first and only then fall back to nearby stored formation positions.
- Add an explicit empty-formation helper for stage fallback positions and selected-section cleanup after deletion.

## Acceptance Criteria

- Default action bar shows `대형 추가`, `대형 목록`, `사람 추가`, `사람 목록`, `무대 설정`, and `음악` in a single horizontal scrolling row.
- Selecting a formation changes the action bar to `삭제`, `복제`, `템플릿`, `대형 추가`, `대형 목록`, and `이름/메모`.
- `대형 추가` captures current visible positions and follows the playhead-based minimum 4 second creation rule.
- `대형 추가` inside a transition stores the visible in-between positions, not just the previous formation positions.
- `대형 목록` sheet rows render as `F2 Chorus 12.0s ~ 16.0s`.
- Tapping a formation row selects it, moves current time to the start of that range, and keeps the sheet open.
- Formation list single-selected header shows selected formation sequence/name plus delete, duplicate, template, name, and close actions.
- Multi-select mode supports checkbox toggling, select all, delete, and cancel.
- Deleting all formations leaves a valid empty formation state.
- Empty formation state works in editable, readonly share, and mobile 390px editor viewports without crashing or exposing mutating controls on readonly routes.
- Name/memo sheet updates the selected formation immediately.
- Template sheet can apply a template to the current formation and add a new formation from a template.
- Cast list, cast add, stage settings, and music actions open minimum working sheets.
- Existing readonly/share behavior keeps trim and edit controls hidden where they are currently hidden.

## Verification

- `npm test`
- `npm run test:browser -- tests/browser/v2-visual.spec.mjs`
- Targeted browser tests for:
  - default action bar
  - formation-selected action bar
  - formation list row selection
  - formation list multi-select delete
  - empty formation state
  - name/memo edit
  - template apply and template add
- 390px mobile browser/screenshot inspection for:
  - default action bar geometry
  - formation-selected action bar geometry
  - open sheet above the fixed action bar
  - empty formation state
  - readonly share route with empty formations
- `npm run build`
- `git diff --check`

## Explicit Non-Goals

- Full person creation and role/color editing.
- Full pair management redesign.
- Full music management redesign.
- Billing or plan changes.
- Reworking top share/export/more menus.
- Removing legacy bottom rail selectors in this slice.
