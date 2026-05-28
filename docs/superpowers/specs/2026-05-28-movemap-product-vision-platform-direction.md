# Movemap Product Vision And Platform Direction

## Purpose

This is a product vision document, not an implementation plan.

It turns the Sway-based competitive analysis and the follow-up product decisions into the platform direction Movemap should grow toward. Concrete implementation slices should be planned separately.

The source comparison document is:

- `docs/superpowers/specs/2026-05-28-movemap-competitive-product-design.md`

This document is not a one-to-one Sway clone. Movemap should grow toward a larger team-capable product, but its center stays clear:

> Movemap is a music-timed formation and transition editor that helps choreography teams build, adjust, preview, and revise movement plans from desktop or phone.

## Product Direction

Movemap should be larger than a lightweight sketch tool, but smaller and more focused than a full production management platform.

The product should include enough breadth to support real rehearsal use:

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
- guest, free, pro, and team plan boundaries

The product should avoid expanding into unrelated production operations:

- camera planning
- shot lists
- full production management
- real-time multiplayer editing
- complex permission matrices
- video motion capture
- 3D editing
- chat, task management, or project management workflows

## Relationship To Sway

Movemap should learn from Sway without becoming a Sway clone.

What Movemap should borrow:

- roster structure
- formation timeline
- share workflow
- mobile workflow
- 3D preview
- templates
- AI-assisted formation ideas

What Movemap should do differently:

- prioritize transitions and movement timing over static formation layout
- make mobile a real editing surface, not only a review surface
- keep production scope lighter
- use demo-to-login onboarding instead of unrestricted guest production editing
- keep 2D formation and timeline data as the canonical model

What Movemap should not borrow:

- camera planning
- full production management
- complex permission matrices
- 3D editing
- workflow features that turn the product into project management software

## Strategic Differentiation

Movemap's primary differentiation is **transition-first formation planning**.

The product should be better than generic formation sketching tools at answering:

- where each performer starts
- where each performer arrives
- how long the move takes
- who travels too far
- how pairs and groups move together
- how the movement feels with music

Movemap's secondary differentiation is **mobile full editing**.

The product should not treat phones as review-only devices. A user should be able to make real rehearsal changes from a phone, including performer positions, formation order, roster metadata, timing, and sharing.

AI is a supporting differentiator, not the product identity. AI should help generate or vary formation ideas, but Movemap should still be valuable when AI is unavailable.

## Product Principles

1. Users should be able to feel the product before signup, but durable creation and sharing can require login.
2. Desktop and mobile are both first-class editing surfaces.
3. Mobile editing should be touch-native, not a shrunken desktop interface.
4. The canonical data is 2D formation and timeline data; 3D is a preview surface.
5. AI proposes, Movemap validates, and the user applies.
6. Paid value comes from scale, storage, management, AI usage, and team operations, not from blocking the core workflow.
7. Team features should be possible later without forcing account complexity into the first editing flow.

## Core Product Surfaces

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

Desktop should expose more information at once than mobile. It can use side panels, a bottom timeline, and inspector panels.

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
- move timing adjustments
- transition view
- 3D preview
- AI formation generation
- view and edit link sharing

Mobile should not be a shrunken desktop UI. It needs a touch-native structure:

- `Stage` tab for performer positioning
- `Timeline` tab for formation order, arrival, and movement timing
- `Roster` tab for cast metadata
- `Review` tab for playback, transition, and 3D
- bottom toolbar for select, add, duplicate, delete, undo, and share actions

Mobile can support nearly full editing, but high-density controls should be redesigned for touch.

## Data Model

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

The project should remain portable through JSON export and import.

### Roster / Cast

Roster is included as project metadata, not as account management.

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

Roster explicitly does not include:

- user accounts per dancer
- email invitations
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

The timeline should preserve the existing Movemap semantic rule:

> A formation's main time is its arrival time. Movement begins before arrival according to movement duration.

Timeline editing should support:

