import assert from "node:assert/strict";
import test from "node:test";

import { createShareUrl, normalizeShareOrigin } from "./shareUrl.mjs";

test("creates share links from the configured public origin", () => {
  assert.equal(
    createShareUrl("project-1", {
      publicShareOrigin: "https://stage-map-pi.vercel.app",
      currentOrigin: "http://localhost:5173"
    }),
    "https://stage-map-pi.vercel.app/share/project-1"
  );
});

test("removes trailing slashes from the configured public origin", () => {
  assert.equal(
    createShareUrl("project-1", {
      publicShareOrigin: "https://stage-map-pi.vercel.app/",
      currentOrigin: "http://localhost:5173"
    }),
    "https://stage-map-pi.vercel.app/share/project-1"
  );
});

test("falls back to the current browser origin when no public origin is configured", () => {
  assert.equal(
    createShareUrl("project-1", {
      publicShareOrigin: "",
      currentOrigin: "http://localhost:5173/"
    }),
    "http://localhost:5173/share/project-1"
  );
});

test("normalizes blank and non-string origins to empty strings", () => {
  assert.equal(normalizeShareOrigin("  https://example.com///"), "https://example.com");
  assert.equal(normalizeShareOrigin(null), "");
});
