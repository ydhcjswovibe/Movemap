import assert from "node:assert/strict";
import test from "node:test";

import { audioPublicUrl, audioSourceCandidates, nextAudioSourceCandidate, MOVEMAP_AUDIO_BUCKET } from "./audioStorage.mjs";

test("builds new audio public URLs from the Movemap bucket", () => {
  assert.equal(MOVEMAP_AUDIO_BUCKET, "movemap-audio");
  assert.equal(
    audioPublicUrl("projects/demo/audio/song.mp3", { url: "https://example.supabase.co" }),
    "https://example.supabase.co/storage/v1/object/public/movemap-audio/projects/demo/audio/song.mp3"
  );
});

test("keeps legacy choreo storage paths playable as fallback candidates", () => {
  assert.deepEqual(
    audioSourceCandidates(
      { storagePath: "projects/demo/audio/song.mp3" },
      { url: "https://example.supabase.co" }
    ),
    [
      "https://example.supabase.co/storage/v1/object/public/movemap-audio/projects/demo/audio/song.mp3",
      "https://example.supabase.co/storage/v1/object/public/choreo-audio/projects/demo/audio/song.mp3"
    ]
  );
});

test("selects the next untried audio source and stops after all candidates fail", () => {
  const audio = {
    publicUrl: "https://cdn.example/audio.mp3",
    storagePath: "projects/demo/audio/song.mp3"
  };
  const config = { url: "https://example.supabase.co" };

  assert.equal(
    nextAudioSourceCandidate(audio, config, ["https://cdn.example/audio.mp3"]),
    "https://example.supabase.co/storage/v1/object/public/movemap-audio/projects/demo/audio/song.mp3"
  );
  assert.equal(
    nextAudioSourceCandidate(audio, config, [
      "https://cdn.example/audio.mp3",
      "https://example.supabase.co/storage/v1/object/public/movemap-audio/projects/demo/audio/song.mp3",
      "https://example.supabase.co/storage/v1/object/public/choreo-audio/projects/demo/audio/song.mp3"
    ]),
    ""
  );
});
