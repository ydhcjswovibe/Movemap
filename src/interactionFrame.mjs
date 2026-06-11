export const V2_WAVEFORM_RENDER_BAR_LIMIT = 360;

export function cappedWaveformBarCount(contentWidth, options = {}) {
  const minCount = Math.max(1, Math.round(Number(options.minCount) || 96));
  const maxCount = Math.max(minCount, Math.round(Number(options.maxCount) || V2_WAVEFORM_RENDER_BAR_LIMIT));
  const pixelsPerBar = Math.max(1, Number(options.pixelsPerBar) || 5.5);
  const requested = Math.ceil(Math.max(0, Number(contentWidth) || 0) / pixelsPerBar);
  return Math.max(minCount, Math.min(maxCount, requested));
}

export function createFrameCoalescer(callback, scheduler = {}) {
  const requestFrame = scheduler.requestAnimationFrame || globalThis.requestAnimationFrame;
  const cancelFrame = scheduler.cancelAnimationFrame || globalThis.cancelAnimationFrame;
  if (typeof callback !== "function") {
    throw new TypeError("createFrameCoalescer requires a callback");
  }
  if (typeof requestFrame !== "function") {
    throw new TypeError("createFrameCoalescer requires requestAnimationFrame");
  }

  let frame = 0;
  let latestValue;

  const flush = () => {
    frame = 0;
    const value = latestValue;
    latestValue = undefined;
    callback(value);
  };

  return {
    request(value) {
      latestValue = value;
      if (frame) return;
      frame = requestFrame(flush);
    },
    flush() {
      if (frame && typeof cancelFrame === "function") cancelFrame(frame);
      if (frame) flush();
    },
    cancel() {
      if (frame && typeof cancelFrame === "function") cancelFrame(frame);
      frame = 0;
      latestValue = undefined;
    }
  };
}
