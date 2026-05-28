# Movemap MVP Implementation Status

## Purpose

`SPEC.md` is the canonical product contract for Movemap. This file tracks implementation state, the active build queue, and a SPEC-aligned backlog.

`MVP.md` is not a second SPEC. It answers:

- what exists now
- what is incomplete
- what the next implementation slices are
- what is planned later
- what is explicitly out

The current MVP should prove this practical loop:

> Sign in, create a real project, load music, create and revise formations at the right moments, understand transitions, and share a clear review link.

Guest mode is demo-only. Durable creation, save, upload, share, and AI require login according to `SPEC.md`.

## Status Legend

- `Done`: Implemented and usable in the current app.
- `Needs tests`: Implemented, but targeted tests should lock behavior before related changes.
- `Partial`: Some behavior exists, but the MVP experience is incomplete.
- `Not started`: No meaningful implementation yet.
- `Backlog`: SPEC-aligned, but not in the active queue.
- `Future`: Platform direction, not current MVP work.
- `Out`: Explicitly excluded by SPEC.

## Current Implementation Status

### Music-Driven Formation Creation

Status: `Done` / `Needs tests`

Current evidence:

- `src/App.jsx` has `addSection()`.
- `addSection()` reads `audioRef.current.currentTime || currentTime`.
- New sections are created at the captured time.
- New sections copy positions from the previous section chosen by `findSectionIndex(sortedSections, time)`.
- The new section is selected with `setSelectedSectionId(section.id)`.

Remaining work:

- Add behavior tests so music-timed formation creation does not regress during timeline work.
- Document or test the duplicate-timestamp rule. Current behavior allows adding at the captured time and sorts sections by arrival time.

### Formation Timing Controls

Status: `Done` / `Needs tests`

Current evidence:

- `updateSectionTiming(sectionId, time, moveDuration)` updates `time`, `moveDuration`, `start`, and `end`.
- Selected formation controls expose arrival time, movement start, and movement duration.
- `movementTimingControls.test.mjs` covers key source-level expectations.

Remaining work:

- Add stronger behavior-level helper tests when timing logic is extracted.
- Keep arrival-time edits predictable after timeline UI changes.

### Formation Duplicate And Delete

Status: `Partial`

Current evidence:

- `duplicateSection()` exists.
- `deleteSection()` exists.
- Duplicate copies selected section data and partner set data when present.
- Delete refuses to remove the last remaining section.

Remaining work:

- Deletion currently selects the first remaining section; MVP should select a nearby previous or next section.
- Last-section behavior should be explicit in UI copy.
- Add tests for duplicate/delete selection behavior.

### Stage Editing

Status: `Partial`

Current evidence:

- Performer tokens can be dragged on the stage.
- Pair/partner behavior exists.
- Snap toggle exists.
- Undo/redo infrastructure exists through `updatePlan()`, `undoPlan()`, and `redoPlan()`.

Remaining work:

- Multi-select performer movement is not implemented.
- Role/part group selection is not implemented.
- Alignment tools are not implemented.
- Touch-native mobile stage editing is not implemented.

### Transition Path Readability

Status: `Partial`

Current evidence:

- `movementKeyframes.mjs` provides transition keyframe helpers.
- `svgPathForPerformer()` exists.
- Stage rendering shows previous-position ghosts and arrows.
- Export/review SVG rendering also includes previous-position ghosts and arrows.
- Selected performer dimming affects path opacity.

Remaining work:

- Add a show/hide movement path toggle.
- Make selected performer path emphasis clearer.
- Add path clutter handling for larger teams.
- Reuse the same transition readability model in shared review.
- Add long-distance movement warnings later.

### Timeline / Formation Rail

Status: `Partial`

Current evidence:

- `formation-rail` lists formation chips.
- Clicking a chip calls `jumpTo(section)`.
- Transport has play/pause, `대형 추가`, a range input, and time readout.
- Bottom timeline MVP work has begun in the app and tests.

Remaining work:

- Keep the CapCut-style bottom timeline as the main editing surface.
- Add or strengthen time ruler, playback head, and formation block behavior.
- Show formation blocks positioned by arrival time.
- Show audio track or waveform-like strip.
- Keep `+ Formation` near the timeline.
- Do not add a large desktop-style menu system.

### Sharing / View And Edit Links

Status: `Partial`

Current evidence:

- Share route is detected from `/share/:id`.
- `loadCloudProject()` loads shared projects.
- Current shared routes behave as review-only views.
- Editing actions are hidden in the current shared view.
- Share link creation saves through cloud persistence.
- JSON, PNG, and print/PDF fallback sharing exist.

