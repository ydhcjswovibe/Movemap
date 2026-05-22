import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
const selectedFormationBar = appSource.match(/<div className="selected-formation-bar">[\s\S]*?<\/div>\n          \)\}/)?.[0] || "";

test("formation creation uses the short add label", () => {
  assert.match(appSource, />대형 추가<\/button>/);
  assert.doesNotMatch(appSource, /현재 시간에 대형 만들기/);
});

test("selected formation timing uses compact tenth-second nudges", () => {
  assert.doesNotMatch(selectedFormationBar, /현재 시간으로 맞춤/);
  assert.match(selectedFormationBar, /onClick=\{\(\) => nudgeSelectedSection\(-0\.1\)\}>-<\/button>/);
  assert.match(selectedFormationBar, /onClick=\{\(\) => nudgeSelectedSection\(0\.1\)\}>\+<\/button>/);
});

test("selected formation bar shows the applied movement duration", () => {
  assert.match(selectedFormationBar, /<span>이동 시간<\/span>/);
  assert.match(selectedFormationBar, /\{pointMoveDuration\(selectedSection\)\}초 적용/);
});

test("movement duration quick choices use immediate and common durations", () => {
  assert.match(selectedFormationBar, /\[0, 2, 4, 8\]\.map/);
  assert.match(selectedFormationBar, /seconds === 0 \? "즉시" : `\$\{seconds\}초`/);
});
