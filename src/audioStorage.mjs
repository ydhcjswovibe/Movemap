export const MOVEMAP_AUDIO_BUCKET = "movemap-audio";
export const LEGACY_AUDIO_BUCKET = "choreo-audio";

export function audioPublicUrl(storagePath, { url = "", bucket = MOVEMAP_AUDIO_BUCKET } = {}) {
  if (!url || !storagePath) return "";
  return `${url}/storage/v1/object/public/${bucket}/${encodeURI(storagePath)}`;
}

export function audioSourceCandidates(audio, config = {}) {
  if (!audio) return [];
  const bucket = audio.bucket || MOVEMAP_AUDIO_BUCKET;
  const candidates = [
    audio.publicUrl,
    audioPublicUrl(audio.storagePath, { ...config, bucket }),
    audioPublicUrl(audio.storagePath, { ...config, bucket: LEGACY_AUDIO_BUCKET })
  ];
  return candidates.filter(Boolean).filter((url, index, urls) => urls.indexOf(url) === index);
}

export function nextAudioSourceCandidate(audio, config = {}, rejectedUrls = []) {
  const rejected = new Set(rejectedUrls.filter(Boolean));
  return audioSourceCandidates(audio, config).find((url) => !rejected.has(url)) || "";
}