SPEC-aligned target:

- View links allow no-login playback/review without editing.
- Edit links allow no-login editing for recipients.
- Project creation, project ownership, link creation, and link management require a signed-in owner.

Remaining work:

- Rename product language from generic share/read-only to View Link where applicable.
- Add an Edit Link model and route behavior.
- Add owner controls for creating/disabling Free links.
- Keep current review-only behavior honest until edit links are implemented.
- Improve shared mobile review playback and timeline clarity.

### Account, Plan, And Link Model

Status: `Not started`

SPEC target:

- Guest is demo-only.
- Free login supports real small projects and first share.
- Free includes 2-3 cloud projects, one audio file per project, one view link, one edit link, mobile full editing, basic 3D preview, basic templates, and limited AI.
- Pro adds higher limits, more storage, managed links, version snapshots, templates, export, and AI allowance.
- Team/Studio adds workspace, members, roles, shared libraries, comments, version history, and permissions.

Remaining work:

- Login is not implemented.
- Guest demo state is not implemented.
- Free project limits are not implemented.
- View/Edit link limits are not implemented.
- Billing is out of the current implementation slice.

### Mobile Experience

Status: `Partial`

Current evidence:

- The app is browser-accessible.
- Shared review routes can be opened on mobile browsers.
- Current mobile behavior is not yet a first-class editing surface.

SPEC-aligned target:

- Mobile becomes touch-native field editing, not a shrunken desktop UI.
- Mobile should eventually support stage editing, roster edits, timeline formation selection, timing changes, transition review, 3D preview, AI generation, and sharing.

Remaining work:

- Polish mobile review before full mobile editing.
- Add mobile stage drag foundation as an active slice.
- Keep high-density timeline and inspector controls redesigned for touch.

### App Packaging

Status: `Future`

Direction:

- Keep the app web-first.
- Keep shared review links browser-accessible.
- Isolate file, audio, share, authentication, and plan behavior behind small interfaces so they can be adapted for an app shell later.
- Avoid a full native rewrite until the editing model is stable.

## Current MVP Boundary

The current MVP focuses on:

- transition-first formation editing loop
- bottom timeline clarity
- formation management polish
- shared review clarity
- View/Edit link foundation
- account/plan model foundation
- mobile review and mobile stage-editing foundation

The current MVP does not try to complete:

- full mobile editor parity
- full billing
- full team workspace
- AI generation
- 3D Preview
- Stage Reference
- templates
- advanced exports

Those items can enter the Active Queue later when prerequisite data and interaction models are stable.

## Active Queue

The active queue prioritizes share/review correctness first, then transition clarity, then account/link foundation, then mobile editing. This keeps the first implementation wave tied to visible rehearsal value before expanding into AI, 3D, templates, or team operations.

Queue dependency rule:

- Each slice may introduce only the smallest shared helper needed for its acceptance criteria.
- Broader plan/account modeling stays in `Slice 4: Account/Plan Foundation`.
- If a slice discovers that a broader model change is required, pause and split that model work into its own slice before continuing.

Completion update rule:

- When a slice is completed, move its implemented behavior into `Current Implementation Status`.
- Keep only remaining follow-up work in `Active Queue` or `Planned Backlog`.
- Do not leave completed slice details in the active queue.

### Slice 1: View/Edit Link Separation

Goal:

- Align sharing with SPEC by separating review-only View Links from editable Edit Links.

User-visible behavior:

- A View Link opens playback/review without editing controls.
- An Edit Link opens an editable project for recipients with the link.
- Edit-link recipients may edit anonymously.
- Link creation and management remain owner actions.

Acceptance criteria:

- Existing shared routes are clearly treated as View Links.
- Editing controls remain hidden for View Links.
- Edit Link state can be represented in the project/link model.
- Owner-facing copy distinguishes View Link from Edit Link.
- Current behavior remains backward-compatible for existing share links.

Likely tests:

- View Link route hides edit actions.
- Edit Link route exposes edit actions when enabled.
- Link type is serialized/deserialized with project share metadata.

Out of scope:

- Billing.
- Team role permissions.
- Multiple named links.
- Link expiration.

### Slice 2: Mobile Review Polish

Goal:

- Make shared review usable on phone-sized screens before mobile full editing begins.

User-visible behavior:

- A performer can open a View Link on mobile and understand current formation, next formation, playback, and transition context.

Acceptance criteria:

- Mobile review layout does not expose editing controls.
- Playback controls remain reachable.
- Formation identity and timing remain readable.
- Performer focus or selected-performer emphasis works on small screens.
- Transition paths remain understandable enough for review.

