# Stitch Mobile Editor Layout Contracts

## Problem

The Stitch main editor redesign needs to use the actual Stitch `Movemap Main Editor` dark toolbelt system first, then adapt Movemap's mobile interaction contracts at 390px.

During the redesign, two regressions appeared:

- The mobile action bar inherited the previous centered `translateX(-50%)` positioning and moved primary actions outside the viewport.
- The compact timeline rail used too few grid columns, causing controls to wrap and pushing the timeline behind the mobile action bar.
- A first interpretation pass used a light paper/grid theme even though the Stitch design system is dark: `#131313` base, `#201f1f` panels, `#2e62ff` selection, and `#05e777` playback.
- Timeline lane fixes that only adjusted `top`/`height` left the mobile Stitch shell vulnerable to legacy global timeline CSS. The workbench still inherited old grid columns, the ruler playhead inherited a green pseudo-element cap, and the audio waveform inherited absolute positioning.

## Fix

- Keep editor state markers presentation-only with `data-selection-state`, `data-timeline-state`, and `data-menu-state`.
- Start from the Stitch design tokens and visual hierarchy before making Movemap-specific concessions.
- On mobile portrait, force the bottom action bar to a fixed-width grid with `transform: none`.
- Keep the timeline control rail as one row with four columns: transport, time, zoom, and add.
- Cap the mobile timeline editor height so Forms and Audio lanes remain visible above the action bar.
- Preserve narrow page/stage padding so `.stage-frame` remains at least 378px wide at a 390px viewport.
- Model the mobile timeline as explicit `ruler`, `forms`, and `audio` track rows. Each row owns a label column and a track column; formation blocks keep only horizontal time positioning while vertical placement comes from row insets.
- In the mobile Stitch scope, reset legacy timeline details that can leak in from `styles.css`: `timeline-workbench` columns, `timeline-playhead::before`, and `.audio-waveform` absolute positioning.

## Prevention

When changing the mobile editor shell, run the browser visual state test and verify:

- `npm run test:browser`
- `test-results/stitch-editor-mobile-idle-390.png`
- `test-results/stitch-editor-mobile-timeline-390.png`
- `test-results/stitch-editor-mobile-formation-selected-390.png`
- `test-results/stitch-editor-mobile-token-selected-390.png`
- `test-results/stitch-editor-mobile-menu-390.png`
- `test-results/stitch-editor-mobile-mock-390.png`

The important geometry contracts are: no horizontal overflow at 390px, action bar inside the viewport, timeline ending above the action bar, stage frame width at or above 378px, transparent ruler strip without a green handle cap, visible formation block text, and an unclipped Audio row border/waveform.
