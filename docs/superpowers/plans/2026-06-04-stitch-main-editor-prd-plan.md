# Stitch Main Editor PRD Writing Plan

## Context

The Stitch project `Movemap Main Editor` contains five source screens that represent editor states rather than five unrelated final designs:

| Role | Stitch screen | Source screen ID |
| --- | --- | --- |
| Legacy comparison | `Movemap Pro Editor (Formation Selected)` | `3a542aa5b3f2472a814f5e2d565c6d25` |
| Token selection reference | `Movemap Pro Editor (Token Selected)` | `6e425878951043b6a9c4894507abe7b9` |
| Timeline reference | `Movemap Pro Editor (Enhanced Visual Timeline)` | `88c27c0bb6674b66824b14b3e4bd3f12` |
| Primary implementation reference | `Movemap Pro Editor (Formation Selected - Enhanced)` | `b852de0c1b95405892776d8e239235f6` |
| Idle/default reference | `Movemap Pro Editor (Idle State)` | `f431ff3c199547f1b47c120cced57e3d` |

The useful PRD should not ask implementation to copy every Stitch screen. It should define the best state-by-state combination and use each Stitch screen as a reference for a specific editor condition.

## Goal

Create a state-combination PRD for applying Stitch's Movemap editor design direction to the current Movemap app while preserving existing behavior.

The PRD should answer:

- Which Stitch screen is the primary implementation reference?
- Which screens are supporting state references?
- Which visual details should be adopted?
- Which details should be ignored or treated as legacy?
- Which existing Movemap behaviors must remain unchanged?
- How will implementation be verified without rewriting the product logic?

## Recommended PRD Shape

Use a state model, not a screen-list model.

The PRD should organize the redesign around these states:

1. Idle/default editor state
2. Formation selected state
3. Token selected state
4. Timeline manipulation state
5. Tool/menu expanded state

Each state should include:

- Reference Stitch screen
- Purpose of the state
- UI elements to adopt
- UI elements to avoid
- Existing Movemap behaviors that must remain intact
- Acceptance criteria

## State Reference Decisions

### Primary Implementation Reference

Use `Movemap Pro Editor (Formation Selected - Enhanced)` as the main visual reference.

Source screen ID: `b852de0c1b95405892776d8e239235f6`.

Reason:

- It appears to be the later, improved formation-selection variant.
- It should define the baseline editor density, hierarchy, stage/control balance, and selected-formation treatment.
- It is the best candidate for the default "working editor" feel.

### Idle/Default State Reference

Use `Movemap Pro Editor (Idle State)` for default editor loading and no-active-selection behavior.

Source screen ID: `f431ff3c199547f1b47c120cced57e3d`.

Use it to define:

- Empty or neutral stage state
- Default action visibility
- Non-selected control emphasis
- First-screen density before a user selects a formation or token

Do not use it to remove existing Movemap capabilities that are already available in the current app.

### Token Selection Reference

Use `Movemap Pro Editor (Token Selected)` for member/token selection behavior.

Source screen ID: `6e425878951043b6a9c4894507abe7b9`.

Use it to define:

- Selected performer visual emphasis
- Context controls for a selected member
- Inspector or compact property affordances
- How selection should affect surrounding controls without creating clutter

### Timeline Reference

Use `Movemap Pro Editor (Enhanced Visual Timeline)` as the timeline-specific reference.

Source screen ID: `88c27c0bb6674b66824b14b3e4bd3f12`.

Use it to define:

- Bottom timeline density
- Playback and add controls
- Formation/audio lane clarity
- One-row timeline rail direction where feasible

This should be aligned with the existing mobile timeline requirement: icon-only controls need accessible labels and tooltip or hint affordances.

### Legacy Comparison Reference

Treat `Movemap Pro Editor (Formation Selected)` as a comparison-only screen unless inspection shows a detail that is stronger than the enhanced version.

Source screen ID: `3a542aa5b3f2472a814f5e2d565c6d25`.

