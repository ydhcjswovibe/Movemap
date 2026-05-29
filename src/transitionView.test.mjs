import assert from "node:assert/strict";
import test from "node:test";

import {
  buildTransitionPaths,
  filterTransitionPerformers,
  longDistanceWarnings,
  movementDistance,
  overlapWarnings,
  transitionPathStyle
} from "./transitionView.mjs";

const performers = [
  { id: "a", name: "Ari", color: "#111", role: "lead" },
  { id: "b", color: "#222", role: "lead" },
  { id: "c", color: "#333", role: "back" }
];

const previous = {
  id: "previous",
  positions: {
    a: { x: 10, y: 10 },
    b: { x: 20, y: 20 },
    c: { x: 30, y: 30 }
  }
};

const current = {
  id: "current",
  positions: {
    a: { x: 20, y: 20 },
    b: { x: 20.2, y: 20.2 },
    c: { x: 40, y: 30 }
  }
};

const next = {
  id: "next",
  positions: {
    a: { x: 25, y: 25 },
    b: { x: 50, y: 20 },
    c: { x: 40, y: 30 }
  }
};

test("buildTransitionPaths returns previous and next movement context", () => {
  const paths = buildTransitionPaths({ performers, previousSection: previous, currentSection: current, nextSection: next });

  assert.deepEqual(paths.map((path) => `${path.context}:${path.performerId}`), [
    "previous:a",
    "previous:c",
    "next:a",
    "next:b"
  ]);
});

test("buildTransitionPaths can reduce clutter to the selected performer", () => {
  const paths = buildTransitionPaths({
    performers,
    previousSection: previous,
    currentSection: current,
    nextSection: next,
    selectedPerformerId: "a",
    reduceClutter: true
  });

  assert.deepEqual(paths.map((path) => `${path.context}:${path.performerId}`), ["previous:a", "next:a"]);
});

test("buildTransitionPaths can filter to a selected pair", () => {
  const paths = buildTransitionPaths({
    performers,
    previousSection: previous,
    currentSection: current,
    nextSection: next,
    filter: "selected-pair",
    selectedPair: ["a", "b"]
  });

  assert.deepEqual(paths.map((path) => `${path.context}:${path.performerId}`), [
    "previous:a",
    "next:a",
    "next:b"
  ]);
});

test("buildTransitionPaths can filter by performer role or group", () => {
  assert.deepEqual(
    filterTransitionPerformers({ performers, filter: "role", role: "lead" }).map((performer) => performer.id),
    ["a", "b"]
  );

  const paths = buildTransitionPaths({
    performers,
    previousSection: previous,
    currentSection: current,
    nextSection: next,
    filter: "role",
    role: "back"
  });

  assert.deepEqual(paths.map((path) => `${path.context}:${path.performerId}`), ["previous:c"]);
});

test("transitionPathStyle strongly emphasizes selected performers", () => {
  assert.deepEqual(transitionPathStyle({ performer: performers[0], selectedPerformerId: "a" }), {
    stroke: "#111",
    strokeWidth: 1.35,
    opacity: 0.92
  });
  assert.equal(transitionPathStyle({ performer: performers[1], selectedPerformerId: "a" }).opacity, 0.1);
  assert.equal(transitionPathStyle({ performer: performers[1], focusedPerformerIds: ["a", "b"] }).opacity, 0.92);
});

test("longDistanceWarnings flags large transition moves", () => {
  const paths = buildTransitionPaths({
    performers,
    previousSection: { positions: { a: { x: 0, y: 0 } } },
    currentSection: { positions: { a: { x: 80, y: 0 } } }
  });

  assert.equal(Math.round(movementDistance({ x: 0, y: 0 }, { x: 3, y: 4 })), 5);
  assert.deepEqual(longDistanceWarnings(paths, performers), [
    { performerId: "a", name: "Ari", context: "previous", distance: 80 }
  ]);
});

test("overlapWarnings flags endpoints closer than five stage units", () => {
  assert.deepEqual(overlapWarnings(current, performers), [
    { performerIds: ["a", "b"], names: ["Ari", "b"], distance: 0.3 }
  ]);

  assert.deepEqual(overlapWarnings({
    positions: {
      a: { x: 10, y: 10 },
      b: { x: 15, y: 10 }
    }
  }, performers), []);
});
