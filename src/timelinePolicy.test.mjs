import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildTimelineTicks,
  buildWaveformBars,
  calculateAnchoredZoomScrollX,
  calculateTimelineMaxScrollX,
  applyFormationTimelineEdit,
  applyMovementKeyframePositionPatch,
  clampFormationSpan,
  clampFormationTiming,
  clampValue,
  formationTimelineBlock,
  formationTimelinePixels,
  formationTimelineLabel,
  movementTimelineLabel,
  layoutFormationBlocks,
  layoutTimelineVisualSegments,
  movementKeyframeTime,
  movementKeyframePositions,
  normalizeWheelDelta,
  normalizeMovementKeyframes,
  pixelsToTime,
  pointMoveStart,
  quantizeTimelineTime,
  reorderFormationSegments,
  resolveFormationBodyDrag,
  resolveFormationPointDrop,
  resolveFormationAddTarget,
  resolveFormationReorderIndex,
  snapFormationTime,
  timeToPixels,
  timeToPercent,
  trimFormationSegment
} from "./timelinePolicy.mjs";

const timelinePolicySource = readFileSync(new URL("./timelinePolicy.mjs", import.meta.url), "utf8");
const appSource = readFileSync(new URL("./App.jsx", import.meta.url), "utf8");

test("quantizeTimelineTime rounds timeline edits to tenths without floating point drift", () => {
  assert.equal(quantizeTimelineTime(1.04), 1);
  assert.equal(quantizeTimelineTime(1.05), 1.1);
  assert.equal(quantizeTimelineTime(1.149999999), 1.1);
  assert.equal(quantizeTimelineTime(1.150000001), 1.2);
  assert.equal(quantizeTimelineTime(-0.04), 0);
});

test("timelinePolicy remains the public barrel for split timeline modules", () => {
  assert.doesNotMatch(timelinePolicySource, /export function /);
  assert.doesNotMatch(timelinePolicySource, /^function /m);
  assert.match(timelinePolicySource, /from "\.\/timelineCore\.mjs"/);
  assert.match(timelinePolicySource, /from "\.\/formationTimeline\.mjs"/);
  assert.match(timelinePolicySource, /from "\.\/formationTimelineEdit\.mjs"/);
  assert.match(timelinePolicySource, /from "\.\/movementKeyframes\.mjs"/);
  assert.match(timelinePolicySource, /from "\.\/waveformPolicy\.mjs"/);
  assert.match(appSource, /from "\.\/timelinePolicy\.mjs"/);
});

test("timeToPercent converts and clamps timeline values", () => {
  assert.equal(timeToPercent(5, 10), 50);
  assert.equal(timeToPercent(-5, 10), 0);
  assert.equal(timeToPercent(15, 10), 100);
  assert.equal(timeToPercent(5, 0), 0);
});

test("clampValue handles reversed ranges without leaking past the boundary", () => {
  assert.equal(clampValue(-5, 0, 10), 0);
  assert.equal(clampValue(15, 0, 10), 10);
  assert.equal(clampValue(4, 10, 0), 4);
  assert.equal(clampValue(-5, 10, 0), 0);
});

test("clampFormationSpan keeps front and end edges inside neighboring boundaries", () => {
  assert.deepEqual(
    clampFormationSpan({ start: -4, duration: 3, minStart: 0, maxEnd: 10 }),
    { start: 0, end: 3, duration: 3 }
  );
  assert.deepEqual(
    clampFormationSpan({ start: 9, duration: 3, minStart: 0, maxEnd: 10 }),
    { start: 7, end: 10, duration: 3 }
  );
  assert.deepEqual(
    clampFormationSpan({ start: 4, duration: 20, minStart: 2, maxEnd: 8 }),
    { start: 2, end: 8, duration: 6 }
  );
});

test("formationTimelineLabel returns compact formation labels", () => {
  assert.equal(formationTimelineLabel(0), "F1");
});

test("movementTimelineLabel returns compact move labels", () => {
  assert.equal(movementTimelineLabel(0), "M1");
});

test("layoutTimelineVisualSegments labels formations and moves separately with durations", () => {
  const sections = [
    { id: "intro", time: 4, start: 0, end: 4, moveDuration: 4, name: "대형" },
    { id: "b", time: 12, start: 8, end: 12, moveDuration: 4, name: "대형" },
    { id: "c", time: 20, start: 16, end: 20, moveDuration: 4, name: "대형" }
  ];

  const segments = layoutTimelineVisualSegments(sections, 10);

  assert.deepEqual(
    segments.map((segment) => ({
      kind: segment.kind,
      label: segment.label,
      duration: segment.durationSeconds
    })),
    [
      { kind: "hold", label: "F1", duration: 8 },
      { kind: "move", label: "M1", duration: 4 },
      { kind: "hold", label: "F2", duration: 4 },
      { kind: "move", label: "M2", duration: 4 },
      { kind: "hold", label: "F3", duration: 4 }
    ]
  );
});

test("formationTimelineBlock renders F1 as a marker and F2+ as movement segments", () => {
  const first = formationTimelineBlock({ time: 4, moveDuration: 2 }, 0, 20);
  const second = formationTimelineBlock({ time: 12, moveDuration: 4 }, 1, 20);

  assert.equal(first.isMarker, true);
  assert.equal(first.leftPercent, 0);
  assert.equal(first.widthPercent, 0);
  assert.equal(second.isMarker, false);
  assert.equal(second.leftPercent, 40);
  assert.equal(second.arrivalPercent, 60);
  assert.equal(second.widthPercent, 20);
});

test("formationTimelinePixels maps movement segments to px/sec geometry", () => {
  const first = formationTimelinePixels({ time: 4, moveDuration: 2 }, 0, 20);
  const second = formationTimelinePixels({ time: 12, moveDuration: 4 }, 1, 20);

  assert.equal(first.isMarker, true);
  assert.equal(first.leftPx, 0);
  assert.equal(first.widthPx, 0);
  assert.equal(second.isMarker, false);
  assert.equal(second.leftPx, 160);
  assert.equal(second.arrivalPx, 240);
  assert.equal(second.widthPx, 80);
});

test("pixel timeline helpers preserve anchored zoom and wheel normalization", () => {
  assert.equal(timeToPixels(4, 25), 100);
  assert.equal(pixelsToTime(100, 25), 4);
  assert.equal(calculateTimelineMaxScrollX(20, 30, 240), 360);
  assert.equal(normalizeWheelDelta(2, 1), 32);

  const scrollX = calculateAnchoredZoomScrollX({
    scrollX: 100,
    cursorViewportX: 80,
    currentZoom: 20,
    nextZoom: 40,
    timelineDuration: 20,
    viewportWidth: 240
  });
  assert.equal(scrollX, 280);
});

