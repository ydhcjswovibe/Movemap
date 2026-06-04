# Stitch Main Editor State PRD

## Problem Statement

Movemap already has a functional editor, but the mobile editor surface needs a clearer state model and a more cohesive visual direction. The Stitch `Movemap Main Editor` work contains useful design references, but they are not a single screen to copy directly. They are a set of editor states that need to be combined intentionally.

If implementation treats every Stitch screen as a separate final target, the redesign will become confusing and may overwrite working product behavior. The product needs one primary visual direction, plus supporting state references for idle, token selection, timeline manipulation, and legacy comparison.

## Solution

Use the Stitch screens as a state-based design reference for the current Movemap editor.

The current Movemap app behavior should remain intact. The redesign should focus on presentation, state hierarchy, mobile density, selection affordances, timeline clarity, and menu/tool organization. The implementation should not copy Stitch HTML directly into the app and should not rewrite the formation, timeline, share, auth, or provider logic.

The PRD defines this reference model:

| Editor state | Reference Stitch screen | Source screen ID | Role |
| --- | --- | --- | --- |
| Formation selected | `Movemap Pro Editor (Formation Selected - Enhanced)` | `b852de0c1b95405892776d8e239235f6` | Primary implementation reference |
| Idle/default | `Movemap Pro Editor (Idle State)` | `f431ff3c199547f1b47c120cced57e3d` | Default editor reference |
| Token selected | `Movemap Pro Editor (Token Selected)` | `6e425878951043b6a9c4894507abe7b9` | Member selection reference |
| Timeline manipulation | `Movemap Pro Editor (Enhanced Visual Timeline)` | `88c27c0bb6674b66824b14b3e4bd3f12` | Timeline reference |
| Formation selected legacy | `Movemap Pro Editor (Formation Selected)` | `3a542aa5b3f2472a814f5e2d565c6d25` | Comparison-only reference |

The redesign should map these references onto existing Movemap app states:

| Editor state | Trigger | Exit condition |
| --- | --- | --- |
| Idle/default | No formation or performer token is actively selected | User selects a formation, token, timeline item, or opens a tool/menu |
| Formation selected | User selects a formation or formation block | User clears selection, selects a token, or switches to another editor action |
| Token selected | User selects an individual performer token | User clears selection, selects a formation, or selects another token |
| Timeline manipulation | User plays, scrubs, edits timing, adds a formation block, adjusts time, or changes zoom | User returns focus to stage editing or closes the timeline-specific interaction |
| Tool/menu expanded | User opens more actions, top action dropdown, bottom tool panel, or a related compact menu | User chooses an action, dismisses the menu, or changes editor context |

## User Stories

1. As a choreographer, I want the editor to open in a clear default state, so that I can understand the current project without needing to select anything first.

2. As a choreographer, I want a selected formation to have a stronger visual hierarchy than the surrounding controls, so that I can quickly understand what I am editing.

3. As a choreographer, I want formation-level controls to stay close to the selected formation context, so that I can adjust the formation without hunting through global menus.

4. As a choreographer, I want a selected performer token to look different from a selected formation, so that member-level edits and formation-level edits do not feel interchangeable.

5. As a choreographer, I want compact token-level controls, so that I can make member adjustments on mobile without losing sight of the stage.

6. As a choreographer, I want timeline controls to stay dense and readable, so that I can review timing while preserving stage space.

7. As a choreographer, I want playback, add, time, and zoom controls to feel like one coherent timeline rail, so that the timeline does not feel scattered across multiple rows.

8. As a choreographer, I want visual lanes for formation and audio timing to remain visible, so that I can compare movement and music timing at a glance.

9. As a choreographer, I want expanded menus and tool panels to match the main editor visual system, so that advanced actions feel connected to the workflow.

10. As a choreographer, I want icon-only controls to include accessible labels and hints, so that compact mobile UI does not become ambiguous.

11. As a returning user, I want existing project save, load, share, and playback behavior to keep working, so that the visual redesign does not disrupt my workflow.

12. As a reviewer, I want the redesigned mobile editor to be verifiable through screenshots and existing tests, so that design changes do not hide behavioral regressions.

## State Requirements

### Idle/Default State

Reference screen: `Movemap Pro Editor (Idle State)`