- drag formation block
- trim movement start or duration
- reorder formations
- snap to meaningful times
- scrub playback
- jump to formation
- preview transition

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

Stage Reference is included, but it is intentionally narrow. It is not a full production planning system.

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

### Share Links

Movemap should separate view and edit links.

#### View Link

A view link allows:

- opening without login
- playback
- 2D viewing
- 3D preview
- transition view
- performer-specific focus
- notes reading

A view link does not allow editing.

#### Edit Link

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

Team plans can later replace link-based editing with member roles.

Plan boundaries:

- Free can create one view link and one edit link per project.
- Pro can manage multiple links, regenerate links, revoke links, name links, and later set link expiration.
- Team can use member roles and workspace permissions instead of relying only on secret edit links.

## Feature Design

## 1. Formation Editing

Formation editing is the product core.

Required behavior:

- add formation
- duplicate formation
- delete formation
- rename formation
- reorder formation
- edit performer positions
- preserve paired movement behavior
- copy previous positions when creating a new formation
- support selection, drag, snap, and undo

Desktop should optimize for precision.

Mobile should optimize for quick rehearsal changes.

## 2. Transition View

Transition View is a core differentiator and should be included across editor, mobile, share, and 3D preview.

It should show:

- previous formation to current formation paths
- current formation to next formation paths
- performer movement lines
- pair or partner emphasis
- long-distance movement warnings
- interpolated playback positions

It should not initially include:

- AI path optimization
- collision auto-fix
- custom curved path drawing
- per-performer path editing

The first version can use straight-line interpolation between formation positions.

## 3. 3D Preview

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

Implementation should use the existing 2D formation data and map stage coordinates to a 3D ground plane.

Basic 3D Preview should be available in Free. It is part of helping users understand movement, not the primary Pro paywall.

## 4. Mobile Full Editing

Mobile editing should be close to full feature parity, but with a purpose-built touch interface.

Initial mobile editing should include:

- create and open project
- save project
- playback
- scrub
- add, duplicate, delete, and select formations
- drag performer positions
- add and remove performers
- edit performer name, label, color, group, and partner
- edit formation name and notes
- timeline formation block selection
- movement timing controls
- transition view
- 3D preview
- share view and edit links
- AI generation

Mobile UX constraints:

- avoid tiny desktop controls
- use mode tabs
- keep selected object actions in a bottom sheet or toolbar
- make destructive actions confirmable
- keep timeline edits coarse but reliable

## 5. Templates

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

Later expansion:

- save current formation as personal template
- team templates
- tag templates by style, count, and stage shape

## 6. AI Formation Generation

AI formation generation is included, but it must be bounded.

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

Example proposal shape:

```json
{
  "formationName": "Wide V",
  "notes": "Front-centered V formation with balanced left and right sides.",
  "positions": [
    {
      "performerId": "p1",
      "x": 0,
      "y": -4
    }
  ]
}
```

Validation rules:

- every performer id must exist in the roster
- no unknown performer ids
- required performers must have positions
- coordinates must be finite numbers
- positions must fit stage bounds after optional clamping
- proposal must not mutate the current formation until applied

AI should be positioned as an idea assistant, not the main product.

The core editor must remain useful without AI. Movemap should not depend on a free third-party AI API for its primary workflow. Free or low-cost AI providers can be used for experimentation, but production behavior should assume that AI may be rate-limited, unavailable, expensive, or lower quality than expected.

## 7. Stage Reference

Stage Reference is included as a practical support layer.

Stage Reference should never compete with performer movement as the primary editing object. It exists only to make positions, spacing, and transitions easier to understand.

It should help users mark:

- room boundaries
- stage background
- props
- center line
- entry points
- spacing references
- text labels

It should not become a production planning module.

## 8. Export

Export is useful but should not block the core editor experience.

Supported early exports:

- JSON export and import
- basic image export
- basic PDF export when feasible

Pro-level exports can include:

- dancer-specific PDF
- full formation packet
- higher-resolution image
- branded export