test("snapFormationTime prefers nearby formation boundaries before playhead and grid", () => {
  const sections = [
    { id: "a", time: 0 },
    { id: "b", time: 8, moveDuration: 2 },
    { id: "c", time: 16, moveDuration: 4 }
  ];

  assert.deepEqual(
    snapFormationTime(7.9, { sections, sectionId: "c", playheadTime: 7.5, gridSize: 0.5, minTime: 0, maxTime: 20, threshold: 0.2 }),
    { time: 8, snapped: true, snapPoint: { time: 8, type: "formation-arrival" } }
  );
  assert.deepEqual(
    snapFormationTime(9.74, { sections, sectionId: "b", playheadTime: 9.75, gridSize: 0.5, minTime: 0, maxTime: 20, threshold: 0.2 }),
    { time: 9.8, snapped: true, snapPoint: { time: 9.8, type: "playhead" } }
  );
  assert.equal(
    snapFormationTime(9.74, { sections, sectionId: "b", playheadTime: 4, gridSize: 0.1, minTime: 0, maxTime: 20, threshold: 0.3 }).time,
    9.7
  );
});

test("clampFormationTiming prevents negative starts and adjacent formation overlap", () => {
  const sections = [
    { id: "a", time: 0, moveDuration: 0 },
    { id: "b", time: 8, moveDuration: 2 },
    { id: "c", time: 14, moveDuration: 3 }
  ];

  assert.deepEqual(
    clampFormationTiming({ sections, sectionId: "b", time: 20, moveDuration: 2, timelineMax: 30 }),
    { time: 11, moveDuration: 2, start: 9, end: 11 }
  );
  assert.deepEqual(
    clampFormationTiming({ sections, sectionId: "b", time: 8, moveDuration: 20, timelineMax: 30 }),
    { time: 11, moveDuration: 11, start: 0, end: 11 }
  );
  assert.deepEqual(
    clampFormationTiming({ sections, sectionId: "b", time: -5, moveDuration: 2, timelineMax: 30 }),
    { time: 2, moveDuration: 2, start: 0, end: 2 }
  );
});

test("clampFormationTiming recovers when existing sections are already crossed", () => {
  const sections = [
    { id: "a", time: 10, moveDuration: 0 },
    { id: "b", time: 8, moveDuration: 6 },
    { id: "c", time: 9, moveDuration: 4 }
  ];

  const timing = clampFormationTiming({ sections, sectionId: "b", time: -10, moveDuration: 20, timelineMax: 12 });
  assert.ok(timing.time >= 0);
  assert.ok(timing.start >= 0);
  assert.ok(timing.moveDuration >= 0);
  assert.equal(timing.end, timing.time);
});

test("resolveFormationAddTarget selects an existing formation instead of inserting on it", () => {
  const sections = [{ id: "a", time: 0 }, { id: "b", time: 8 }];
  const target = resolveFormationAddTarget(sections, 8.05);

  assert.equal(target.action, "select");
  assert.equal(target.section.id, "b");
});

test("resolveFormationAddTarget returns the requested capture time without deciding segment duration", () => {
  const sections = [{ id: "a", time: 0 }, { id: "b", time: 8 }];
  const target = resolveFormationAddTarget(sections, 3);

  assert.equal(target.action, "append");
  assert.equal(target.previous.id, "b");
  assert.equal(target.time, 3);
  assert.equal("moveDuration" in target, false);
});

test("resolveFormationAddTarget appends the first added formation at the intro end", () => {
  const sections = [{ id: "a", time: 4, start: 0, end: 4, moveDuration: 4, moveMode: "hold" }];
  const target = resolveFormationAddTarget(sections, 0);

  assert.equal(target.action, "append");
  assert.equal(target.previous.id, "a");
  assert.equal(target.time, 0);
  assert.equal("moveDuration" in target, false);
});

test("resolveFormationAddTarget uses the capture time after the last formation", () => {
  const sections = [{ id: "a", time: 0 }, { id: "b", time: 8 }];
  const target = resolveFormationAddTarget(sections, 14);

  assert.equal(target.action, "append");
  assert.equal(target.previous.id, "b");
  assert.equal(target.time, 14);
  assert.equal("moveDuration" in target, false);
});

test("buildTimelineTicks uses readable intervals and includes the final duration", () => {
  const ticks = buildTimelineTicks(60);

  assert.deepEqual(ticks.slice(0, 3).map((tick) => tick.time), [0, 10, 20]);
  assert.equal(ticks.at(-1).time, 60);
  assert.equal(ticks.at(-1).percent, 100);
});

test("buildTimelineTicks can render micro ticks with labeled minor and major intervals", () => {
  const ticks = buildTimelineTicks(12, {
    intervalSeconds: 1,
    labelIntervalSeconds: 5,
    majorIntervalSeconds: 10,
    pixelsPerSecond: 56,
    scrollX: 0,
    viewportWidth: 620
  });

  assert.deepEqual(ticks.slice(0, 6).map((tick) => tick.time), [0, 1, 2, 3, 4, 5]);
  assert.deepEqual(ticks.slice(0, 6).map((tick) => tick.label), ["0s", "", "", "", "", "5s"]);
  assert.equal(ticks.find((tick) => tick.time === 1).importance, "micro");
  assert.equal(ticks.find((tick) => tick.time === 5).importance, "minor");
  assert.equal(ticks.find((tick) => tick.time === 10).importance, "major");
});

test("buildWaveformBars returns deterministic normalized bar heights", () => {
  const bars = buildWaveformBars(8);

  assert.equal(bars.length, 8);
  assert.deepEqual(bars, buildWaveformBars(8));
  assert.ok(bars.every((bar) => bar >= 0 && bar <= 1));
});

function compactTiming(sections) {
  return sections.map((section) => ({
    id: section.id,
    start: section.start,
    end: section.end,
    time: section.time,
    moveDuration: section.moveDuration
  }));
}

function assertSequentialTiming(sections) {
  let previousEnd = 0;
  for (const section of sections) {
    assert.equal(section.end, section.time);
    assert.equal(section.moveDuration, quantizeTimelineTime(section.end - section.start));
    assert.ok(section.start >= previousEnd, `${section.id} starts before the previous section ends`);
    previousEnd = section.end;
  }
}

function pointDropBlocks(sections, ids, pixelsPerSecond = 100) {
  return ids.map((id) => {
    const section = sections.find((item) => item.id === id);
    const leftPx = pointMoveStart(section) * pixelsPerSecond;
    const widthPx = section.moveDuration * pixelsPerSecond;
    return {
      kind: "hold",
      sectionId: id,
      leftPx,
      widthPx,
      hitWidthPx: widthPx
    };
  });
}