Likely tests:

- Browser smoke test for shared route at mobile viewport.
- Assertion that edit controls are absent in View Link mode.

Out of scope:

- Mobile editing.
- Edit Link recipient flow.
- 3D Preview.

### Slice 3: Transition View Upgrade

Goal:

- Strengthen Movemap's transition-first differentiation in editor and review.

User-visible behavior:

- Users can see how performers move between formations, not only where formations end.

Acceptance criteria:

- Previous-to-current and current-to-next movement context is clear.
- Selected performer path emphasis is stronger.
- Path clutter can be reduced or toggled.
- Shared review uses the same transition readability model as the editor.

Likely tests:

- Unit tests for transition path selection/filtering helpers.
- Browser smoke coverage for path visibility in editor and shared review.

Out of scope:

- AI path optimization.
- Collision auto-fix.
- Curved path drawing.

### Slice 4: Account/Plan Foundation

Goal:

- Introduce the state model needed for Guest Demo, Free, Pro, and Team behavior without implementing billing.

User-visible behavior:

- Product copy and state distinguish demo use from signed-in project ownership.

Acceptance criteria:

- Guest is represented as demo-only state.
- Signed-in Free can be represented as owning real cloud projects.
- Free limits can be centralized for project count, audio, and link count.
- Pro/Team can be represented as plan states without billing.

Likely tests:

- Plan helper tests for Guest/Free/Pro/Team capability checks.
- Link capability tests for Free vs Pro owner actions.

Out of scope:

- Payment provider.
- Team member invitation.
- Detailed role matrix.

### Slice 5: Mobile Editing Foundation

Goal:

- Start mobile full editing with the smallest field-editing behavior: formation selection and performer drag.

User-visible behavior:

- On a phone, a signed-in owner or edit-link recipient can select a formation and move a performer.

Acceptance criteria:

- Touch drag updates performer position.
- Changes persist through the existing project update path.
- Undo remains available where the existing editor supports it.
- Mobile editing uses touch-native controls, not desktop inspector compression.

Likely tests:

- Browser/mobile viewport smoke for performer drag.
- Source-level test for route/mode gating if edit links are involved.

Out of scope:

- Full mobile timeline editing.
- Full roster management.
- AI generation.
- 3D Preview.

## Planned Backlog

### Stage Reference

Goal: Add background image and simple reference objects that support spacing and transitions.

Trigger to promote: stage coordinate and selection model is stable after transition/mobile editing slices.

Depends on: canonical stage settings and object selection behavior.

### 3D Preview

Goal: Let users inspect formations and transitions from multiple angles.

Trigger to promote: transition data and playback interpolation are stable.

Depends on: canonical stage coordinate model and performer label rendering.

### Templates

Goal: Let users create common formations quickly from local deterministic templates.

Trigger to promote: roster count and formation creation model are stable.

Depends on: formation creation, roster metadata, and preview/apply behavior.

### AI Single Formation

Goal: Generate one validated formation proposal from prompt, roster, and stage constraints.

Trigger to promote: deterministic templates and formation preview/apply are stable.

Depends on: schema validation, roster ids, stage bounds, and undo checkpoint behavior.

### Advanced Export

Goal: Support polished exports beyond JSON and basic image/PDF.

Trigger to promote: shared review and project presentation stabilize.

Depends on: view rendering and plan-tier capability checks.

## Future Platform

These remain aligned with SPEC but should not drive current MVP execution:

- Team Workspace
- Comments and Feedback
- Version History
- Team Templates
- Enterprise / School controls
- SSO
- branded exports
- detailed role matrix
- seat pricing

## Explicitly Out

These are excluded by SPEC unless a future SPEC update reopens them:

- cameras
- shot lists
- full production planning
- production inventory
- 3D editing
- 3D props
- realistic character models
- real-time multiplayer editing
- video motion capture
- complex permission matrix
- chat
- task management
- general project management

## Documentation Flow

- `SPEC.md` is canonical.
- `MVP.md` tracks implementation status, Active Queue, and SPEC-aligned backlog.
- `docs/superpowers/specs/2026-05-28-movemap-competitive-product-design.md` is the Sway/Formi reference research.
- `docs/superpowers/specs/2026-05-28-movemap-platform-strategy-notes.md` records strategy decisions that informed `SPEC.md`.

When product direction changes:

1. Update `SPEC.md`.
2. Update `MVP.md` only where implementation status, boundary, queue, or backlog changes.
3. Add or update dated strategy notes only when the reasoning needs to be preserved.
