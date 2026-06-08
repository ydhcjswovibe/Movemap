# Editor v2 Stitch Design Contract

This contract defines how `/editor-v2` should look, feel, and be judged. It exists to prevent the rebuild from drifting into either a legacy Movemap reskin or a generic new editor design.

## Source of Truth

- The visual source of truth is the previous Stitch Movemap editor direction.
- "Stitch-like" means close reproduction of its dark tool surface, compact command density, stage-first hierarchy, timeline rail, contextual action rail, and bottom inspector behavior.
- Stitch is not loose inspiration. Do not reinterpret it into a marketing page, card dashboard, bright canvas editor, or unrelated premium redesign.
- Existing Movemap behavior remains the product truth. Stitch defines the UI direction, not a new data model.

## First-Viewport Contract

### Mobile 390px

At a 390px portrait viewport, the user must see a complete editing surface without horizontal overflow:

- Top utility/status bar
- Dark stage canvas
- Visible performer tokens
- Compact timeline rail
- Formation lane
- Audio lane or audio placeholder
- Contextual bottom action rail
- Temporary inspector/menu only when a relevant action opens it

The mobile screen should feel like a compact production tool. It should not feel like a landing page, an onboarding screen, or a simplified viewer.

### Desktop 1440px

At a 1440px desktop viewport, `/editor-v2` should feel like the Stitch editor adapted to desktop space:

- Stage remains the primary visual object.
- Timeline remains directly connected to the stage workflow.
- Top commands stay compact and utility-like.
- Bottom/contextual actions remain near the workflow.
- Extra desktop space should improve breathing room and scanability, not introduce a different desktop product.

Desktop v2 must not become the legacy desktop editor with dark colors applied. It must also not be the mobile shell blindly enlarged.

## Visual Hierarchy

1. Stage is primary.
2. Timeline is secondary but always workflow-visible.
3. Contextual actions are immediate and compact.
4. Inspector/menu surfaces are temporary or contextual.
5. Global actions are available but visually quiet.

Do not let menus, panels, cards, status popups, or explanatory text compete with the stage and timeline.

## Component Responsibilities

- `EditorV2Stage` owns only stage rendering and stage interaction affordances.
- `EditorV2Timeline` owns only timeline rendering and timeline interaction affordances.
- `EditorV2TopBar` owns project status and global utility commands.
- `EditorV2ActionRail` owns contextual commands.
- `EditorV2Inspector` owns contextual panel content.
- `editorV2Runtime` owns the contract between app state and v2 UI.

No renderer may own storage, auth, share-link, export, audio provider, or domain geometry logic.

## Required States

V2 must visibly support these editor states:

- Idle/default
- Formation selected
- Token selected
- Timeline manipulation
- Top action menu expanded
- Bottom inspector expanded
- Readonly review
- 2D stage view
- 3D stage view

Each state must be distinguishable without relying on explanatory text.

## Visual Metrics Rules

- Token visual size, selected rings, labels, grid points, and reference marks belong in visual metrics.
- Coordinates, bounds, collision, drag conversion, and stage dimensions belong in domain geometry.
- Changing token size must not change drag math, collision math, pair placement, or timeline behavior.
- Selected token rings must not render as filled blobs.
- Stage reference marks must not create unexplained white circles or artifacts.

## CSS Rules

- V2 CSS must be scoped under `.stitch-mobile-editor.editor-v2` or a future `.editor-v2`.
- Do not add new global selectors for v2.
- Do not rely on global `.token`, `.stage`, `.timeline-*`, `.mobile-*`, or legacy desktop selectors for new v2 behavior.
- Timeline CSS must not affect stage rendering.
- Stage CSS must not affect timeline rendering.
- Mobile CSS changes must be checked against desktop v2.
- Desktop CSS changes must be checked against 390px mobile.

## Acceptable Changes

- Adapting Stitch spacing for desktop while preserving the same hierarchy.
- Rebuilding Stitch visuals as React components and scoped CSS.
- Splitting large components into focused `EditorV2*` modules.
- Adding tests that enforce visual and behavioral contracts.
- Improving accessibility labels for compact icon controls.

## Unacceptable Changes

- Replacing Stitch direction with a new visual language.
- Adding a landing-page hero, decorative cards, or generic dashboard layout.
- Hiding timeline or audio lanes to make the layout appear cleaner.
- Moving new v2 UI work back into legacy `/`.
- Making `App.jsx` the permanent owner of v2 renderer details.
- Treating screenshots as sufficient when core workflows are missing.
- Promoting `/editor-v2` to `/` without parity tests and explicit user approval.

## Visual Review Checklist

Use this checklist for every meaningful v2 visual change:

- 390px mobile has no horizontal overflow.
- 390px mobile shows stage, timeline, formation lane, audio lane, and action rail.
- 1440px desktop renders the v2 Stitch shell, not `.desktop-editor`.
- Stage tokens are legible and not oversized.
- Selected token state is clear and not a filled artifact.
- Timeline ruler and playhead are clipped correctly.
- Formation block text remains readable.
- Audio lane remains visible.
- Top menus do not cover critical stage content unnecessarily.
- Bottom inspector does not permanently steal the primary stage/timeline workflow.
