# V2 Bottom Menu Sheet Design

## Goal

The V2 mobile editor bottom rail should keep the default category buttons `대형`, `사람`, and `무대`, and show category details through a bottom work sheet when a category is opened.

The sheet must feel like an editor work surface, not a floating popup menu.

## Decisions

- Use the existing quiet active-button style: a subtle background with a top active bar.
- Default category buttons remain visible while the sheet is open.
- Opening a category raises a bottom sheet above the bottom rail.
- Tapping the same active category again closes the sheet.
- Tapping another category while the sheet is open swaps the sheet content in place.
- A visible `닫기` action closes the sheet.
- The stage and timeline remain visible behind or above the sheet where space allows.
- The sheet may cover part of the stage or timeline on small screens, but it must not block the bottom rail.
- Selection tool mode and category sheet mode are mutually exclusive. Selecting a formation or performer closes the default category sheet.

## Category Content

### 대형

The formation sheet is for timeline-oriented formation navigation.

- Show the formation list.
- Highlight the current formation.
- Provide an add formation action.
- Selecting a formation moves the editor to that formation or timeline segment.

### 사람

The cast sheet is for performer management and selection.

- Show performer list.
- Provide add and delete affordances where supported.
- Selecting a performer selects that performer in the editor.
- Role editing can live here later, but it is not required for the first implementation.

### 무대

The stage sheet is for low-frequency editor setup.

- Show stage size controls.
- Show grid and snap controls.
- Show view options that affect the stage surface.

## State Model

The implementation should add an explicit bottom-sheet state separate from selection state.

- `activeBottomSheet`: `null | "formations" | "cast" | "stage"`
- `bottomRailMode`: remains `default | formation | performer`
- When `bottomRailMode !== "default"`, `activeBottomSheet` should be treated as closed.
- The default bottom rail active category can reflect either the active editor tab or the open sheet category.

## Interaction Rules

- Default category button with no open sheet: open that category sheet.
- Default category button matching the open sheet: close the sheet.
- Default category button different from the open sheet: switch sheet content.
- Formation or performer selection: close the category sheet and show contextual selected-item tools.
- Clear selection: return to default bottom rail with no category sheet unless the user explicitly reopens one.

## Testing

Browser coverage should verify:

- The default bottom rail shows `대형`, `사람`, and `무대`.
- Opening each default category shows the correct sheet.
- Tapping the same category closes the sheet.
- Tapping another category swaps sheet content.
- Selecting a formation or performer closes the sheet and switches to the contextual selected-item bottom rail.
- The sheet does not hide the bottom rail at a 390px mobile viewport.