test("applyFormationTimelineEdit adds a default four-second hold plus four-second move after the intro", () => {
  const sections = [{ id: "intro", time: 4, start: 0, end: 4, moveDuration: 4, moveMode: "hold" }];
  const result = applyFormationTimelineEdit({
    sections,
    action: "add-after",
    section: { id: "f2" }
  });

  assert.equal(result.selectedSectionId, "f2");
  assert.equal(result.sections.find((section) => section.id === "f2").name, "대형");
  assert.deepEqual(compactTiming(result.sections), [
    { id: "intro", start: 0, end: 4, time: 4, moveDuration: 4 },
    { id: "f2", start: 8, end: 12, time: 12, moveDuration: 4 }
  ]);
  assertSequentialTiming(result.sections);
});

test("applyFormationTimelineEdit preserves formation payloads through add, trim, move, and reorder", () => {
  const sections = [
    {
      id: "intro",
      time: 4,
      start: 0,
      end: 4,
      moveDuration: 4,
      positions: { a: { x: 10, y: 10 }, b: { x: 20, y: 20 } },
      partnerSetId: "pair_intro",
      notes: "start"
    },
    {
      id: "b",
      time: 8,
      start: 4,
      end: 8,
      moveDuration: 4,
      positions: { a: { x: 30, y: 30 }, b: { x: 40, y: 40 } },
      partnerSetId: "pair_b",
      moveMode: "smooth"
    },
    {
      id: "c",
      time: 12,
      start: 8,
      end: 12,
      moveDuration: 4,
      positions: { a: { x: 50, y: 50 }, b: { x: 60, y: 60 } },
      partnerSetId: "pair_c"
    }
  ];

  const added = applyFormationTimelineEdit({
    sections,
    action: "add-after",
    section: {
      id: "d",
      positions: { a: { x: 70, y: 70 }, b: { x: 80, y: 80 } },
      partnerSetId: "pair_d"
    }
  });
  assert.deepEqual(added.sections.find((section) => section.id === "d").positions, { a: { x: 70, y: 70 }, b: { x: 80, y: 80 } });
  assert.equal(added.sections.find((section) => section.id === "d").partnerSetId, "pair_d");
  assert.equal(added.sections.find((section) => section.id === "d").moveDuration, 4);
  assert.equal(added.sections.find((section) => section.id === "d").name, "대형");

  const trimmed = applyFormationTimelineEdit({ sections, action: "trim-right", sectionId: "b", time: 10 });
  assert.deepEqual(trimmed.sections.find((section) => section.id === "b").positions, sections[1].positions);
  assert.equal(trimmed.sections.find((section) => section.id === "b").partnerSetId, "pair_b");
  assert.equal(trimmed.sections.find((section) => section.id === "b").moveMode, "smooth");

  const moved = applyFormationTimelineEdit({ sections, action: "move-body", sectionId: "b", deltaTime: 1, timelineMax: 20 });
  assert.deepEqual(moved.sections.find((section) => section.id === "b").positions, sections[1].positions);
  assert.equal(moved.sections.find((section) => section.id === "b").partnerSetId, "pair_b");

  const reordered = applyFormationTimelineEdit({ sections, action: "reorder", sectionId: "c", toIndex: 0 });
  assert.deepEqual(reordered.sections.find((section) => section.id === "c").positions, sections[2].positions);
  assert.equal(reordered.sections.find((section) => section.id === "c").partnerSetId, "pair_c");
  assertSequentialTiming(reordered.sections);
});

test("applyFormationTimelineEdit uses the default hold and move when the requested arrival is too early", () => {
  const sections = [
    { id: "intro", time: 4, start: 0, end: 4, moveDuration: 4 },
    { id: "b", time: 8, start: 4, end: 8, moveDuration: 4 }
  ];
  const result = applyFormationTimelineEdit({
    sections,
    action: "add-after",
    time: 14,
    section: { id: "c" }
  });

  assert.deepEqual(compactTiming(result.sections), [
    { id: "intro", start: 0, end: 4, time: 4, moveDuration: 4 },
    { id: "b", start: 4, end: 8, time: 8, moveDuration: 4 },
    { id: "c", start: 12, end: 16, time: 16, moveDuration: 4 }
  ]);
  assertSequentialTiming(result.sections);
});

test("resolveFormationPointDrop lengthens the last move instead of the previous hold when dropping the last block later", () => {
  const sections = [
    { id: "intro", time: 4, start: 0, end: 4, moveDuration: 4 },
    { id: "b", time: 12, start: 8, end: 12, moveDuration: 4 }
  ];

  const result = resolveFormationPointDrop({
    sections,
    sectionId: "b",
    pointerTime: 20,
    pointerContentPx: 2000,
    blocks: pointDropBlocks(sections, ["intro", "b"]),
    timelineMax: 24
  });

  assert.equal(result.action, "time-move");
  assert.deepEqual(compactTiming(result.sections), [
    { id: "intro", start: 0, end: 4, time: 4, moveDuration: 4 },
    { id: "b", start: 4, end: 20, time: 20, moveDuration: 16 }
  ]);
  assertSequentialTiming(result.sections);
});

test("applyFormationTimelineEdit right trim expansion pushes every following block", () => {
  const sections = [
    { id: "intro", time: 4, start: 0, end: 4, moveDuration: 4 },
    { id: "b", time: 8, start: 4, end: 8, moveDuration: 4 },
    { id: "c", time: 16, start: 12, end: 16, moveDuration: 4 }
  ];

  const result = applyFormationTimelineEdit({ sections, action: "trim-right", sectionId: "b", time: 10 });

  assert.deepEqual(compactTiming(result.sections), [
    { id: "intro", start: 0, end: 4, time: 4, moveDuration: 4 },
    { id: "b", start: 4, end: 10, time: 10, moveDuration: 6 },
    { id: "c", start: 14, end: 18, time: 18, moveDuration: 4 }
  ]);
  assertSequentialTiming(result.sections);
});

test("applyFormationTimelineEdit right trim shrink pulls only contiguous following blocks", () => {
  const sections = [
    { id: "intro", time: 4, start: 0, end: 4, moveDuration: 4 },
    { id: "b", time: 8, start: 4, end: 8, moveDuration: 4 },
    { id: "c", time: 12, start: 8, end: 12, moveDuration: 4 },
    { id: "d", time: 20, start: 16, end: 20, moveDuration: 4 }
  ];

  const result = applyFormationTimelineEdit({ sections, action: "trim-right", sectionId: "b", time: 6 });

  assert.deepEqual(compactTiming(result.sections), [
    { id: "intro", start: 0, end: 4, time: 4, moveDuration: 4 },
    { id: "b", start: 4, end: 6, time: 6, moveDuration: 2 },
    { id: "c", start: 6, end: 10, time: 10, moveDuration: 4 },
    { id: "d", start: 16, end: 20, time: 20, moveDuration: 4 }
  ]);
  assertSequentialTiming(result.sections);
});

