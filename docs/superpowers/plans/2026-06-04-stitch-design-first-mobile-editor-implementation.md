# Stitch Design-First Mobile Editor Implementation

## Summary

Build a new mobile-only Stitch editor shell, then adapt existing Movemap state and handlers into it. Do not keep layering more mobile CSS over the legacy editor as the main strategy.

## Implementation Steps

1. Reset the failed polish layer by restoring only `src/styles.css`; preserve `.gitignore`.
2. Add a new `StitchMobileEditor` component with a `data-stitch-mobile-editor` root.
3. Add a `StitchMobileEditorMock` route at `/stitch-mobile-mock` for design verification without editor state.
4. Wire the real shell from `App.jsx` using a thin `stitchEditorModel` and existing handlers.
5. Keep the old desktop editor for desktop/tablet, but let the new shell own mobile portrait.
6. Namespace new styles under `.stitch-mobile-editor` and keep compatibility selectors used by browser tests.
7. Update browser tests to prefer the new root while retaining existing behavior checks.

## Verification

- `npm test`
- `npm run build`
- `npm run test:browser`
- Inspect these generated screenshots:
  - `test-results/stitch-editor-mobile-idle-390.png`
  - `test-results/stitch-editor-mobile-formation-selected-390.png`
  - `test-results/stitch-editor-mobile-token-selected-390.png`
  - `test-results/stitch-editor-mobile-menu-390.png`

## Notes

Stitch MCP access was unavailable during this implementation pass due to invalid authentication. The implementation uses the fixed Stitch tokens and slot structure from the approved reset-safe plan; a later fidelity pass should re-measure the real Stitch screens once access is restored.