Use it to:

- Confirm what changed between the earlier and enhanced formation-selected states
- Recover any interaction detail that was accidentally lost in the enhanced version

Do not use it as a competing primary target.

## PRD Writing Steps

- [ ] Capture a compact reference table with the five Stitch screens, their roles, and their screen IDs.

- [ ] Write the problem statement from the product perspective:
  - The current app has functional editor behavior, but the visual state model needs to be unified around the newer Stitch editor direction.
  - Stitch contains useful state-specific references, but applying all screens literally would create implementation ambiguity.

- [ ] Write the solution statement:
  - Preserve existing Movemap behavior and data flow.
  - Adopt the Stitch state model for mobile editor layout, selection hierarchy, timeline density, and control grouping.
  - Use one primary screen plus supporting state references.

- [ ] Write user stories around actual editor workflows:
  - As a choreographer, I want the default editor to feel ready for work before anything is selected, so that I can orient myself quickly.
  - As a choreographer, I want a selected formation to have clear emphasis and useful nearby controls, so that I can edit without searching through menus.
  - As a choreographer, I want a selected performer to expose compact relevant actions, so that I can make member-level adjustments quickly.
  - As a choreographer, I want playback and timeline controls to stay dense but readable on mobile, so that I can review timing without losing the stage.
  - As a choreographer, I want expanded menus to feel like part of the same editor system, so that advanced actions do not feel bolted on.

- [ ] Define implementation decisions without over-prescribing code:
  - Keep current React app behavior and state contracts.
  - Modify presentation, layout, and component composition only where needed.
  - Keep save, share, auth, project loading, and provider behavior out of scope.
  - Keep stage geometry and 3D preview logic out of scope unless visual integration requires non-behavioral container changes.
  - Preserve accessibility on icon-only controls with `aria-label` and tooltip or hint affordances.

- [ ] Define acceptance criteria by state:
  - Idle/default state matches the Stitch default hierarchy without hiding existing core actions.
  - Formation selected state uses the enhanced Stitch hierarchy as the main implementation target.
  - Token selected state clearly differentiates member selection from formation selection.
  - Timeline state keeps playback, add, time, zoom, and lanes usable on mobile.
  - Expanded tools remain reachable without overcrowding the main editor.
  - Desktop layout does not regress from mobile-focused changes.

- [ ] Define testing decisions:
  - Run existing unit tests for timeline, selection, project JSON, share, auth, and geometry behavior.
  - Add focused tests only for new presentation contracts that are easy to assert, such as timeline rail presence, accessible labels, and key state markers.
  - Use browser screenshot verification for mobile editor, token-selected, timeline-visible, and menu-expanded states.

- [ ] Define out of scope:
  - Rewriting formation data structures
  - Replacing timeline core logic
  - Changing auth, share, Supabase, or provider adapters
  - Replacing the stage rendering engine
  - Copying Stitch HTML directly into the app

- [ ] Save the final PRD as `docs/superpowers/specs/2026-06-04-stitch-main-editor-state-prd.md`.

## PRD Review Checklist

Before implementation starts, the PRD should make these decisions explicit:

- Primary reference screen is exactly one screen.
- Every other Stitch screen has a named supporting role.
- The older formation-selected screen is not treated as a second final direction.
- Existing Movemap functionality is protected.
- Mobile timeline requirements include tooltip or hint affordances for icon-only controls.
- Acceptance criteria are state-based rather than title-based.

## Execution Options

Option 1: Write the PRD only.

- Create the PRD file from this plan.
- Stop before implementation.
- Use this if the design direction still needs user review.

Option 2: Write the PRD, then create an implementation plan.

- Create the PRD file.
- Review it against the current app.
- Create a separate implementation plan that slices work into shell, stage/selection, timeline, and QA phases.

Recommended option: Option 1 first. The Stitch references are now clear enough to write the PRD, but implementation should wait until the state roles are approved.