test("applyFormationTimelineEdit body drag moves inside empty space without pushing neighbors", () => {
  const sections = [
    { id: "intro", time: 4, start: 0, end: 4, moveDuration: 4 },
    { id: "b", time: 8, start: 4, end: 8, moveDuration: 4 },
    { id: "c", time: 18, start: 14, end: 18, moveDuration: 4 }
  ];

  const result = applyFormationTimelineEdit({ sections, action: "move-body", sectionId: "b", deltaTime: 3, timelineMax: 24 });

  assert.deepEqual(compactTiming(result.sections), [
    { id: "intro", start: 0, end: 4, time: 4, moveDuration: 4 },
    { id: "b", start: 7, end: 11, time: 11, moveDuration: 4 },
    { id: "c", start: 14, end: 18, time: 18, moveDuration: 4 }
  ]);
  assertSequentialTiming(result.sections);
});

test("applyFormationTimelineEdit body drag reports reorder preview across neighbor threshold", () => {
  const sections = [
    { id: "intro", time: 4, start: 0, end: 4, moveDuration: 4 },
    { id: "b", time: 8, start: 4, end: 8, moveDuration: 4 },
    { id: "c", time: 12, start: 8, end: 12, moveDuration: 4 }
  ];

  const result = applyFormationTimelineEdit({ sections, action: "move-body", sectionId: "c", deltaTime: -5, timelineMax: 16 });

  assert.equal(result.statusKind, "reorder-preview");
  assert.equal(result.toIndex, 1);
  assert.deepEqual(compactTiming(result.sections), compactTiming(sections));
});

test("applyFormationTimelineEdit first block body drag is reorder-only", () => {
  const sections = [
    { id: "intro", time: 4, start: 0, end: 4, moveDuration: 4 },
    { id: "b", time: 8, start: 4, end: 8, moveDuration: 4 },
    { id: "c", time: 12, start: 8, end: 12, moveDuration: 4 }
  ];

  const smallDrag = applyFormationTimelineEdit({ sections, action: "move-body", sectionId: "intro", deltaTime: 1, timelineMax: 16 });
  const reorderPreview = applyFormationTimelineEdit({ sections, action: "move-body", sectionId: "intro", deltaTime: 7, timelineMax: 16 });

  assert.equal(smallDrag.statusKind, "blocked");
  assert.deepEqual(compactTiming(smallDrag.sections), compactTiming(sections));
  assert.equal(reorderPreview.statusKind, "reorder-preview");
  assert.equal(reorderPreview.toIndex, 1);
  assert.deepEqual(compactTiming(reorderPreview.sections), compactTiming(sections));
});

test("applyFormationTimelineEdit first block body drag can preview multiple insertion positions", () => {
  const sections = [
    { id: "intro", time: 4, start: 0, end: 4, moveDuration: 4 },
    { id: "b", time: 8, start: 4, end: 8, moveDuration: 4 },
    { id: "c", time: 12, start: 8, end: 12, moveDuration: 4 }
  ];

  const middlePreview = applyFormationTimelineEdit({ sections, action: "move-body", sectionId: "intro", deltaTime: 7, timelineMax: 16 });
  const endPreview = applyFormationTimelineEdit({ sections, action: "move-body", sectionId: "intro", deltaTime: 11, timelineMax: 16 });

  assert.equal(middlePreview.statusKind, "reorder-preview");
  assert.equal(middlePreview.toIndex, 1);
  assert.equal(endPreview.statusKind, "reorder-preview");
  assert.equal(endPreview.toIndex, 2);
  assert.deepEqual(compactTiming(endPreview.sections), compactTiming(sections));
});

test("applyFormationTimelineEdit body drag can preview multiple positions to the left", () => {
  const sections = [
    { id: "intro", time: 4, start: 0, end: 4, moveDuration: 4 },
    { id: "b", time: 8, start: 4, end: 8, moveDuration: 4 },
    { id: "c", time: 12, start: 8, end: 12, moveDuration: 4 }
  ];

  const middlePreview = applyFormationTimelineEdit({ sections, action: "move-body", sectionId: "c", deltaTime: -5, timelineMax: 16 });
  const frontPreview = applyFormationTimelineEdit({ sections, action: "move-body", sectionId: "c", deltaTime: -9, timelineMax: 16 });

  assert.equal(middlePreview.statusKind, "reorder-preview");
  assert.equal(middlePreview.toIndex, 1);
  assert.equal(frontPreview.statusKind, "reorder-preview");
  assert.equal(frontPreview.toIndex, 0);
  assert.deepEqual(compactTiming(frontPreview.sections), compactTiming(sections));
});

test("resolveFormationPointDrop moves a block by the pointer time in empty space", () => {
  const sections = [
    { id: "intro", time: 4, start: 0, end: 4, moveDuration: 4 },
    { id: "b", time: 8, start: 4, end: 8, moveDuration: 4 },
    { id: "c", time: 18, start: 14, end: 18, moveDuration: 4 }
  ];

  const result = resolveFormationPointDrop({
    sections,
    sectionId: "b",
    pointerTime: 11,
    pointerContentPx: 1100,
    blocks: pointDropBlocks(sections, ["intro", "b", "c"])
  });

  assert.equal(result.action, "time-move");
  assert.equal(result.statusKind, "updated");
  assert.equal(result.label, "여기로 이동");
  assert.deepEqual(compactTiming(result.sections), [
    { id: "intro", start: 0, end: 4, time: 4, moveDuration: 4 },
    { id: "b", start: 7, end: 11, time: 11, moveDuration: 4 },
    { id: "c", start: 14, end: 18, time: 18, moveDuration: 4 }
  ]);
  assertSequentialTiming(result.sections);
});

test("resolveFormationPointDrop inserts before or after a block from its edge zone", () => {
  const sections = [
    { id: "intro", time: 4, start: 0, end: 4, moveDuration: 4 },
    { id: "b", time: 8, start: 4, end: 8, moveDuration: 4 },
    { id: "c", time: 12, start: 8, end: 12, moveDuration: 4 }
  ];

  const beforeResult = resolveFormationPointDrop({
    sections,
    sectionId: "c",
    pointerTime: 4.1,
    pointerContentPx: 401,
    blocks: pointDropBlocks(sections, ["intro", "b", "c"])
  });
  const afterResult = resolveFormationPointDrop({
    sections,
    sectionId: "intro",
    pointerTime: 7.9,
    pointerContentPx: 799,
    blocks: pointDropBlocks(sections, ["intro", "b", "c"])
  });

  assert.equal(beforeResult.action, "insert");
  assert.equal(beforeResult.targetSectionId, "b");
  assert.equal(beforeResult.edge, "before");
  assert.equal(beforeResult.toIndex, 1);
  assert.equal(beforeResult.label, "여기에 삽입");
  assert.deepEqual(compactTiming(beforeResult.sections).map((section) => section.id), ["intro", "c", "b"]);
  assertSequentialTiming(beforeResult.sections);

  assert.equal(afterResult.action, "insert");
  assert.equal(afterResult.targetSectionId, "b");
  assert.equal(afterResult.edge, "after");
  assert.equal(afterResult.toIndex, 1);
  assert.deepEqual(compactTiming(afterResult.sections).map((section) => section.id), ["b", "intro", "c"]);
  assertSequentialTiming(afterResult.sections);
});

