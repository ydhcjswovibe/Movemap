# Mobile Context Selection State

## Problem

Movemap uses `selectedSectionId` for the currently active formation and for timeline editing focus. On mobile, treating that value as proof that a formation block is explicitly selected makes the bottom action bar show formation actions during the default state.

## Context

The default mobile action bar should show global context entry points such as people, music, stage, and view. Formation actions should appear only after the user directly selects or touches a formation block. Person and multi-select actions should similarly be driven by performer selection state.

## Fix

Keep a separate mobile context selection state for formation-block selection. Use performer state first, then multi-select state, then the explicit mobile formation context to choose the bottom action group.

When a formation block is selected through pointer or click handlers, clear performer and pair selection and set the mobile context to formation. When selection is cleared or a non-context navigation action runs, reset that mobile context.

## Prevention

Do not infer mobile contextual bottom-bar state from `selectedSectionId` alone. It is a durable timeline/editing focus value, not a direct user-selection signal.

## References

- `src/App.jsx`
- `tests/browser/timeline-smoke.spec.mjs`
