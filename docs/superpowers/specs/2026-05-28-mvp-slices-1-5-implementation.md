# MVP Slices 1-5 Implementation Plan

> **For ydhcjswo:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to execute this plan task by task.

## Goal

Implement the smallest testable foundations for `MVP.md` active queue slices 1 through 5:

- Slice 1: View/Edit Link separation
- Slice 2: Mobile Review polish
- Slice 3: Transition View upgrade
- Slice 4: Account/Plan foundation
- Slice 5: Mobile Editing foundation

## Constraints

- Preserve existing `/share/:id` links as View Links.
- Do not implement billing, team permissions, named links, link expiration, full mobile editor parity, AI, or 3D Preview.
- Keep broad account modeling out of slices 1-3; add only the foundation in slice 4.
- Keep `대형 추가 = arrival` timing semantics unchanged.
- Keep existing `choreo_*` compatibility fallbacks unchanged.

## Files

- `src/shareLinks.mjs`: Link type normalization, route parsing, metadata serialization helpers.
- `src/shareLinks.test.mjs`: Source-level coverage for View/Edit link model and route behavior.
- `src/planCapabilities.mjs`: Guest/Free/Pro/Team capability and limit helpers.
- `src/planCapabilities.test.mjs`: Plan helper tests.
- `src/transitionView.mjs`: Transition path filtering/emphasis helpers shared by editor and review.
- `src/transitionView.test.mjs`: Transition helper tests.
- `src/App.jsx`: Integrate link mode, share copy, path visibility controls, mobile review cues, and edit-link gating.
- `src/styles.css`: Mobile review and touch-stage affordance polish.
- `src/shareReadOnlyActions.test.mjs`: Update source-level readonly/edit-link UI assertions.
- `tests/browser/timeline-smoke.spec.mjs`: Add mobile shared review smoke and mobile drag smoke.
- `MVP.md`: Move implemented foundation details from Active Queue into Current Implementation Status and leave remaining follow-up work.

## Tasks

### Task 1: Link Model Tests

Add failing tests for:

- Existing `/share/:id` route resolves to a View Link.
- `/edit/:id` route resolves to an Edit Link.
- Project share metadata can serialize and deserialize `view` and `edit` link IDs.
- App source exposes owner-facing View Link and Edit Link copy.

Verification:

- Run `npm test` and confirm the new tests fail before implementation.

### Task 2: Link Model Implementation

Implement `src/shareLinks.mjs` and integrate it in `App.jsx`.

Behavior:

- `/share/:id` is readonly View Link mode.
- `/edit/:id` is editable Edit Link mode.
- Existing share URLs continue to use `/share/:id`.
- Owner copy distinguishes View Link and Edit Link.
- Edit Link URL can be generated and represented in project metadata, but no named-link management is introduced.

Verification:

- Run `npm test`.

### Task 3: Account/Plan Foundation

Add `src/planCapabilities.mjs`.

Behavior:

- Represent `guest`, `free`, `pro`, and `team`.
- Centralize Free limits for projects, audio files per project, View Links, and Edit Links.
- Gate owner link creation helpers by plan.

Verification:

- Run `npm test`.

### Task 4: Transition View Foundation

Add `src/transitionView.mjs` and wire `App.jsx` path rendering through it.

Behavior:

- Previous-to-current and current-to-next path contexts are modeled by a helper.
- Selected performer path emphasis is stronger.
- Path clutter can be reduced by a stage toggle.
- The same helper is usable in editor and shared review.

Verification:

- Run `npm test`.

### Task 5: Mobile Review And Editing Foundation

Polish mobile shared review and preserve touch-native drag.

Behavior:

- View Link mobile layout hides edit controls.
- Playback controls and formation identity stay reachable.
- Selected performer emphasis remains available in readonly mode.
- Editable modes expose touch drag through existing pointer handlers.

Verification:

- Run `npm test`.
- Run `npm run build`.
- Run `npm run test:browser`.

### Task 6: MVP Status Update

Update `MVP.md` so implemented foundations are listed in Current Implementation Status and remaining non-foundation work stays in Active Queue.

Verification:

- Re-read the changed `MVP.md` sections and check that completed details are not duplicated as active work.

### Task 7: Final Review

Review the full diff for:

- Accidental removal of legacy compatibility behavior.
- View Link edit control leakage.
- Over-broad account/billing scope.
- Mobile layout text overflow or desktop inspector compression.

Verification:

- Run `git diff --check`.