test("resolveFormationPointDrop swaps with a block from its center zone", () => {
  const sections = [
    { id: "intro", time: 4, start: 0, end: 4, moveDuration: 4 },
    { id: "b", time: 8, start: 4, end: 8, moveDuration: 4 },
    { id: "c", time: 12, start: 8, end: 12, moveDuration: 4 }
  ];

  const result = resolveFormationPointDrop({
    sections,
    sectionId: "intro",
    pointerTime: 6,
    pointerContentPx: 600,
    blocks: pointDropBlocks(sections, ["intro", "b", "c"])
  });

  assert.equal(result.action, "swap");
  assert.equal(result.statusKind, "updated");
  assert.equal(result.targetSectionId, "b");
  assert.equal(result.label, "교체");
  assert.deepEqual(compactTiming(result.sections).map((section) => section.id), ["b", "intro", "c"]);
  assertSequentialTiming(result.sections);
});

test("resolveFormationPointDrop blocks unchanged self and overlapping time drops", () => {
  const sections = [
    { id: "intro", time: 4, start: 0, end: 4, moveDuration: 4 },
    { id: "b", time: 8, start: 4, end: 8, moveDuration: 4 },
    { id: "c", time: 12, start: 8, end: 12, moveDuration: 4 }
  ];

  const selfResult = resolveFormationPointDrop({
    sections,
    sectionId: "b",
    pointerTime: 6,
    pointerContentPx: 600,
    blocks: pointDropBlocks(sections, ["intro", "b", "c"])
  });
  const overlapResult = resolveFormationPointDrop({
    sections,
    sectionId: "b",
    pointerTime: 11,
    pointerContentPx: 1250,
    blocks: pointDropBlocks(sections, ["intro", "b", "c"])
  });

  assert.equal(selfResult.action, "blocked");
  assert.equal(selfResult.label, "배치 불가");
  assert.deepEqual(compactTiming(selfResult.sections), compactTiming(sections));
  assert.equal(overlapResult.action, "blocked");
  assert.deepEqual(compactTiming(overlapResult.sections), compactTiming(sections));
});

test("applyFormationTimelineEdit first block can reorder to any slot and hands start role to the next block", () => {
  const sections = [
    { id: "intro", time: 4, start: 0, end: 4, moveDuration: 4 },
    { id: "b", time: 8, start: 4, end: 8, moveDuration: 4 },
    { id: "c", time: 12, start: 8, end: 12, moveDuration: 4 }
  ];

  const middleResult = applyFormationTimelineEdit({ sections, action: "reorder", sectionId: "intro", toIndex: 1 });
  const endResult = applyFormationTimelineEdit({ sections, action: "reorder", sectionId: "intro", toIndex: 2 });

  assert.equal(middleResult.statusKind, "updated");
  assert.deepEqual(compactTiming(middleResult.sections), [
    { id: "b", start: 0, end: 4, time: 4, moveDuration: 4 },
    { id: "intro", start: 4, end: 8, time: 8, moveDuration: 4 },
    { id: "c", start: 8, end: 12, time: 12, moveDuration: 4 }
  ]);
  assertSequentialTiming(middleResult.sections);
  assert.deepEqual(compactTiming(endResult.sections), [
    { id: "b", start: 0, end: 4, time: 4, moveDuration: 4 },
    { id: "c", start: 4, end: 8, time: 8, moveDuration: 4 },
    { id: "intro", start: 8, end: 12, time: 12, moveDuration: 4 }
  ]);
  assertSequentialTiming(endResult.sections);
});

test("applyFormationTimelineEdit still blocks first block left trim", () => {
  const sections = [
    { id: "intro", time: 4, start: 0, end: 4, moveDuration: 4 },
    { id: "b", time: 8, start: 4, end: 8, moveDuration: 4 }
  ];

  const leftTrim = applyFormationTimelineEdit({ sections, action: "trim-left", sectionId: "intro", time: 2 });

  assert.equal(leftTrim.statusKind, "blocked");
  assert.deepEqual(compactTiming(leftTrim.sections), compactTiming(sections));
});

test("compat trimFormationSegment delegates right trim expansion through the dispatcher", () => {
  const sections = [
    { id: "a", time: 0, moveDuration: 0 },
    { id: "b", time: 8, moveDuration: 3 },
    { id: "c", time: 10, moveDuration: 2 }
  ];

  const trimmed = trimFormationSegment({ sections, sectionId: "b", edge: "right", time: 12, timelineMax: 20 });

  assert.deepEqual(
    trimmed.map((section) => ({ id: section.id, start: section.start, end: section.end, time: section.time, moveDuration: section.moveDuration })),
    [
      { id: "a", start: 0, end: 0, time: 0, moveDuration: 0 },
      { id: "b", start: 5, end: 12, time: 12, moveDuration: 7 },
      { id: "c", start: 12, end: 14, time: 14, moveDuration: 2 }
    ]
  );
});

test("compat trimFormationSegment delegates right trim past empty gaps through the dispatcher", () => {
  const sections = [
    { id: "a", time: 0, moveDuration: 0 },
    { id: "b", time: 8, moveDuration: 3 },
    { id: "c", time: 16, moveDuration: 2 }
  ];

  const intoGap = trimFormationSegment({ sections, sectionId: "b", edge: "right", time: 12, timelineMax: 20 });

  assert.deepEqual(
    intoGap.map((section) => ({ id: section.id, start: section.start, end: section.end, time: section.time, moveDuration: section.moveDuration })),
    [
      { id: "a", start: 0, end: 0, time: 0, moveDuration: 0 },
      { id: "b", start: 5, end: 12, time: 12, moveDuration: 7 },
      { id: "c", start: 18, end: 20, time: 20, moveDuration: 2 }
    ]
  );

  const pastGap = trimFormationSegment({ sections, sectionId: "b", edge: "right", time: 17, timelineMax: 20 });

  assert.deepEqual(
    pastGap.map((section) => ({ id: section.id, start: section.start, end: section.end, time: section.time, moveDuration: section.moveDuration })),
    [
      { id: "a", start: 0, end: 0, time: 0, moveDuration: 0 },
      { id: "b", start: 5, end: 17, time: 17, moveDuration: 12 },
      { id: "c", start: 23, end: 25, time: 25, moveDuration: 2 }
    ]
  );
});

