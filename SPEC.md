# Movemap Product Spec

## Document Role

`SPEC.md` is the canonical product contract for Movemap.

It defines the stable product direction, feature boundaries, data model expectations, account and sharing policy, and success criteria. Dated design documents under `docs/superpowers/specs/` are supporting research and strategy notes. `MVP.md` defines current implementation status and near-term slices.

If `SPEC.md` conflicts with a dated strategy or research document, `SPEC.md` wins unless this file explicitly delegates that topic.

Reference documents:

- `docs/superpowers/specs/2026-05-28-movemap-competitive-product-design.md`
- `docs/superpowers/specs/2026-05-28-movemap-platform-strategy-notes.md`
- `MVP.md`

## Product Definition

Movemap is a music-timed formation and transition editor that helps choreography teams build, adjust, preview, and revise movement plans from desktop or phone.

The product should not be a broad production management suite. Its center is:

- people
- formations
- movement between formations
- music timing
- rehearsal-friendly sharing
- mobile field editing

The core promise is:

- choreographers can create and revise formations quickly while listening to music
- performers and collaborators can understand positions and transitions from a shared link
- rehearsal changes can be made from a phone without returning to a desktop

## Relationship To Sway

Movemap should learn from Sway without becoming a Sway clone.

Movemap should borrow:

- roster structure
- formation timeline
- share workflow
- mobile workflow
- 3D preview
- templates
- AI-assisted formation ideas

Movemap should differ by:

- prioritizing transitions and movement timing over static formation layout
- making mobile a real editing surface, not only a review surface
- keeping production scope lighter
- using demo-to-login onboarding instead of unrestricted guest production editing
- keeping 2D formation and timeline data as the canonical model

Movemap should not borrow:

- camera planning
- full production management
- complex permission matrices
- 3D editing
- workflow features that turn the product into project management software

## Strategic Differentiation

Movemap's primary differentiation is transition-first formation planning.

The product should be better than generic formation sketching tools at answering:

- where each performer starts
- where each performer arrives
- how long the move takes
- who travels too far
- how pairs and groups move together
- how the movement feels with music

Movemap's secondary differentiation is mobile full editing.

The product should not treat phones as review-only devices. A user should be able to make real rehearsal changes from a phone, including performer positions, formation order, roster metadata, timing, and sharing.

AI is a supporting differentiator, not the product identity. AI should help generate or vary formation ideas, but Movemap should still be valuable when AI is unavailable.

## Target Users

Primary users:

- choreographers
- dance instructors
- team captains
- small performance team organizers

Secondary users:

- performers reviewing their positions
- assistants revising formations during rehearsal
- studios or classes managing recurring projects

Primary usage contexts:

- choreography creation
- rehearsal planning
- formation revision
- team review
- class or studio preparation
- performance preparation

## Product Principles

1. Users should be able to feel the product before signup, but durable creation and sharing can require login.
2. Desktop and mobile are both first-class editing surfaces.
3. Mobile editing should be touch-native, not a shrunken desktop interface.
4. The canonical data is 2D formation and timeline data; 3D is a preview surface.
5. AI proposes, Movemap validates, and the user applies.
6. Paid value comes from scale, storage, management, AI usage, and team operations, not from blocking the core workflow.
7. Team features should be possible later without forcing account complexity into the first editing flow.
8. Stage reference objects support movement understanding; they should not compete with performer movement as the primary editing object.

## Core Workflows

### Demo Flow

1. A user opens Movemap without login.
2. The user tries a guided sample project.
3. The user drags performers, plays the timeline, inspects transitions, and opens 3D Preview.
4. When the user tries to save, upload music, create a real project, share, or generate with AI, Movemap asks them to sign in.

### Signed-In Creation Flow

1. The user signs in.
2. The user creates a real project.
3. The user creates or imports a roster.
4. The user uploads music.
5. The user creates formations at music-timed moments.
6. New formations default to copied positions from a nearby or previous formation.
7. The user edits only changed performers or groups.
8. The user adjusts arrival and movement timing.
9. The user previews transitions in 2D and 3D.
10. The user shares a view link with performers.
11. The user shares an edit link with collaborators when needed.