## Account, Storage, And Pricing

Pricing should be based on scale and management needs.

Do not block the first useful product experience. Durable project creation, saving, uploading, sharing, and AI can require login.

### Guest

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

Do not define exact seat pricing, workspace limits, or a detailed role matrix in this vision document. Those should be set after usage patterns are clearer.

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

## Explicit Exclusions

These are excluded from the detailed product direction unless a later strategy decision reopens them:

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

## Strategic Sequencing

This is a sequencing guide, not an implementation plan. Each phase should still be turned into a separate implementation plan before code changes begin.

### Phase 1. Data Model And Editor Core

- formalize roster metadata
- formalize formation and timeline data
- keep arrival-time movement semantics
- improve formation add, duplicate, delete, reorder, and position editing
- preserve JSON export/import

### Phase 2. Timeline And Transition

- strengthen bottom timeline controls
- expose movement duration and arrival clearly
- add transition view
- add long-distance movement warnings
- connect transition view to playback

### Phase 3. Mobile Full Editing

- design mobile editor IA
- add mobile stage editing
- add mobile roster editing
- add mobile timeline editing
- support view/edit links on mobile

### Phase 4. Stage Reference And Templates

- add background image
- add simple stage reference objects
- add local deterministic templates
- add template preview and apply

### Phase 5. 3D Preview

- add read-only 3D preview
- map 2D stage coordinates to a 3D plane
- show performers, labels, grid, and boundary
- support transition playback
- include in share links

### Phase 6. AI Single Formation

- add prompt UI
- call AI generation endpoint
- require JSON schema response
- validate and preview proposal
- apply as new formation by default

### Phase 7. Cloud, Links, And Plans

- keep local-first editing
- require cloud save for share links
- add view link and edit link separation
- add guest/free/pro/team state model
- add project, storage, link, and AI usage limits

### Phase 8. Team Operations

- add team workspace
- add member roles
- add team templates
- add comments and feedback
- add version history

## Open Product Risks

### Mobile Complexity

Mobile full editing is strategically valuable but hard to design well. It should not reuse desktop layout directly.

Mitigation:

- design mobile as separate IA
- implement one editing mode at a time
- test on real phone screens

### AI Reliability

AI formation generation can produce invalid or low-quality output.

Mitigation:

- require schema validation
- preview before apply
- keep deterministic templates
- make AI optional
- avoid making free third-party AI availability a product dependency
- preserve the full editor and template workflow when AI is disabled

### Scope Expansion

Stage Reference, 3D, AI, and Team features can expand too far.

Mitigation:

- keep explicit exclusions
- treat 2D formation and timeline as canonical
- avoid production management features

### Pricing Too Early

Paywalls can damage adoption if they block the first useful project.

Mitigation:

- free users must be able to create and share a real project
- paid value should come from scale, storage, management, and team operations

## Success Criteria

This vision is successful if:

- users understand Movemap as a movement and transition editor, not just a formation drawing app
- users believe rehearsal changes can be made from a phone without returning to a desktop
- free users can experience a real saved project and share flow after login
- Pro conversion comes from repeated project creation, AI usage, storage, export, and link management
- Team conversion comes from multi-person operations, shared libraries, version history, comments, and permissions

The product direction is successful if Movemap can support these core stories:

Demo flow:

1. A user opens Movemap without friction.
2. They try a guided sample project without login.
3. They drag performers, play the timeline, inspect transitions, and open 3D Preview.
4. When they try to save, upload music, create a project, share, or generate with AI, Movemap asks them to sign in.

Signed-in free flow:

1. A user signs in and creates a real project.
2. They create or import a roster.
3. They upload music.
4. They create formations.
5. They adjust arrival and movement timing.
6. They preview transitions in 2D and 3D.
7. They make field changes on mobile.
8. They share a view link with dancers.
9. They share an edit link with collaborators when needed.
10. They can keep using the product for more projects, larger storage, AI generation, and team operations when they upgrade.