test("compat trimFormationSegment delegates right trim shrink for contiguous followers", () => {
  const sections = [
    { id: "a", time: 0, moveDuration: 0 },
    { id: "b", time: 8, moveDuration: 3 },
    { id: "c", time: 10, moveDuration: 2 },
    { id: "d", time: 18, moveDuration: 3 }
  ];

  const trimmed = trimFormationSegment({ sections, sectionId: "b", edge: "right", time: 6, timelineMax: 30 });

  assert.deepEqual(
    trimmed.map((section) => ({ id: section.id, start: section.start, end: section.end, time: section.time, moveDuration: section.moveDuration })),
    [
      { id: "a", start: 0, end: 0, time: 0, moveDuration: 0 },
      { id: "b", start: 5, end: 6, time: 6, moveDuration: 1 },
      { id: "c", start: 6, end: 8, time: 8, moveDuration: 2 },
      { id: "d", start: 15, end: 18, time: 18, moveDuration: 3 }
    ]
  );
});

test("compat trimFormationSegment preserves tenth-second quantization", () => {
  const sections = [
    { id: "a", time: 0, moveDuration: 0 },
    { id: "b", time: 8, moveDuration: 3 },
    { id: "c", time: 16, moveDuration: 2 }
  ];

  const leftTrimmed = trimFormationSegment({ sections, sectionId: "b", edge: "left", time: 5.06, timelineMax: 20 });
  assert.equal(leftTrimmed[1].start, 5.1);
  assert.equal(leftTrimmed[1].moveDuration, 2.9);

  const rightTrimmed = trimFormationSegment({ sections, sectionId: "b", edge: "right", time: 12.04, timelineMax: 20 });
  assert.equal(rightTrimmed[1].end, 12);
  assert.equal(rightTrimmed[1].moveDuration, 7);
  assert.equal(rightTrimmed[2].time, 20);
});

test("compat trimFormationSegment delegates left trim without moving neighbors", () => {
  const sections = [
    { id: "a", time: 0, moveDuration: 0 },
    { id: "b", time: 8, moveDuration: 3 },
    { id: "c", time: 14, moveDuration: 2 }
  ];

  const trimmed = trimFormationSegment({ sections, sectionId: "b", edge: "left", time: 6, timelineMax: 20 });

  assert.equal(trimmed[1].start, 6);
  assert.equal(trimmed[1].end, 8);
  assert.equal(trimmed[1].moveDuration, 2);
  assert.equal(trimmed[2].time, 14);
});

test("compat trimFormationSegment locks left trim at the previous boundary", () => {
  const sections = [
    { id: "a", time: 0, moveDuration: 0 },
    { id: "b", time: 8, moveDuration: 3 },
    { id: "c", time: 14, moveDuration: 2 }
  ];

  const trimmed = trimFormationSegment({ sections, sectionId: "b", edge: "left", time: -10, timelineMax: 20 });

  assert.equal(trimmed[1].start, 0);
  assert.equal(trimmed[1].end, 8);
  assert.equal(trimmed[1].moveDuration, 8);
  assert.equal(trimmed[2].time, 14);
});

test("compat trimFormationSegment delegates intro right trim and pushes following blocks", () => {
  const sections = [
    { id: "a", time: 4, start: 0, end: 4, moveDuration: 4, moveMode: "hold" },
    { id: "b", time: 10, moveDuration: 4 },
    { id: "c", time: 14, moveDuration: 2 }
  ];

  const trimmed = trimFormationSegment({ sections, sectionId: "a", edge: "right", time: 5, timelineMax: 20 });

  assert.equal(trimmed[0].time, 5);
  assert.equal(trimmed[0].end, 5);
  assert.equal(trimmed[0].start, 0);
  assert.equal(trimmed[0].moveDuration, 5);
  assert.equal(trimmed[1].start, 7);
  assert.equal(trimmed[1].time, 11);
  assert.equal(trimmed[1].moveDuration, 4);
  assert.equal(trimmed[2].time, 15);
});

test("compat trimFormationSegment delegates intro right trim for contiguous next block", () => {
  const sections = [
    { id: "a", time: 4, start: 0, end: 4, moveDuration: 4, moveMode: "hold" },
    { id: "b", time: 8, moveDuration: 4 }
  ];

  const trimmed = trimFormationSegment({ sections, sectionId: "a", edge: "right", time: 6, timelineMax: 20 });

  assert.equal(trimmed[0].time, 6);
  assert.equal(trimmed[0].end, 6);
  assert.equal(trimmed[0].moveDuration, 6);
  assert.equal(trimmed[1].start, 6);
  assert.equal(trimmed[1].time, 10);
  assert.equal(trimmed[1].moveDuration, 4);
});

test("compat reorder wrappers preserve compact movement durations while the first slot changes role", () => {
  const sections = [
    { id: "a", time: 4, moveDuration: 4 },
    { id: "b", time: 8, moveDuration: 3 },
    { id: "c", time: 14, moveDuration: 2 },
    { id: "d", time: 20, moveDuration: 5 }
  ];

  assert.equal(resolveFormationReorderIndex({ sections, sectionId: "c", time: 2 }), 1);

  const reordered = reorderFormationSegments({ sections, sectionId: "c", toIndex: 1 });

  assert.deepEqual(reordered.map((section) => section.id), ["a", "c", "b", "d"]);
  assert.deepEqual(reordered.map((section) => section.moveDuration), [4, 2, 3, 5]);
  assert.deepEqual(reordered.map((section) => [section.start, section.end]), [[0, 4], [4, 6], [6, 9], [9, 14]]);

  const introMoved = reorderFormationSegments({ sections, sectionId: "a", toIndex: 2 });

  assert.deepEqual(introMoved.map((section) => section.id), ["b", "c", "a", "d"]);
  assert.deepEqual(introMoved.map((section) => section.moveDuration), [3, 2, 4, 5]);
  assert.deepEqual(introMoved.map((section) => [section.start, section.end]), [[0, 3], [3, 5], [5, 9], [9, 14]]);
  assert.equal(resolveFormationReorderIndex({ sections, sectionId: "a", time: 12 }), 1);
  assert.deepEqual(
    resolveFormationBodyDrag({ sections, sectionId: "a", deltaTime: 8, timelineMax: 20 }),
    {
      action: "reorder-preview",
      index: 0,
      start: 1,
      end: 5,
      duration: 4,
      toIndex: 1
    }
  );
});

