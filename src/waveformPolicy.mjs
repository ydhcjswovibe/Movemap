const WAVEFORM_VERSION = 1;
const DEFAULT_WAVEFORM_SAMPLES_PER_SECOND = 10;
const MIN_RENDER_BAR_HEIGHT = 0.18;

export function buildWaveformBars(count = 96) {
  return Array.from({ length: count }, (_, index) => {
    const wave = Math.sin(index * 0.55) * 0.5 + Math.sin(index * 0.17) * 0.35;
    return Math.max(MIN_RENDER_BAR_HEIGHT, Math.min(1, Math.abs(wave)));
  });
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function normalizePeakToByte(value) {
  return Math.max(0, Math.min(255, Math.round(clamp01(value) * 255)));
}

function validPeaks(peaks) {
  return Array.isArray(peaks) && peaks.length > 0 && peaks.every((peak) => Number.isInteger(peak) && peak >= 0 && peak <= 255);
}

export function buildStoredWaveformFromAudioBuffer(audioBuffer, options = {}) {
  const duration = Number(audioBuffer?.duration) || 0;
  const sampleRate = Number(audioBuffer?.sampleRate) || 0;
  const numberOfChannels = Math.max(0, Number(audioBuffer?.numberOfChannels) || 0);
  const samplesPerSecond = Math.max(1, Math.round(Number(options.samplesPerSecond) || DEFAULT_WAVEFORM_SAMPLES_PER_SECOND));
  if (!duration || !sampleRate || !numberOfChannels || typeof audioBuffer?.getChannelData !== "function") {
    return null;
  }

  const frameCount = Math.max(1, Math.round(duration * sampleRate));
  const peakCount = Math.max(1, Math.ceil(duration * samplesPerSecond));
  const framesPerPeak = Math.max(1, Math.ceil(frameCount / peakCount));
  const channelData = Array.from({ length: numberOfChannels }, (_, channel) => audioBuffer.getChannelData(channel));
  const peaks = Array.from({ length: peakCount }, (_, peakIndex) => {
    const start = peakIndex * framesPerPeak;
    const end = Math.min(frameCount, start + framesPerPeak);
    let peak = 0;
    for (const samples of channelData) {
      for (let index = start; index < end && index < samples.length; index += 1) {
        peak = Math.max(peak, Math.abs(samples[index]) || 0);
      }
    }
    return normalizePeakToByte(peak);
  });

  return {
    version: WAVEFORM_VERSION,
    samplesPerSecond,
    duration,
    fingerprint: String(options.fingerprint || ""),
    generatedAt: options.generatedAt || new Date().toISOString(),
    peaks
  };
}

export async function extractStoredWaveformFromFile(file, options = {}) {
  if (!file || typeof file.arrayBuffer !== "function") return null;
  const AudioContextCtor = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AudioContextCtor) return null;

  const context = new AudioContextCtor();
  try {
    const buffer = await file.arrayBuffer();
    const audioBuffer = await context.decodeAudioData(buffer.slice(0));
    return buildStoredWaveformFromAudioBuffer(audioBuffer, options);
  } finally {
    if (typeof context.close === "function") {
      try {
        await context.close();
      } catch {
        // Some browsers reject close() for already-closed contexts.
      }
    }
  }
}

export function waveformMatchesAudio(waveform, audio) {
  if (!waveform || waveform.version !== WAVEFORM_VERSION || !validPeaks(waveform.peaks)) return false;
  if (waveform.fingerprint && audio?.fingerprint && waveform.fingerprint !== audio.fingerprint) return false;
  return true;
}

export function waveformBarsForTimeline(waveform, options = {}) {
  const count = Math.max(1, Math.round(Number(options.count) || 96));
  if (!waveformMatchesAudio(waveform, { fingerprint: waveform?.fingerprint })) return [];
  const peaks = waveform.peaks;
  if (peaks.length === count) {
    return peaks.map((peak) => Math.max(MIN_RENDER_BAR_HEIGHT, peak / 255));
  }
  return Array.from({ length: count }, (_, index) => {
    const sourceIndex = Math.min(peaks.length - 1, Math.floor((index / count) * peaks.length));
    return Math.max(MIN_RENDER_BAR_HEIGHT, peaks[sourceIndex] / 255);
  });
}
