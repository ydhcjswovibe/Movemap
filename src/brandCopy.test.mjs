import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
const htmlSource = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("uses Movemap as the product name in the browser and app intro", () => {
  assert.match(htmlSource, /<title>Movemap<\/title>/);
  assert.match(appSource, /Movemap/);
  assert.doesNotMatch(htmlSource, /안무 대형 플래너/);
});

test("uses neutral role and performance labels for broader formation rehearsal", () => {
  assert.match(appSource, /역할 A/);
  assert.match(appSource, /역할 B/);
  assert.match(appSource, /솔로\/그룹/);
  assert.match(appSource, /페어\/파트너/);
  assert.doesNotMatch(appSource, /샤인공연|커플공연/);
});

test("tries legacy local storage when the new Movemap key cannot be restored", () => {
  assert.match(appSource, /for \(const key of \[STORAGE_KEY, LEGACY_STORAGE_KEY\]\)/);
  assert.match(appSource, /continue;/);
});