### Rehearsal Mobile Editing Flow

1. A user opens a project on a phone.
2. The user plays or scrubs the music.
3. The user selects a formation.
4. The user drags performers or adjusts roster metadata.
5. The user checks the transition view.
6. The user saves changes.
7. The user shares or refreshes the review link.

### Review Flow

1. A performer opens a view link without login.
2. The performer plays the project.
3. The performer focuses on their own marker or part.
4. The performer checks formation notes and transitions.
5. The performer can use 2D or 3D preview, but cannot edit.

## Product Surfaces

### Desktop Editor

Desktop is the precision editing surface.

It should support:

- stage canvas editing
- roster and performer metadata management
- formation creation, duplication, deletion, and reorder
- timeline and segment editing
- music upload and playback
- transition view
- stage reference editing
- AI formation generation
- template browsing and saving
- share link creation
- 3D preview

Desktop may expose more information at once than mobile. It can use side panels, a bottom timeline, and inspector panels.

### Mobile Editor

Mobile is not review-only. It is a first-class field editing surface for rehearsal.

It should support:

- opening and saving projects
- music playback and scrubbing
- formation creation, duplication, deletion, and selection
- performer drag editing
- performer add, remove, and metadata edits
- roster editing
- partner and group metadata edits
- snap and grid controls
- timeline formation block selection
- movement timing adjustments
- transition view
- 3D preview
- AI formation generation
- view and edit link sharing

Mobile should not reuse a shrunken desktop layout. It should use touch-native structure such as:

- `Stage` tab for performer positioning
- `Timeline` tab for formation order, arrival, and movement timing
- `Roster` tab for cast metadata
- `Review` tab for playback, transition, and 3D
- bottom toolbar for select, add, duplicate, delete, undo, and share actions

High-density controls should be redesigned for touch.

### Shared Review

Shared review should explain choreography without exposing editing complexity.

View links should support:

- no-login opening
- playback
- 2D viewing
- 3D preview
- transition view
- performer-specific focus
- formation notes
- stage reference visibility

View links should not allow editing.

## Canonical Data Model

### Project

A project contains:

- id
- title
- owner metadata when signed in
- plan state
- roster
- formations
- timeline settings
- audio metadata
- stage settings
- stage references
- templates used or saved
- share links
- version snapshots when enabled

Projects should remain portable through JSON export and import where the plan allows export.

### Roster / Cast

Roster is project metadata, not account management.

Each performer should support:

- id
- name
- short label
- color
- shape or icon
- part or group
- partner or pair reference
- optional notes

Roster powers:

- canvas identification
- performer search
- selection highlighting
- pair movement handling
- mobile "find my position"
- review filtering
- AI formation generation constraints

Roster does not include:

- user accounts per performer
- email invitations per performer
- attendance state
- chat
- notification preferences

### Formation

A formation contains:

- id
- name
- arrival time
- movement duration or move start
- performer positions
- notes
- optional formation color
- optional partner set reference

Formation editing should include:

- create
- duplicate
- delete
- rename
- reorder
- edit positions
- copy positions from previous formation
- create from AI proposal
- create from template

### Timeline

The timeline is central to Movemap.

It should model:

- audio duration
- formation arrival times
- movement durations
- formation blocks
- audio row
- snap behavior
- selected formation
- playback position

The timeline should preserve this semantic rule:

> A formation's main time is its arrival time. Movement begins before arrival according to movement duration.

Timeline editing should support:

- drag formation block
- trim movement start or duration
- reorder formations
- snap to meaningful times
- scrub playback
- jump to formation
- preview transition

The timeline should feel closer to a focused video editor than a form-based planner.

### Stage Settings

Stage settings should include:

- width
- height
- grid visibility
- snap mode
- divisions
- subdivisions
- background image

### Stage Reference

Stage Reference is a support layer for positions, spacing, and transitions. It is not a production planning system.

Supported reference objects:

- background image
- rectangle
- circle
- line
- label
- simple prop marker

Each reference object should support:

- position
- size
- rotation where applicable
- color
- opacity
- label
- locked state
- hidden state

Stage Reference should be visible in editor, mobile editor, review links, and exports where applicable.

Stage Reference explicitly excludes:

- cameras
- shot lists
- filming setup
- production item inventory
- stage machinery management
- 3D prop modeling

## Feature Boundaries

### Included

Movemap should include:

- formation editing
- roster and cast metadata
- music-timed timeline editing
- transition visualization
- mobile full editing
- share and edit links
- stage reference layers
- 3D preview
- templates
- AI single-formation generation
- guest demo, free, pro, team, and enterprise plan boundaries

### Explicit Exclusions

These are excluded unless a later SPEC update reopens them:

- camera planning
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

## Feature Policies

### Formation Editing

Formation editing is the product core.

Required behavior:

- `+ Formation` creates a formation at the current music time when invoked during playback or scrub.
- New formations should default to copied positions from a nearby or previous formation.
- The newly created formation should become selected immediately.
- Formation blocks should be editable on the timeline.
- Users should be able to move, duplicate, delete, and retime formations quickly.
- Performer editing should support fast group changes, not only one-by-one adjustments.
- Paired movement behavior should be preserved.
- Selection, drag, snap, and undo should be supported.

### Transition View

Transition View is a core differentiator.

It should show:

- previous formation to current formation paths
- current formation to next formation paths
- performer movement lines
- pair or partner emphasis
- long-distance movement warnings
- interpolated playback positions

Transition View should work in:

- desktop editor
- mobile editor
- shared review
- 3D preview

Initial transition visualization can use straight-line interpolation between formation positions.

Transition View should not initially include:

- AI path optimization
- collision auto-fix
- custom curved path drawing
- per-performer path editing

### 3D Preview

3D Preview is included as a lightweight viewer, not as a 3D editor.

It should support:

- `2D / 3D` view switching
- floor plane
- stage boundary
- grid
- performer markers
- performer labels
- camera rotate and zoom
- current formation view
- transition playback interpolation
- availability in share links

3D Preview should not support:

- direct 3D editing
- 3D-only data
- 3D props
- realistic character models
- advanced lighting
- camera planning

Implementation should use existing 2D formation data and map stage coordinates to a 3D ground plane.

Basic 3D Preview should be available in Free. It helps users understand movement and should not be the primary Pro paywall.

### Templates

Templates are included.

Initial templates should be local and deterministic:

- line
- two lines
- V
- inverted V
- circle
- diagonal
- block
- pairs

Templates should adapt to roster count.

Template actions:

- create as new formation
- replace current formation
- preview before applying

Later expansion can include:

- save current formation as personal template
- team templates
- tags by style, count, and stage shape

### AI Formation Generation

AI formation generation is included, but bounded.

Initial scope:

- single formation generation only
- prompt input
- use current roster count
- use current stage size
- use current snap/grid constraints when available
- return JSON proposal
- validate JSON schema
- clamp or reject out-of-bounds positions
- preview before apply
- default action is `Create as new formation`
- secondary action is `Replace current formation`
- preserve undo checkpoint before apply

Initial scope explicitly excludes:

- full sequence generation
- transition generation
- automatic movement optimization
- direct overwrite without confirmation

Validation rules:

- every performer id must exist in the roster
- no unknown performer ids
- required performers must have positions
- coordinates must be finite numbers
- positions must fit stage bounds after optional clamping
- proposal must not mutate the current formation until applied

AI should be positioned as an idea assistant, not the main product.

The core editor must remain useful without AI. Movemap should not depend on a free third-party AI API for its primary workflow. Free or low-cost AI providers can be used for experimentation, but production behavior should assume that AI may be rate-limited, unavailable, expensive, or lower quality than expected.

### Export

Export is useful but should not block the core editor experience.

Supported early exports:

- JSON export and import
- basic image export
- basic PDF export when feasible

Pro-level exports can include:

- performer-specific PDF
- full formation packet
- higher-resolution image
- branded export

## Account, Storage, Sharing, And Pricing

