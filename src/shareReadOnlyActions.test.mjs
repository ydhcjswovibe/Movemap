import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("./App.jsx", import.meta.url), "utf8");

test("keeps the readonly share banner focused on editable copies", () => {
  const readonlyBanner = appSource.match(/\{readonly && \(\s*<div className="readonly-banner">[\s\S]*?<\/div>\s*\)\}/)?.[0] || "";

  assert.doesNotMatch(readonlyBanner, /exportJson/);
  assert.doesNotMatch(readonlyBanner, /저장하기/);
  assert.match(readonlyBanner, /<button onClick=\{saveEditableCopy\}>사본으로 편집<\/button>/);
});

test("uses cloud save as the default edit save action and keeps json for file sharing", () => {
  const shareActions = appSource.match(/<div className="share-actions">[\s\S]*?<\/div>/)?.[0] || "";

  assert.match(shareActions, /<button onClick=\{saveProjectToCloud\}>저장하기<\/button>/);
  assert.match(shareActions, /<button onClick=\{exportJson\}>\{readonly \? "JSON 내보내기" : "안무 파일 공유"\}<\/button>/);
  assert.match(shareActions, /<button onClick=\{\(\) => exportPng\(\)\}>현재 PNG<\/button>/);
  assert.match(shareActions, /<button onClick=\{exportAllPng\}>대형 PNG 전체 저장<\/button>/);
  assert.match(shareActions, /<button onClick=\{\(\) => window\.print\(\)\}>인쇄\/PDF<\/button>/);
});

test("offers file sharing fallbacks when cloud save fails", () => {
  const statusActions = appSource.match(/if \(statusRecovery === "share"[\s\S]*?if \(statusRecovery === "audio"/)?.[0] || "";

  assert.match(statusActions, /<button onClick=\{exportJson\}>안무 파일 공유<\/button>/);
  assert.match(statusActions, /<button onClick=\{\(\) => exportPng\(\)\}>현재 PNG<\/button>/);
  assert.match(statusActions, /<button onClick=\{\(\) => window\.print\(\)\}>인쇄\/PDF<\/button>/);
});

test("share link creation saves through the cloud project path", () => {
  const shareProject = appSource.match(/async function shareProject\(\) \{[\s\S]*?function exportJson/)?.[0] || "";

  assert.match(shareProject, /const saved = await persistProjectToCloud\(\);/);
  assert.match(shareProject, /\/share\/\$\{saved\.id\}/);
});