Source screen ID: `f431ff3c199547f1b47c120cced57e3d`

The idle state should establish the editor's default density, control grouping, and visual calm before the user selects a formation or token.

Adopt:

- Neutral stage emphasis
- Clear global editor actions
- Compact but visible control groups
- Default timeline placement
- Low-distraction dark editor tone

Avoid:

- Hiding existing core actions
- Adding instructional copy inside the app surface
- Treating idle state as an empty marketing or onboarding screen

Acceptance criteria:

- The editor is usable before anything is selected.
- The stage, timeline, and primary actions are visible on mobile.
- No selected-state UI appears unless a formation or token is active.

### Formation Selected State

Reference screen: `Movemap Pro Editor (Formation Selected - Enhanced)`

Source screen ID: `b852de0c1b95405892776d8e239235f6`

This is the primary implementation reference. It should define the baseline mobile editor hierarchy after the redesign.

Adopt:

- Selected formation emphasis
- Stage/control balance
- Compact tool grouping
- Dense but legible mobile layout
- Visual hierarchy between stage, selection controls, timeline, and bottom actions

Avoid:

- Copying the older formation-selected screen as a competing final direction
- Replacing Movemap's current formation data model
- Moving selection behavior into a new untested state system

Acceptance criteria:

- A selected formation is visually distinct.
- Formation-level actions are reachable without crowding the stage.
- Existing formation selection, editing, and playback behavior still works.

### Token Selected State

Reference screen: `Movemap Pro Editor (Token Selected)`

Source screen ID: `6e425878951043b6a9c4894507abe7b9`

The token selected state should define member-level selection treatment and compact token-specific affordances.

Adopt:

- Clear selected-token emphasis
- Member-specific control treatment
- Visual difference between token selection and formation selection
- Compact contextual controls suitable for mobile

Avoid:

- Treating token selection as just another formation selection style
- Adding broad inspector complexity that does not exist in current Movemap behavior
- Reducing touch targets below practical mobile size

Acceptance criteria:

- Token selection is visually distinguishable from formation selection.
- Member-level controls are compact but understandable.
- Existing member drag and selection behavior remains intact.

### Timeline Manipulation State

Reference screen: `Movemap Pro Editor (Enhanced Visual Timeline)`

Source screen ID: `88c27c0bb6674b66824b14b3e4bd3f12`

The timeline state should guide the bottom timeline density, playback rail, and lane clarity.

Adopt:

- One compact timeline control rail at the target mobile width of 390px
- Compact playback, add, time, and zoom controls
- Clear formation/audio lane separation
- Timeline styling that feels integrated with the editor shell

Avoid:

- Nested scrolling inside the mobile timeline
- Hiding the audio lane to make the timeline appear compact
- Icon-only controls without accessible names or hints

Acceptance criteria:

- Playback, add, time, zoom, and lane controls remain usable on mobile.
- At 390px width, playback, add, time, and zoom controls fit as a single compact rail.
- If a narrower viewport forces wrapping, the controls retain order, labels or hints, and visibility.
- Formation and audio lanes remain visible when the timeline is present.
- Timeline controls remain accessible with `aria-label` and tooltip or hint affordances.

### Tool/Menu Expanded State

Reference screens:

- Primary shell reference: `Movemap Pro Editor (Formation Selected - Enhanced)`
- Default density reference: `Movemap Pro Editor (Idle State)`
- Timeline reference when relevant: `Movemap Pro Editor (Enhanced Visual Timeline)`

The Stitch set does not provide a separate named menu-expanded final state. The PRD should derive menu behavior from the primary visual system rather than inventing a disconnected surface.

Implementation should preserve the current Movemap menu/dropdown behavior first, then restyle and reorganize it to match the Stitch editor system. If implementation needs a new menu-expanded visual reference, that reference should be captured or designed as a follow-up before replacing the existing menu behavior.

Adopt:

- Compact menus that match the main editor
- Icon clarity with hints where labels are hidden
- Stable menu placement that does not cover critical stage content unnecessarily

Avoid:

- Large card-like overlays that obscure the editor workflow
- Duplicating actions across multiple menus without a clear hierarchy
- Removing existing dropdown behavior without an equivalent replacement

Acceptance criteria:

- Expanded tools feel visually connected to the main editor.
- Menu actions remain discoverable on mobile.
- Existing top and bottom action affordances remain reachable.

### Legacy Formation Comparison

Reference screen: `Movemap Pro Editor (Formation Selected)`

Source screen ID: `3a542aa5b3f2472a814f5e2d565c6d25`

This screen is comparison-only. It should not compete with the enhanced formation-selected screen as the primary reference.

Use it to:

- Compare what changed between early and enhanced formation selection
- Recover a stronger detail if the enhanced screen accidentally lost it
- Validate that the enhanced direction is actually an improvement before implementation

Do not use it to:

- Define the final baseline layout
- Introduce a second formation-selected direction
- Justify conflicting spacing, color, or control hierarchy

## Implementation Decisions

- Preserve the current Movemap app behavior and data flow.
- Apply Stitch as a design reference, not as generated code to paste into the app.
- Keep the redesign focused on mobile editor presentation and state hierarchy.
- Keep existing formation, token, timeline, share, auth, Supabase, and provider behavior intact.
- Prefer existing Movemap components and CSS structure over creating a parallel editor implementation.
- Use the enhanced formation-selected screen as the primary baseline.
- Treat the idle, token, and timeline screens as state-specific references.
- Treat the older formation-selected screen as comparison-only.
- Preserve accessibility for compact icon controls with clear accessible labels and tooltip or hint affordances.
- Keep desktop behavior stable unless a desktop fix is required to avoid regressions from shared styles.

## Testing Decisions

Testing should protect behavior while allowing visual changes.

Run existing automated tests that cover:

- Timeline policy and movement timing
- Formation and token selection behavior
- Project JSON behavior
- Share and read-only actions
- Auth and ownership policy
- Stage geometry and projection behavior

Add focused tests only where the redesign creates a durable contract:

- Compact timeline rail remains present.
- Key icon-only controls have accessible labels.
- Timeline still exposes formation and audio lanes.
- State markers for selected formation and selected token remain distinguishable.

Use browser or screenshot verification for:

- Mobile idle/default editor
- Mobile formation selected state
- Mobile token selected state
- Mobile timeline-visible state
- Mobile menu/tool expanded state
- Desktop editor regression check

Minimum verification bar:

- `npm test`
- `npm run build`
- Mobile browser or screenshot review at 390px width
- Desktop browser or screenshot regression review

## Out of Scope

- Rewriting formation data structures
- Replacing timeline core logic
- Replacing the stage rendering engine
- Changing auth, ownership, Supabase, share, or provider adapter behavior
- Replacing existing project save/load behavior
- Creating a new onboarding or marketing screen
- Copying Stitch HTML directly into the React app
- Rebuilding the entire desktop editor around the mobile Stitch references

## PRD Completeness Criteria

- The PRD defines one primary Stitch reference screen and supporting state references.
- The enhanced formation-selected screen is the primary implementation target.
- Idle, token selected, and timeline states each have a clear role.
- The older formation-selected screen is explicitly comparison-only.
- Each editor state defines its trigger and exit condition.

## Acceptance Criteria

- The mobile idle/default editor shows the stage, timeline, and primary actions before anything is selected.
- The mobile formation-selected state is visually distinct and keeps formation-level actions reachable.
- The mobile token-selected state is visually distinguishable from formation selection and keeps token-level actions compact.
- At 390px width, timeline playback, add, time, and zoom controls fit as one compact rail.
- Formation and audio timeline lanes remain visible when the timeline is present.
- Icon-only controls have accessible labels and tooltip or hint affordances.
- Tool and menu surfaces remain reachable and visually connected to the main editor.
- The mobile editor redesign preserves current Movemap behavior.
- Desktop editor layout and behavior do not regress from mobile-focused changes.
- Implementation can proceed in small slices without requiring a full app rewrite.

## Further Notes

This PRD should be followed by a separate implementation plan before code changes begin. The implementation plan should slice work into editor shell, formation selection, token selection, timeline, menu/tool surfaces, and visual QA phases.

The current state-reference model intentionally avoids deciding every pixel in the PRD. The PRD's job is to remove ambiguity about which Stitch screen controls which product state. Exact CSS and component changes should be decided during implementation against the current Movemap codebase.