test("compat resolveFormationBodyDrag delegates body movement until adjacent bounds", () => {
  const sections = [
    { id: "a", time: 0, moveDuration: 0 },
    { id: "b", time: 8, moveDuration: 3 },
    { id: "c", time: 14, moveDuration: 2 }
  ];

  assert.deepEqual(
    resolveFormationBodyDrag({ sections, sectionId: "b", deltaTime: 2, timelineMax: 20 }),
    {
      action: "move",
      index: 1,
      start: 7,
      end: 10,
      duration: 3,
      toIndex: null
    }
  );

  assert.deepEqual(
    resolveFormationBodyDrag({ sections, sectionId: "b", deltaTime: 5, timelineMax: 20 }),
    {
      action: "blocked",
      index: 1,
      start: 9,
      end: 12,
      duration: 3,
      toIndex: null
    }
  );
});

test("compat resolveFormationBodyDrag preserves tenth-second movement boundaries", () => {
  const sections = [
    { id: "a", time: 0, moveDuration: 0 },
    { id: "b", time: 8, moveDuration: 3 },
    { id: "c", time: 14, moveDuration: 2 }
  ];

  assert.deepEqual(
    resolveFormationBodyDrag({ sections, sectionId: "b", deltaTime: 1.06, timelineMax: 20 }),
    {
      action: "move",
      index: 1,
      start: 6.1,
      end: 9.1,
      duration: 3,
      toIndex: null
    }
  );
});

test("compat resolveFormationBodyDrag delegates reorder preview threshold behavior", () => {
  const sections = [
    { id: "a", time: 0, moveDuration: 0 },
    { id: "b", time: 8, moveDuration: 3 },
    { id: "c", time: 18, moveDuration: 6 },
    { id: "d", time: 25, moveDuration: 4 }
  ];

  assert.equal(
    resolveFormationBodyDrag({ sections, sectionId: "b", deltaTime: 6.9, timelineMax: 30 }).action,
    "blocked"
  );

  assert.deepEqual(
    resolveFormationBodyDrag({ sections, sectionId: "b", deltaTime: 11.2, timelineMax: 30 }),
    {
      action: "reorder-preview",
      index: 1,
      start: 9,
      end: 12,
      duration: 3,
      toIndex: 2
    }
  );

  assert.deepEqual(
    resolveFormationBodyDrag({ sections, sectionId: "c", deltaTime: -13.1, timelineMax: 30 }),
    {
      action: "reorder-preview",
      index: 2,
      start: 8,
      end: 14,
      duration: 6,
      toIndex: 1
    }
  );
});

test("compat resolveFormationBodyDrag delegates adjacent reorder preview behavior", () => {
  const sections = [
    { id: "a", time: 0, moveDuration: 0 },
    { id: "b", time: 4, moveDuration: 4 },
    { id: "c", time: 8, moveDuration: 4 }
  ];

  assert.deepEqual(
    resolveFormationBodyDrag({ sections, sectionId: "c", deltaTime: -2, timelineMax: 12 }),
    {
      action: "blocked",
      index: 2,
      start: 4,
      end: 8,
      duration: 4,
      toIndex: null
    }
  );

  assert.deepEqual(
    resolveFormationBodyDrag({ sections, sectionId: "c", deltaTime: -5, timelineMax: 12 }),
    {
      action: "reorder-preview",
      index: 2,
      start: 4,
      end: 8,
      duration: 4,
      toIndex: 1
    }
  );
});

test("formation block layout preserves logical x positions in a single lane", () => {
  const sections = [
    { id: "a", time: 0, moveDuration: 0 },
    { id: "b", time: 8, moveDuration: 8 },
    { id: "c", time: 10, moveDuration: 4 },
    { id: "d", time: 20, moveDuration: 2 }
  ];

  const blocks = layoutFormationBlocks(sections, 10);

  assert.deepEqual(
    blocks.map((block) => ({ id: block.sectionId, left: block.leftPx, logicalLeft: block.logicalLeftPx, width: block.widthPx, hit: block.hitWidthPx, row: block.row })),
    [
      { id: "a", left: 0, logicalLeft: 0, width: 0, hit: 68, row: 0 },
      { id: "b", left: 72, logicalLeft: 0, width: 80, hit: 80, row: 0 },
      { id: "c", left: 132, logicalLeft: 60, width: 40, hit: 40, row: 0 },
      { id: "d", left: 252, logicalLeft: 180, width: 20, hit: 20, row: 0 }
    ]
  );
});

test("formation block layout shows F1 and offsets later blocks to avoid overlap", () => {
  const blocks = layoutFormationBlocks([
    { id: "a", time: 0, moveDuration: 0 },
    { id: "b", time: 0.2, moveDuration: 0.2 },
    { id: "c", time: 0.4, moveDuration: 0.2 },
    { id: "d", time: 2, moveDuration: 0 }
  ], 38);

  assert.deepEqual(
    blocks.map((block) => ({ id: block.sectionId, left: block.leftPx, logicalLeft: block.logicalLeftPx, hit: block.hitWidthPx, marker: block.isMarker, tick: block.isTick })),
    [
      { id: "a", left: 0, logicalLeft: 0, hit: 68, marker: true, tick: false },
      { id: "b", left: 72, logicalLeft: 0, hit: 7.6000000000000005, marker: false, tick: false },
      { id: "c", left: 79.6, logicalLeft: 7.6000000000000005, hit: 7.6000000000000005, marker: false, tick: false },
      { id: "d", left: 148, logicalLeft: 76, hit: 0, marker: false, tick: true }
    ]
  );
});

test("formation block layout can render intro as an editable segment with truthful time labels", () => {
  const blocks = layoutFormationBlocks([
    { id: "a", time: 4, start: 0, end: 4, moveDuration: 4, moveMode: "hold" },
    { id: "b", time: 8, moveDuration: 4 },
    { id: "c", time: 12, moveDuration: 2 }
  ], 10, { introAsSegment: true });

  assert.deepEqual(
    blocks.map((block) => ({
      id: block.sectionId,
      left: block.leftPx,
      logicalLeft: block.logicalLeftPx,
      width: block.widthPx,
      hit: block.hitWidthPx,
      marker: block.isMarker,
      start: block.displayStartTime,
      end: block.displayEndTime
    })),
    [
      { id: "a", left: 0, logicalLeft: 0, width: 40, hit: 40, marker: false, start: 0, end: 4 },
      { id: "b", left: 40, logicalLeft: 40, width: 40, hit: 40, marker: false, start: 4, end: 8 },
      { id: "c", left: 100, logicalLeft: 100, width: 20, hit: 20, marker: false, start: 10, end: 12 }
    ]
  );
});