Pricing should be based on scale and management needs.

Durable project creation, saving, uploading, sharing, and AI can require login.

### Guest Demo

Goal:

- let users understand Movemap immediately through a guided demo

Included:

- no login
- sample project
- guided interaction
- basic formation drag demo
- music timeline
- transition view
- limited mobile demo
- limited 3D preview demo

Limits:

- no new project creation
- no save
- no audio upload
- no share links
- no AI generation
- no JSON export or import
- no durable cloud sync
- no team workspace

Guest is a demo mode, not a production editing mode. Users should be prompted to sign in when they want to save, create a real project, upload music, share, or generate with AI.

### Free

Goal:

- allow a real small project and first share

Included:

- login
- 2-3 cloud projects
- one audio file per project
- one view link per project
- one edit link per project
- mobile full editing
- roster
- stage reference
- basic 3D preview
- basic templates
- low monthly AI generation allowance
- basic export

Limits:

- limited project count
- limited storage
- limited AI usage
- no advanced link management
- no team workspace
- no version history beyond basic undo/autosave

### Pro / Individual

Goal:

- monetize individual choreographers, instructors, and creators who make many projects

Included:

- increased project count
- increased audio storage
- higher AI generation allowance
- personal templates
- version snapshots
- advanced export
- multiple managed share links
- view and edit link regeneration and revocation
- link names and later link expiration
- larger roster, formation, and audio limits

### Team / Studio

Goal:

- monetize organized teams, studios, classes, and recurring rehearsal operations

Included:

- team workspace
- member invites
- roles: owner, editor, viewer
- team project library
- team templates
- comments and feedback
- version history
- share permission management
- class or team folders
- team storage

Do not define exact seat pricing, workspace limits, or a detailed role matrix in this SPEC until usage patterns are clearer.

### Enterprise / School

Goal:

- keep future institutional use possible without designing it now

Candidate features:

- larger workspaces
- admin controls
- custom branding
- SSO
- audit history
- dedicated support
- custom storage or contract terms

## Share Link Policy

Movemap separates view and edit links.

### View Link

A view link allows:

- opening without login
- playback
- 2D viewing
- 3D preview
- transition view
- performer-specific focus
- notes reading

A view link does not allow editing.

### Edit Link

An edit link allows:

- opening without login
- desktop editing
- mobile editing
- roster edits
- formation edits
- timeline edits
- stage reference edits
- saving changes

Edit links should show a clear warning that anyone with the link can modify the project.

Edit-link recipients may edit anonymously. Project creation, project ownership, link creation, and link management require a signed-in owner.

Owner link actions depend on plan level.

Free owners should be able to:

- create one view link
- create one edit link
- disable link access for the project

Pro owners should be able to:

- create edit links
- revoke edit links
- regenerate edit links
- name links
- set link expiration later
- create view links
- revoke view links

Team plans can use member roles and workspace permissions instead of relying only on secret edit links.

## Success Criteria

This SPEC is successful if:

- users understand Movemap as a movement and transition editor, not just a formation drawing app
- users believe rehearsal changes can be made from a phone without returning to a desktop
- free users can experience a real saved project and share flow after login
- Pro conversion comes from repeated project creation, AI usage, storage, export, and link management
- Team conversion comes from multi-person operations, shared libraries, version history, comments, and permissions

The product direction is successful if Movemap can support these core stories:

Demo flow:

1. A user opens Movemap without friction.
2. The user tries a guided sample project without login.
3. The user drags performers, plays the timeline, inspects transitions, and opens 3D Preview.
4. When the user tries to save, upload music, create a project, share, or generate with AI, Movemap asks them to sign in.

Signed-in free flow:

1. A user signs in and creates a real project.
2. The user creates or imports a roster.
3. The user uploads music.
4. The user creates formations.
5. The user adjusts arrival and movement timing.
6. The user previews transitions in 2D and 3D.
7. The user makes field changes on mobile.
8. The user shares a view link with performers.
9. The user shares an edit link with collaborators when needed.
10. The user can keep using the product for more projects, larger storage, AI generation, and team operations when they upgrade.
