import assert from "node:assert/strict";
import test from "node:test";

import { cappedWaveformBarCount, createFrameCoalescer, V2_WAVEFORM_RENDER_BAR_LIMIT } from "./interactionFrame.mjs";

test("cappedWaveformBarCount limits long V2 timelines to a bounded DOM budget", () => {
  assert.equal(cappedWaveformBarCount(5280), V2_WAVEFORM_RENDER_BAR_LIMIT);
  assert.equal(cappedWaveformBarCount(320), 96);
  assert.equal(cappedWaveformBarCount(1188), 216);
});

test("createFrameCoalescer applies only the latest value once per frame", () => {
  const callbacks = [];
  let nextFrameId = 0;
  const scheduled = new Map();
  const coalescer = createFrameCoalescer((value) => callbacks.push(value), {
    requestAnimationFrame(callback) {
      nextFrameId += 1;
      scheduled.set(nextFrameId, callback);
      return nextFrameId;
    },
    cancelAnimationFrame(frameId) {
      scheduled.delete(frameId);
    }
  });

  coalescer.request({ scrollX: 10 });
  coalescer.request({ scrollX: 20 });
  coalescer.request({ scrollX: 30 });

  assert.equal(scheduled.size, 1);
  scheduled.get(1)();

  assert.deepEqual(callbacks, [{ scrollX: 30 }]);
  assert.equal(scheduled.size, 1);
});