test("timeline visual segments split formation holds from automatic moves", () => {
  const segments = layoutTimelineVisualSegments([
    { id: "a", time: 0, moveDuration: 0 },
    { id: "b", time: 8, moveDuration: 4 }
  ], 10);

  assert.deepEqual(
    segments.map((segment) => ({
      kind: segment.kind,
      sectionId: segment.sectionId,
      from: segment.fromSectionId,
      to: segment.toSectionId,
      start: segment.displayStartTime,
      end: segment.displayEndTime,
      left: segment.leftPx,
      width: segment.widthPx,
      label: segment.label,
      resizable: segment.resizable
    })),
    [
      { kind: "hold", sectionId: "a", from: "a", to: "a", start: 0, end: 4, left: 0, width: 40, label: "F1", resizable: true },
      { kind: "move", sectionId: "b", from: "a", to: "b", start: 4, end: 8, left: 40, width: 40, label: "M1", resizable: false },
      { kind: "hold", sectionId: "b", from: "b", to: "b", start: 8, end: 12, left: 80, width: 40, label: "F2", resizable: false }
    ]
  );
});

test("timeline visual segments render the first intro hold from its movement start", () => {
  const segments = layoutTimelineVisualSegments([
    { id: "intro", time: 4, moveDuration: 4 },
    { id: "next", time: 8, moveDuration: 4 }
  ], 10);

  assert.deepEqual(
    segments.map((segment) => ({
      kind: segment.kind,
      sectionId: segment.sectionId,
      start: segment.displayStartTime,
      end: segment.displayEndTime
    })),
    [
      { kind: "hold", sectionId: "intro", start: 0, end: 4 },
      { kind: "move", sectionId: "next", start: 4, end: 8 },
      { kind: "hold", sectionId: "next", start: 8, end: 12 }
    ]
  );
});

test("hold right trim preserves next arrival and absorbs the automatic move", () => {
  const result = applyFormationTimelineEdit({
    sections: [
      { id: "a", time: 0, moveDuration: 0 },
      { id: "b", time: 8, moveDuration: 4 }
    ],
    action: "trim-hold-right",
    sectionId: "a",
    time: 5
  });

  assert.equal(result.statusKind, "updated");
  assert.deepEqual(
    result.sections.map((section) => ({
      id: section.id,
      time: section.time,
      moveDuration: section.moveDuration,
      start: section.start,
      end: section.end
    })),
    [
      { id: "a", time: 0, moveDuration: 0, start: 0, end: 0 },
      { id: "b", time: 8, moveDuration: 3, start: 5, end: 8 }
    ]
  );
});

test("hold left trim moves arrival while preserving the incoming move start", () => {
  const leftExtended = applyFormationTimelineEdit({
    sections: [
      { id: "a", time: 4, moveDuration: 4, start: 0, end: 4 },
      { id: "b", time: 12, moveDuration: 4, start: 8, end: 12 },
      { id: "c", time: 18, moveDuration: 2, start: 16, end: 18 }
    ],
    action: "trim-hold-left",
    sectionId: "b",
    time: 10
  });

  assert.equal(leftExtended.statusKind, "updated");
  assert.deepEqual(
    leftExtended.sections.map((section) => ({
      id: section.id,
      time: section.time,
      moveDuration: section.moveDuration,
      start: section.start,
      end: section.end
    })),
    [
      { id: "a", time: 4, moveDuration: 4, start: 0, end: 4 },
      { id: "b", time: 10, moveDuration: 2, start: 8, end: 10 },
      { id: "c", time: 18, moveDuration: 2, start: 16, end: 18 }
    ]
  );
  assert.equal(leftExtended.start, 10);
  assert.equal(leftExtended.end, 16);
  assert.equal(leftExtended.duration, 6);

  const rightShortened = applyFormationTimelineEdit({
    sections: leftExtended.sections,
    action: "trim-hold-left",
    sectionId: "b",
    time: 13
  });

  assert.deepEqual(
    rightShortened.sections.map((section) => ({
      id: section.id,
      time: section.time,
      moveDuration: section.moveDuration,
      start: section.start,
      end: section.end
    })),
    [
      { id: "a", time: 4, moveDuration: 4, start: 0, end: 4 },
      { id: "b", time: 13, moveDuration: 5, start: 8, end: 13 },
      { id: "c", time: 18, moveDuration: 2, start: 16, end: 18 }
    ]
  );
});

test("hold left trim clamps between incoming move start and next move start", () => {
  const beforePreviousHold = applyFormationTimelineEdit({
    sections: [
      { id: "a", time: 4, moveDuration: 4, start: 0, end: 4 },
      { id: "b", time: 12, moveDuration: 4, start: 8, end: 12 },
      { id: "c", time: 18, moveDuration: 2, start: 16, end: 18 }
    ],
    action: "trim-hold-left",
    sectionId: "b",
    time: 2
  });

  assert.equal(beforePreviousHold.sections[1].time, 8);
  assert.equal(beforePreviousHold.sections[1].moveDuration, 0);
  assert.equal(beforePreviousHold.start, 8);
  assert.equal(beforePreviousHold.end, 16);

  const pastNextMove = applyFormationTimelineEdit({
    sections: beforePreviousHold.sections,
    action: "trim-hold-left",
    sectionId: "b",
    time: 20
  });

  assert.equal(pastNextMove.sections[1].time, 16);
  assert.equal(pastNextMove.sections[1].moveDuration, 8);
  assert.equal(pastNextMove.start, 16);
  assert.equal(pastNextMove.end, 16);
});

test("movement keyframes clamp to segment-relative ratios and recalculate absolute time after trim", () => {
  const section = { id: "b", time: 20, moveDuration: 10 };
  const [first, second] = normalizeMovementKeyframes([{ id: "late", t: 1.4 }, { id: "early", t: -0.2 }]);

  assert.equal(first.id, "early");
  assert.equal(first.t, 0);
  assert.equal(second.t, 1);
  assert.equal(movementKeyframeTime(section, { t: 0.45 }), 14.5);
  assert.equal(movementKeyframeTime({ ...section, time: 30, moveDuration: 20 }, { t: 0.45 }), 19);
});

test("movement keyframe position patches materialize missing performers from section fallback", () => {
  const section = {
    id: "b",
    positions: {
      p1: { x: 10, y: 20 },
      p2: { x: 30, y: 40 }
    }
  };
  const keyframes = [
    { id: "kf1", t: 0.5, positions: { p1: { x: 15, y: 25 } } }
  ];

  assert.deepEqual(movementKeyframePositions(section, keyframes[0]), {
    p1: { x: 15, y: 25 },
    p2: { x: 30, y: 40 }
  });

  assert.deepEqual(
    applyMovementKeyframePositionPatch(keyframes, "kf1", section.positions, { p2: { x: 50, y: 60 } })[0].positions,
    {
      p1: { x: 15, y: 25 },
      p2: { x: 50, y: 60 }
    }
  );
});
