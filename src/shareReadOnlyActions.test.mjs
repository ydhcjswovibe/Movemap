import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
const stylesSource = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

test("keeps the readonly share banner focused on editable copies", () => {
  const readonlyBanner = appSource.match(/\{readonly && !isV2Route && \(\s*<div className="readonly-banner">[\s\S]*?<\/div>\s*\)\}/)?.[0] || "";

  assert.doesNotMatch(readonlyBanner, /exportJson/);
  assert.doesNotMatch(readonlyBanner, /저장하기/);
  assert.match(readonlyBanner, /<button onClick=\{saveEditableCopy\}>사본으로 편집<\/button>/);
  assert.match(readonlyBanner, /readonly && !isV2Route/);
});

test("uses cloud save as the default edit save action and keeps json for file sharing", () => {
  const shareActions = appSource.match(/<div className="share-actions">[\s\S]*?<\/div>/)?.[0] || "";

  assert.match(shareActions, /<button onClick=\{saveProjectToCloud\}>저장하기<\/button>/);
  assert.match(shareActions, /<button onClick=\{exportJson\}>\{readonly \? "JSON 내보내기" : "프로젝트 파일 공유"\}<\/button>/);
  assert.match(shareActions, /<button onClick=\{\(\) => exportPng\(\)\} disabled=\{!canUseAdvancedExports\}>현재 PNG<\/button>/);
  assert.match(shareActions, /<button onClick=\{exportAllPng\} disabled=\{!canUseAdvancedExports\}>대형 PNG 전체 저장<\/button>/);
  assert.match(shareActions, /<button onClick=\{\(\) => window\.print\(\)\} disabled=\{!canUseAdvancedExports\}>인쇄\/PDF<\/button>/);
});

test("offers file sharing fallbacks when cloud save fails", () => {
  const statusActions = appSource.match(/if \(statusRecovery === "share"[\s\S]*?if \(statusRecovery === "audio"/)?.[0] || "";

  assert.match(statusActions, /<button onClick=\{exportJson\}>프로젝트 파일 공유<\/button>/);
  assert.match(statusActions, /<button onClick=\{\(\) => exportPng\(\)\} disabled=\{!canUseAdvancedExports\}>현재 PNG<\/button>/);
  assert.match(statusActions, /<button onClick=\{\(\) => window\.print\(\)\} disabled=\{!canUseAdvancedExports\}>인쇄\/PDF<\/button>/);
});

test("keeps readonly playback in the timeline while hiding edit capture", () => {
  const timeline = appSource.match(/<div className="timeline-editor"[\s\S]*?<audio/)?.[0] || "";
  const timelineRule = stylesSource.match(/\.timeline-editor \{[\s\S]*?\}/)?.[0] || "";

  assert.match(timeline, /className="primary playback-button timeline-icon-button"/);
  assert.match(timeline, /label=\{isPlaying \? "정지" : "재생"\}/);
  assert.match(timeline, /onClick=\{togglePlayback\}/);
  assert.match(timeline, /disabled=\{!hasUsableAudio\}/);
  assert.match(timeline, /\{!readonly && \(/);
  assert.match(timeline, /className="secondary capture-button timeline-icon-button timeline-add-button"/);
  assert.match(timeline, /label="현재 시간에 대형 추가"/);
  assert.match(timeline, /onClick=\{\(\) => addSection\(\{ forceAppend: true \}\)\}/);
  assert.match(timeline, /<span className="timeline-row-label">Forms<\/span>/);
  assert.match(timeline, /<span className="timeline-row-label">Audio<\/span>/);
  assert.match(timelineRule, /overflow:\s*hidden;/);
});

test("share link creation saves through the cloud project path", () => {
  const shareProject = appSource.match(/async function shareProject\(\) \{[\s\S]*?function exportJson/)?.[0] || "";

  assert.match(shareProject, /const saved = await persistProjectToCloud\(\);/);
  assert.match(shareProject, /const editToken = saved\.plan\.shareLinks\?\.edit\?\.token \|\| createEditLinkToken\(\);/);
  assert.match(shareProject, /projectWithShareLink\(saved\.plan, \{ linkType: LINK_TYPES\.view, projectId: saved\.id \}\)/);
  assert.match(shareProject, /setShareUrl\(shareUrlForProject\(linkedSaved\.id\)\);/);
  assert.match(shareProject, /setEditShareUrl\(editShareUrlForProject\(linkedSaved\.id, linkedSaved\.plan\.shareLinks\?\.edit\?\.token \|\| editToken\)\);/);
});

test("offers a copy button for generated share links", () => {
  const copyShareUrl = appSource.match(/async function copyShareUrl\(\) \{[\s\S]*?function exportJson/)?.[0] || "";
  const shareMenu = appSource.match(/function renderShareMenu\(\) \{[\s\S]*?function renderFormationPanel/)?.[0] || "";
  const sharePanel = appSource.match(/function renderSharePanel\(\) \{[\s\S]*?function renderToolDrawerContent/)?.[0] || "";

  assert.match(copyShareUrl, /navigator\.clipboard\?\.writeText/);
  assert.match(copyShareUrl, /공유 링크를 복사했습니다/);
  assert.match(shareMenu, /<button onClick=\{copyShareUrl\}>보기 링크 복사<\/button>/);
  assert.match(shareMenu, /<button onClick=\{copyEditShareUrl\}>편집 링크 복사<\/button>/);
  assert.match(sharePanel, /보기 링크/);
  assert.match(sharePanel, /편집 링크/);
  assert.match(sharePanel, /<button onClick=\{copyShareUrl\}>복사<\/button>/);
  assert.match(sharePanel, /<button onClick=\{copyEditShareUrl\}>복사<\/button>/);
});
