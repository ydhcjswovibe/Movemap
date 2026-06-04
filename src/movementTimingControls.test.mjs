import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
const styleSource = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
const coolIconSource = readFileSync(new URL("./icons/CoolIcon.jsx", import.meta.url), "utf8");
const iconHintSource = readFileSync(new URL("./IconHintButton.jsx", import.meta.url), "utf8");
const topActionDropdownSource = readFileSync(new URL("./TopActionDropdown.jsx", import.meta.url), "utf8");
const attributionSource = readFileSync(new URL("../docs/third-party-attribution.md", import.meta.url), "utf8");
const selectedFormationStart = appSource.indexOf("<div className=\"selected-formation-bar\">");
const selectedFormationEnd = appSource.indexOf("\n          )}\n        </section>", selectedFormationStart);
const selectedFormationBar = selectedFormationStart === -1
  ? ""
  : appSource.slice(selectedFormationStart, selectedFormationEnd === -1 ? undefined : selectedFormationEnd);
const selectedFormationTools = appSource.match(/<div className="selected-formation-tools">[\s\S]*?<\/div>\s*\)\}/)?.[0] || "";
const formationPanel = appSource.match(/function renderFormationPanel\(\) \{[\s\S]*?\n  \}/)?.[0] || "";
const formationPointerDown = appSource.match(/function onFormationPointerDown\(event, section, index, mode\) \{[\s\S]*?\n  \}\n\n  function onMovementKeyframePointerDown/)?.[0] || "";

test("formation creation uses the short add label", () => {
  assert.match(appSource, /label="대형 추가"/);
  assert.doesNotMatch(appSource, /현재 시간에 대형 만들기/);
});

test("icon hint button centralizes icon labels and compact hints", () => {
  assert.match(appSource, /import IconHintButton, \{ IconHintOverlay \} from "\.\/IconHintButton\.jsx";/);
  assert.match(appSource, /<IconHintOverlay \/>/);
  assert.match(iconHintSource, /function IconHintButton\(/);
  assert.match(iconHintSource, /function IconHintOverlay\(/);
  assert.match(iconHintSource, /"aria-label": label/);
  assert.match(iconHintSource, /title: label/);
  assert.match(iconHintSource, /window\.dispatchEvent\(new CustomEvent\(HINT_EVENT/);
  assert.match(iconHintSource, /emitIconHint\(hintId, label, event\.currentTarget\)/);
  assert.match(iconHintSource, /setHint\(event\.detail\)/);
  assert.match(iconHintSource, /window\.setTimeout\(\(\) => setHint\(null\), HINT_LIFETIME_MS\)/);
  assert.match(iconHintSource, /clampHintLeft/);
  assert.match(iconHintSource, /"--icon-hint-left"/);
  assert.match(styleSource, /\.icon-hint-wrapper/);
  assert.match(styleSource, /\.icon-hint-popover/);
  assert.match(styleSource, /position: fixed;/);
  assert.match(styleSource, /@keyframes icon-hint-pop-above/);
});

test("timeline controls use a single icon rail", () => {
  const railSource = appSource.match(/<div className="timeline-control-rail">[\s\S]*?<div className="timeline-workbench">/)?.[0] || "";

  assert.match(railSource, /IconHintButton/);
  assert.match(railSource, /iconName=\{isPlaying \? "pause" : "play"\}/);
  assert.match(railSource, /iconName="undo"/);
  assert.match(railSource, /iconName="redo"/);
  assert.match(railSource, /iconName="timer-add"/);
  assert.match(railSource, /iconName="zoom-minus"/);
  assert.match(railSource, /iconName="zoom-plus"/);
  assert.match(railSource, /className="timeline-time-readout"/);
  assert.match(railSource, /className="secondary capture-button timeline-icon-button timeline-add-button"/);
  assert.doesNotMatch(railSource, />대형 추가<\/button>/);
  assert.match(appSource, /function onTimelinePointerDown\(event\)/);
  assert.match(appSource, /function onTimelinePointerMove\(event\)/);
  assert.match(appSource, /function onTimelinePointerUp\(event\)/);
  assert.match(styleSource, /\.timeline-control-rail/);
  assert.match(styleSource, /flex-wrap: nowrap/);
});

test("mobile timeline keeps formation blocks compact and readable", () => {
  const portraitMobile = styleSource.match(/@media \(max-width: 840px\) and \(orientation: portrait\)[\s\S]*?@media \(max-width: 920px\) and \(orientation: landscape\)/)?.[0] || "";

  assert.match(styleSource, /@media \(max-width: 840px\) and \(orientation: portrait\) \{/);
  assert.match(portraitMobile, /\.formation-block \{[\s\S]*?height:\s*calc\(100% - 8px\);/);
  assert.match(portraitMobile, /\.formation-block \{[\s\S]*?overflow:\s*hidden;/);
  assert.match(portraitMobile, /\.formation-block-index \{[\s\S]*?font-size:\s*9px;/);
  assert.match(portraitMobile, /\.formation-block strong \{[\s\S]*?line-height:\s*1;/);
  assert.match(styleSource, /\.formation-block em \{[\s\S]*?grid-column:\s*2;/);
  assert.match(styleSource, /\.timeline-control-rail \{[\s\S]*?gap:\s*5px;/);
  assert.match(styleSource, /@media \(max-width: 840px\) and \(orientation: portrait\) \{[\s\S]*?\.timeline-zoom-controls \{[\s\S]*?padding:\s*0;[\s\S]*?background:\s*transparent;/);
  assert.match(styleSource, /@media \(max-width: 840px\) and \(orientation: portrait\) \{[\s\S]*?\.timeline-control-rail \.icon-hint-wrapper,[\s\S]*?\.timeline-zoom-controls \.icon-hint-wrapper \{[\s\S]*?width:\s*34px;[\s\S]*?min-width:\s*34px;/);
  assert.match(styleSource, /\.audio-lane \{[\s\S]*?min-height:\s*42px;/);
  assert.match(portraitMobile, /\.timeline-ruler-viewport \{[\s\S]*?height:\s*22px;/);
  assert.match(portraitMobile, /\.timeline-lane \{[\s\S]*?min-height:\s*48px;/);
  assert.match(portraitMobile, /\.audio-lane \{[\s\S]*?min-height:\s*34px;/);
});

test("new projects start with a single four-second intro formation", () => {
  const defaultSectionsSource = appSource.match(/function defaultSections\(performers\) \{[\s\S]*?\n\}/)?.[0] || "";

  assert.match(defaultSectionsSource, /name: "Intro"/);
  assert.match(defaultSectionsSource, /time: 4/);
  assert.match(defaultSectionsSource, /moveDuration: 4/);
  assert.match(defaultSectionsSource, /start: 0/);
  assert.match(defaultSectionsSource, /end: 4/);
  assert.match(defaultSectionsSource, /moveMode: "hold"/);
  assert.doesNotMatch(defaultSectionsSource, /name: "Change"/);
});

test("bottom timeline uses formation and audio lanes", () => {
  assert.match(appSource, /className="timeline-editor"/);
  assert.match(appSource, /<span className="timeline-row-label">Forms<\/span>/);
  assert.match(appSource, /<span className="timeline-row-label">Audio<\/span>/);
  assert.match(appSource, /formationTimelineLabel\(index\)/);
  assert.match(appSource, /layoutFormationBlocks\(sortedSections, timelinePixelsPerSecond, \{/);
  assert.match(appSource, /introAsSegment: true/);
  assert.match(appSource, /timelineFormationBlocks/);
  assert.doesNotMatch(appSource, /visualLeftPx/);
  assert.doesNotMatch(appSource, /visualShiftPx/);
  assert.match(appSource, /"--formation-left": `\$\{block\.leftPx\}px`/);
  assert.match(appSource, /"--formation-logical-left": `\$\{block\.logicalLeftPx\}px`/);
  assert.doesNotMatch(appSource, /"--formation-top"/);
  assert.match(appSource, /"--formation-width": `\$\{block\.widthPx\}px`/);
  assert.match(appSource, /"--formation-hit-width": `\$\{block\.hitWidthPx\}px`/);
  assert.match(appSource, /"--formation-arrival": `\$\{block\.arrivalPx\}px`/);
  assert.match(appSource, /formatTime\(block\.displayStartTime\)/);
  assert.match(appSource, /formatTime\(block\.displayEndTime\)/);
  assert.match(appSource, /className="timeline-viewport timeline-ruler-viewport"/);
  assert.match(appSource, /onWheel=\{onTimelineWheel\}/);
  assert.match(appSource, /label="현재 시간에 대형 추가"/);
});

test("timeline edits use tenth-second quantization", () => {
  assert.match(appSource, /quantizeTimelineTime/);
  assert.match(appSource, /gridSize:\s*0\.1/);
  assert.match(appSource, /const safe = quantizeTimelineTime\(seconds\);/);
  assert.match(appSource, /quantizeTimelineTime\(pointMoveStart\(section\) \+ pointMoveDuration\(section\)/);
  assert.match(appSource, /setTimelineSnapTime\(absoluteTime\);/);
});

test("formation blocks use HitCut-style pixel timeline controls", () => {
  const formationBlockRule = styleSource.match(/\.formation-block \{[\s\S]*?\}/)?.[0] || "";
  const formationMarkerRule = styleSource.match(/\.formation-block\.marker \{[\s\S]*?\}/)?.[0] || "";
  const viewportRule = styleSource.match(/\.timeline-viewport \{[\s\S]*?\}/)?.[0] || "";

  assert.doesNotMatch(formationBlockRule, /--formation-marker-half/);
  assert.match(formationBlockRule, /top:\s*8px;/);
  assert.match(formationBlockRule, /left:\s*var\(--formation-left\);/);
  assert.match(formationBlockRule, /box-sizing:\s*border-box;/);
  assert.match(formationBlockRule, /width:\s*var\(--formation-hit-width, var\(--formation-width\)\);/);
  assert.match(formationBlockRule, /min-height:\s*52px;/);
  assert.match(formationMarkerRule, /width:\s*var\(--formation-hit-width, 132px\);/);
  assert.match(styleSource, /\.formation-block\.tick \{[\s\S]*?width:\s*0;/);
  assert.match(styleSource, /\.formation-block\.tick::before \{/);
  assert.doesNotMatch(formationMarkerRule, /transform:\s*translateX\(-50%\);/);
  assert.match(viewportRule, /overflow:\s*hidden;/);
  assert.match(styleSource, /\.formation-block\.segment \{[\s\S]*?min-width:\s*0;/);
  assert.doesNotMatch(styleSource, /\.formation-block \{[\s\S]*?width:\s*max\(/);
  assert.doesNotMatch(styleSource, /width:\s*max\(96px, var\(--formation-width\)\);/);
  assert.match(styleSource, /\.timeline-snapline \{/);
});

test("bottom timeline scrolls inside the stage card instead of widening it", () => {
  const stageAreaRule = styleSource.match(/\.stage-area \{[\s\S]*?\}/)?.[0] || "";
  const timelineRule = styleSource.match(/\.timeline-editor \{[\s\S]*?\}/)?.[0] || "";

  assert.match(stageAreaRule, /min-width:\s*0;/);
  assert.match(timelineRule, /width:\s*100%;/);
  assert.match(timelineRule, /max-width:\s*100%;/);
  assert.match(timelineRule, /min-width:\s*0;/);
  assert.match(timelineRule, /overflow:\s*hidden;/);
});

test("selected formation timing is read-only because trim handles own timing edits", () => {
  assert.doesNotMatch(selectedFormationBar, /현재 시간으로 맞춤/);
  assert.doesNotMatch(selectedFormationBar, /nudgeSelectedArrival/);
  assert.doesNotMatch(selectedFormationBar, /nudgeSelectedMoveStart/);
  assert.doesNotMatch(selectedFormationBar, /setSelectedMoveDuration/);
  assert.doesNotMatch(selectedFormationBar, /arrival-nudges/);
  assert.doesNotMatch(selectedFormationBar, /duration-chips/);
  assert.doesNotMatch(formationPanel, /type="number" step="0\.1" value=\{pointTime\(selectedSection\)\}/);
  assert.doesNotMatch(formationPanel, /type="number" min="0" step="0\.1" value=\{pointMoveDuration\(selectedSection\)\}/);
  assert.doesNotMatch(formationPanel, /updateSection\(selectedSection\.id, \{ time,/);
  assert.doesNotMatch(formationPanel, /updateSection\(selectedSection\.id, \{ moveDuration,/);
  assert.match(formationPanel, /className="readonly-field"/);
});

test("selected formation bar separates arrival and movement start timing", () => {
  assert.match(selectedFormationBar, /<span>도착 시각<\/span>/);
  assert.match(selectedFormationBar, /\{formatTime\(pointTime\(selectedSection\)\)\}/);
  assert.match(selectedFormationBar, /<span>이동 시작<\/span>/);
  assert.match(selectedFormationBar, /\{formatTime\(pointMoveStart\(selectedSection\)\)\}/);
  assert.match(selectedFormationBar, /<span>이동 시간<\/span>/);
  assert.match(selectedFormationBar, /\{pointMoveDuration\(selectedSection\)\}초 · 도착 전부터 이동/);
});

test("selected formation bar keeps structural actions in tools", () => {
  assert.doesNotMatch(selectedFormationBar, /duplicateSection/);
  assert.doesNotMatch(selectedFormationBar, /deleteSection/);
  assert.doesNotMatch(selectedFormationBar, /resetSelectedFormation/);

  assert.match(selectedFormationTools, /<span>선택 대형<\/span>/);
  assert.match(selectedFormationTools, /\{selectedSection\?\.name \|\| "대형 없음"\}/);
  assert.match(selectedFormationTools, /<button onClick=\{duplicateSection\}>복제<\/button>/);
  assert.match(selectedFormationTools, /<button className="danger-button compact-danger" onClick=\{deleteSection\} disabled=\{sortedSections\.length <= 1\}/);
  assert.match(selectedFormationTools, /<button className="danger-button compact-danger" onClick=\{resetSelectedFormation\}>대형 초기화<\/button>/);
});

test("movement timing cannot overlap adjacent formations", () => {
  const updateTiming = appSource.match(/function updateSectionTiming\(sectionId, time, moveDuration = null, options = \{\}\) \{[\s\S]*?\n  \}/)?.[0] || "";

  assert.match(appSource, /applyFormationTimelineEdit/);
  assert.match(updateTiming, /applyFormationTimelineEdit\(\{/);
  assert.match(updateTiming, /action: "trim-right"/);
  assert.match(updateTiming, /sections: sortedSections/);
  assert.match(updateTiming, /sectionId,/);
});

test("selected formation segment exposes drag and two trim handles", () => {
  const leftHandleRule = styleSource.match(/\.formation-resize-handle\.left \{[\s\S]*?\}/)?.[0] || "";
  const rightHandleRule = styleSource.match(/\.formation-resize-handle\.right \{[\s\S]*?\}/)?.[0] || "";

  assert.match(appSource, /className="formation-resize-handle left"/);
  assert.match(appSource, /className="formation-resize-handle right"/);
  assert.match(appSource, /onFormationPointerDown\(event, section, index, "body"\)/);
  assert.match(appSource, /onFormationPointerDown\(event, section, index, "left"\)/);
  assert.match(appSource, /onFormationPointerDown\(event, section, index, "right"\)/);
  assert.match(appSource, /const rawStart = startMoveStart \+ deltaTime;/);
  assert.match(appSource, /snapTimelineTime\(rawStart, section, previousArrival, startArrival\)/);
  assert.match(appSource, /applyFormationTimelineEdit\(\{/);
  assert.match(appSource, /action: "trim-right"/);
  assert.match(appSource, /action: "move-body"/);
  assert.match(appSource, /deltaTime,/);
  assert.match(appSource, /replaceSectionsIfChanged\(dragResult\.sections\);/);
  assert.match(formationPointerDown, /setTimeout\(startBodyMoveEdit, LONG_PRESS_MS\)/);
  assert.match(formationPointerDown, /if \(!longPressConfirmed\) \{[\s\S]*seekTimelineToTime\(timeFromTimelineClientX\(clientX\)\);[\s\S]*return;/);
  assert.match(formationPointerDown, /startBodyMoveEdit\(\);\n      const dragResult = applyFormationTimelineEdit\(\{/);
  assert.doesNotMatch(formationPointerDown, /openSelectedFormationPanel\(section\.id\)/);
  assert.match(leftHandleRule, /left:\s*2px;/);
  assert.match(rightHandleRule, /right:\s*2px;/);
});

test("selected movement segments expose keyframe ticks and reorder preview", () => {
  assert.match(appSource, /movement-keyframe-tick/);
  assert.match(appSource, /stageEditTargetLabel/);
  assert.match(appSource, /movement-edit-target keyframe/);
  assert.match(appSource, /movement-edit-status keyframe/);
  assert.match(appSource, />도착 대형 편집<\/button>/);
  assert.match(appSource, /aria-label=\{`이동 keyframe/);
  assert.match(appSource, /addMovementKeyframeAtCurrentTime/);
  assert.match(appSource, /deleteSelectedMovementKeyframe/);
  assert.match(appSource, /onMovementKeyframePointerDown/);
  assert.match(appSource, /movementKeyframePositions\(selectedSection, selectedMovementKeyframe\)/);
  assert.match(appSource, /sectionWithPositionPatch\(item, nextPositions, keyframeId/);
  assert.match(appSource, /keyframeId: selectedMovementKeyframe\?\.id \|\| ""/);
  assert.match(appSource, /disabled=\{!canAddMovementKeyframe\}/);
  assert.match(appSource, /action: "move-body"/);
  assert.doesNotMatch(appSource, /Math\.abs\(clientX - startClientX\) >= 32/);
  assert.match(appSource, /action: "reorder"/);
  assert.match(appSource, /timeline-reorder-preview/);
  assert.match(appSource, /timeline-reorder-slot/);
  assert.doesNotMatch(appSource, /className="timeline-reorder-order"/);
  assert.match(styleSource, /\.movement-keyframe-tick \{/);
  assert.match(styleSource, /\.movement-edit-target\.keyframe \{/);
  assert.match(styleSource, /\.movement-edit-status\.keyframe \{/);
  assert.match(styleSource, /\.timeline-reorder-preview \{/);
  assert.match(styleSource, /\.timeline-reorder-slot \{/);
  assert.doesNotMatch(styleSource, /\.timeline-reorder-order \{/);
  assert.match(styleSource, /--formation-hit-width/);
  assert.match(styleSource, /--formation-handle-width/);
  assert.match(appSource, /timelineBlockedEdge/);
  assert.match(styleSource, /\.formation-block\.blocked-left,/);
  assert.match(styleSource, /\.formation-block\.blocked-right/);
});

test("timeline pointer drags batch undo history until pointerup", () => {
  assert.match(appSource, /interactiveEditSnapshotRef/);
  assert.match(appSource, /beginInteractiveEdit\(\);/);
  assert.match(appSource, /finishInteractiveEdit\(hasEdited\);/);
  assert.match(appSource, /replaceSectionsIfChanged\(result\.sections\);/);
  assert.match(appSource, /replaceSectionsIfChanged\(dragResult\.sections\);/);
  assert.match(appSource, /\{ history: false \}/);
  assert.match(appSource, /updateMovementKeyframes\(section\.id,[\s\S]*?\{ history: false \}\)/);
});

test("formation add follows sequential append selection policy", () => {
  const addSection = appSource.match(/function addSection\(\{ forceAppend = false \} = \{\}\) \{[\s\S]*?\n  \}/)?.[0] || "";

  assert.match(addSection, /const target = resolveFormationAddTarget\(sortedSections, captureTime\);/);
  assert.match(addSection, /if \(target\.action === "select" && !forceAppend\)/);
  assert.match(addSection, /setSelectedSectionId\(target\.section\.id\);/);
  assert.match(addSection, /const time = target\.action === "select" \? pointTime\(sortedSections\.at\(-1\)\) : target\.time;/);
  assert.match(addSection, /const previous = target\.action === "select" \? sortedSections\.at\(-1\) : target\.previous;/);
  assert.match(addSection, /action: "add-after"/);
  assert.match(addSection, /const nextSections = result\.sections\.map/);
  assert.match(addSection, /sections: nextSections/);
});

test("top actions expose save share and tools without legacy tabs", () => {
  assert.match(appSource, /<button className="primary" onClick=\{\(\) => \{ closeTopActionMenu\(\); saveProjectToCloud\(\); \}\}>저장하기<\/button>/);
  assert.match(appSource, /import TopActionDropdown, \{ TOP_ACTION_MENUS \} from "\.\/TopActionDropdown\.jsx";/);
  assert.match(topActionDropdownSource, /export const TOP_ACTION_MENUS = Object\.freeze\(\{/);
  assert.match(topActionDropdownSource, /function closeOnEscape\(event\)/);
  assert.match(topActionDropdownSource, /function closeOnOutsidePointerDown\(event\)/);
  assert.match(topActionDropdownSource, /scopeRef\.current\?\.contains\(event\.target\)/);
  assert.match(topActionDropdownSource, /document\.addEventListener\("keydown", closeOnEscape\);/);
  assert.match(topActionDropdownSource, /document\.addEventListener\("pointerdown", closeOnOutsidePointerDown\);/);
  assert.match(appSource, /const \[topActionMenu, setTopActionMenu\] = useState\(""\);/);
  assert.match(appSource, /const \[topActionSurface, setTopActionSurface\] = useState\(""\);/);
  assert.match(appSource, /<button onClick=\{returnToProjectPicker\}>프로젝트 선택으로 돌아가기<\/button>/);
  assert.match(appSource, /localStorage\.removeItem\(STORAGE_KEY\);/);
  assert.match(appSource, /renderShareMenu\(\)/);
  assert.match(appSource, /renderDownloadMenu\(\)/);
  assert.match(appSource, /renderMoreMenu\(\)/);
  assert.match(appSource, /menu=\{TOP_ACTION_MENUS\.share\}/);
  assert.match(appSource, /menu=\{TOP_ACTION_MENUS\.download\}/);
  assert.match(appSource, /menu=\{TOP_ACTION_MENUS\.more\}/);
  assert.match(appSource, /activeSurface=\{topActionSurface\}/);
  assert.match(appSource, /surface="mobile"/);
  assert.match(appSource, /surface="desktop"/);
  assert.doesNotMatch(appSource, /document\.addEventListener\("keydown", closeTopActionMenuOnEscape\);/);
  assert.doesNotMatch(appSource, /document\.addEventListener\("pointerdown", closeTopActionMenuOnOutsideClick\);/);
  assert.match(appSource, /setShareLinkEnabled\(LINK_TYPES\.view/);
  assert.match(appSource, /setShareLinkEnabled\(LINK_TYPES\.edit/);
  assert.doesNotMatch(appSource, /링크 관리 열기/);
  assert.doesNotMatch(appSource, /isProjectMenuOpen/);
  assert.doesNotMatch(appSource, /isShareMenuOpen/);
  assert.match(appSource, /\{isToolDrawerOpen \? "도구 닫기" : "도구"\}/);
  assert.doesNotMatch(appSource, /const MOBILE_TABS/);
  assert.doesNotMatch(appSource, /renderMobileTabs/);
});

test("mobile header owns global commands and management actions live in more panel", () => {
  assert.match(appSource, /<header className="mobile-status-bar" aria-label="모바일 프로젝트 상태">/);
  assert.match(appSource, /<header className="global-command-bar desktop-command-bar" aria-label="전역 명령">/);
  assert.match(appSource, /<div className="mobile-status-title">/);
  assert.match(appSource, /<strong className="mobile-project-title">\{plan\.title\}<\/strong>/);
  assert.match(appSource, /<div className="mobile-status-meta">/);
  assert.match(appSource, /const MOBILE_GLOBAL_ACTIONS = \[/);
  assert.match(appSource, /\{ key: "save", icon: "save", label: "저장" \}/);
  assert.match(appSource, /\{ key: "share", icon: "share", label: "공유" \}/);
  assert.match(appSource, /\{ key: "download", icon: "download", label: "다운로드" \}/);
  assert.match(appSource, /\{ key: "more", icon: "more", label: "더보기" \}/);
  assert.match(appSource, /<div className="mobile-global-actions" aria-label="모바일 전역 명령">/);
  const mobileGlobalActionsBlock = appSource.match(/<div className="mobile-global-actions" aria-label="모바일 전역 명령">[\s\S]*?<\/div>/)?.[0] || "";
  assert.doesNotMatch(mobileGlobalActionsBlock, /showLabel/);
  assert.match(styleSource, /@media \(max-width: 920px\)[\s\S]*?\.mobile-global-actions \.top-action-group \{\s*position: static;/);
  assert.match(appSource, /const mobileMoreStatusItems = \[/);
  assert.match(appSource, /<div className="top-menu-status-row compact" aria-label="프로젝트 상태 요약">/);
  assert.match(appSource, /label: "계정"/);
  assert.match(appSource, /label: "음악"/);
  assert.match(appSource, /label: "공유"/);
  assert.match(appSource, /label: "출력"/);
  assert.match(appSource, /role="menu" aria-label="더보기 메뉴"/);
  assert.doesNotMatch(appSource, /mobile-state-card/);
  assert.match(styleSource, /\.desktop-command-bar \{\s*display: none;/);
  assert.match(styleSource, /@media \(max-width: 920px\) and \(orientation: landscape\)[\s\S]*?\.desktop-command-bar \{\s*display: none;/);
});

test("mobile compression uses Coolicons with Wanted-inspired local tokens", () => {
  assert.match(iconHintSource, /import CoolIcon from "\.\/icons\/CoolIcon\.jsx";/);
  assert.match(appSource, /const MOBILE_ACTION_GROUPS = Object\.freeze\(\{/);
  assert.match(appSource, /MOBILE_ACTION_GROUPS\[mobileActionMode\]/);
  assert.match(appSource, /const activeMobilePanelActionKey = isMobilePanelOpen \? \{/);
  assert.match(appSource, /\[MOBILE_PANEL_KINDS\.view\]: "view"/);
  assert.match(appSource, /isActive \? "active" : ""/);
  assert.match(appSource, /pressed=\{isActive\}/);
  assert.match(iconHintSource, /pressed,/);
  assert.match(iconHintSource, /controlProps\["aria-pressed"\] = pressed;/);
  assert.match(appSource, /\{ key: "people", icon: "users", label: "사람" \}/);
  assert.match(appSource, /\{ key: "music", icon: "note", label: "음악" \}/);
  assert.match(appSource, /\{ key: "stage", icon: "settings", label: "무대" \}/);
  assert.match(appSource, /\{ key: "view", icon: "grid", label: "보기" \}/);
  assert.doesNotMatch(appSource, /const MOBILE_ACTIONS = \[/);
  const mobileActionGroups = appSource.match(/const MOBILE_ACTION_GROUPS = Object\.freeze\(\{[\s\S]*?\n\}\);/)?.[0] || "";
  assert.doesNotMatch(mobileActionGroups, /label: "저장"/);
  assert.doesNotMatch(mobileActionGroups, /label: "공유"/);
  assert.doesNotMatch(mobileActionGroups, /label: "다운로드"/);
  assert.doesNotMatch(mobileActionGroups, /label: "내보내기"/);
  assert.doesNotMatch(mobileActionGroups, /label: "메뉴"/);
  assert.doesNotMatch(mobileActionGroups, /label: "동선"/);
  assert.doesNotMatch(mobileActionGroups, /label: "추가"/);
  assert.doesNotMatch(mobileActionGroups, /label: "선택"/);
  assert.match(appSource, /aria-label="다운로드 메뉴"/);
  assert.match(appSource, />프로젝트 파일 공유<\/button>/);
  assert.match(appSource, />현재 PNG<\/button>/);
  assert.match(appSource, />대형 PNG 전체 저장<\/button>/);
  assert.match(appSource, />인쇄\/PDF<\/button>/);
  assert.match(appSource, /\[MOBILE_PANEL_KINDS\.role\]: "역할 선택"/);
  assert.match(appSource, /aria-label="역할 선택"/);
  assert.match(appSource, /label="A 그룹"/);
  assert.match(appSource, /\[MOBILE_PANEL_KINDS\.align\]: "정렬 방향"/);
  assert.match(appSource, /aria-label="정렬 방향"/);
  assert.match(appSource, /label="세로 정렬"/);
  assert.match(appSource, /label="가로 정렬"/);
  assert.match(appSource, /iconName="undo"/);
  assert.match(appSource, /iconName="grid"/);
  assert.match(appSource, /className="stage-view-float-toggle"/);
  assert.match(appSource, /aria-label=\{stageViewMode === "2d" \? "3D 보기" : "2D 보기"\}/);
  assert.match(appSource, /label=\{snapEnabled \? "스냅 끄기" : "스냅 켜기"\}/);
  const mobileViewPanel = appSource.match(/if \(mobilePanel\.kind === MOBILE_PANEL_KINDS\.view\) \{[\s\S]*?\n    \}/)?.[0] || "";
  assert.doesNotMatch(mobileViewPanel, /setStageViewMode/);
  assert.doesNotMatch(mobileViewPanel, /무대 맞춤|setIsStageFocus/);
  assert.match(coolIconSource, /replaceAll\('stroke="black"', 'stroke="currentColor"'\)/);
  assert.match(coolIconSource, /moreGrid/);
  assert.match(coolIconSource, /import grid from "\.\/coolicons\/grid\.svg\?raw";/);
  assert.match(attributionSource, /Coolicons/);
  assert.match(attributionSource, /Wanted Design System Community/);
  assert.match(styleSource, /--wanted-panel-strong:\s*#17191f;/);
  assert.match(styleSource, /--wanted-accent:\s*#18a466;/);
  assert.match(styleSource, /\.mobile-command-grid \{/);
  assert.match(styleSource, /\.mobile-global-actions/);
  assert.match(styleSource, /\.mobile-global-actions \.icon-hint-wrapper \{\s*width: 34px;/);
  assert.match(styleSource, /@media \(max-width: 920px\) and \(orientation: landscape\)[\s\S]*?\.mobile-global-actions \.icon-hint-wrapper \{\s*width: 36px;/);
  assert.match(styleSource, /\.stage-corner-tools,\s*\.stage-view-toggle \{\s*display: none;/);
  assert.match(styleSource, /\.stage-view-float-toggle \{[\s\S]*?display: grid;/);
  assert.match(styleSource, /\.mobile-status-token\.ok/);
});

test("mobile layout overrides the open tool drawer grid", () => {
  const mobileWorkspace = styleSource.match(/@media \(max-width: 840px\) and \(orientation: portrait\)[\s\S]*?@media \(max-width: 920px\) and \(orientation: landscape\)/)?.[0] || "";

  assert.match(mobileWorkspace, /\.workspace\.tools-open \{[\s\S]*?grid-template-columns: 1fr;/);
});

test("mobile editor uses one temporary bottom sheet with explicit size presets", () => {
  assert.match(appSource, /const MOBILE_PANEL_SIZES = Object\.freeze\(\{/);
  assert.match(appSource, /const \[mobilePanel, setMobilePanel\] = useState\(\(\) => closedMobilePanel\(\)\);/);
  assert.match(appSource, /function openMobilePanel\(kind, size = MOBILE_PANEL_SIZES\.peek\)/);
  assert.match(appSource, /function closeMobilePanel\(\)/);
  assert.match(appSource, /function resizeMobilePanel\(nextSize\)/);
  assert.match(appSource, /function cycleMobilePanelSize\(\)/);
  assert.match(appSource, /current\.size === MOBILE_PANEL_SIZES\.peek/);
  assert.match(appSource, /current\.size === MOBILE_PANEL_SIZES\.half/);
  assert.match(appSource, /mobilePanel\.size/);
  assert.match(appSource, /className="bottom-sheet-handle"/);
  assert.doesNotMatch(appSource, />Peek<\/button>/);
  assert.doesNotMatch(appSource, />Half<\/button>/);
  assert.doesNotMatch(appSource, />Full<\/button>/);
  assert.doesNotMatch(appSource, /const \[isBottomSheetExpanded, setIsBottomSheetExpanded\]/);
});

test("mobile triggers replace panels without clearing existing stage selection", () => {
  assert.match(appSource, /function openSelectedPerformerPanel\(performerId\)/);
  assert.match(appSource, /selectPerformer\(performerId\);\s*openMobilePanel\(MOBILE_PANEL_KINDS\.performer, MOBILE_PANEL_SIZES\.peek\);/);
  assert.match(appSource, /function openSelectedFormationPanel\(sectionId = selectedSectionId\)/);
  assert.match(appSource, /setSelectedSectionId\(sectionId\);\s*openMobilePanel\(MOBILE_PANEL_KINDS\.formation, MOBILE_PANEL_SIZES\.half\);/);
  assert.match(appSource, /function openAddMobilePanel\(\)/);
  assert.match(appSource, /openMobilePanel\(MOBILE_PANEL_KINDS\.add, MOBILE_PANEL_SIZES\.half\);/);
  assert.doesNotMatch(appSource, /function openMoreMobilePanel\(\)/);
  assert.doesNotMatch(appSource, /MOBILE_PANEL_KINDS\.more/);
  assert.doesNotMatch(appSource, /MOBILE_PANEL_KINDS\.share/);
  assert.doesNotMatch(appSource, /MOBILE_PANEL_KINDS\.download/);
});

test("mobile stage gestures collapse panels unless async work locks them", () => {
  assert.match(appSource, /const mobilePanelAutoCollapseLocked = /);
  assert.match(appSource, /function collapseMobilePanelForStageGesture\(\)/);
  assert.match(appSource, /if \(mobilePanelAutoCollapseLocked\) return;/);
  assert.match(appSource, /collapseMobilePanelForStageGesture\(\);\s*captureStagePointer\(event\);/);
  assert.match(appSource, /collapseMobilePanelForStageGesture\(\);\s*const tapAction = resolveEmptyStageTap/);
  assert.match(appSource, /audioUploadStatus === "uploading"/);
  assert.match(appSource, /isShareOperationPending/);
});

test("mobile route overlay is separate from the bottom sheet", () => {
  assert.match(appSource, /const \[isTransitionOverlayOpen, setIsTransitionOverlayOpen\] = useState\(false\);/);
  assert.match(appSource, /function toggleMobileTransitionOverlay\(\)/);
  assert.match(appSource, /setIsTransitionOverlayOpen\(\(value\) => !value\)/);
  assert.match(appSource, /openMobilePanel\(MOBILE_PANEL_KINDS\.transition, MOBILE_PANEL_SIZES\.half\);/);
  assert.match(appSource, /className=\{isTransitionOverlayOpen \? "stage-frame transition-overlay-open" : "stage-frame"\}/);
});

test("portrait mobile keeps the stage and timeline visible under temporary sheets", () => {
  const portraitMobile = styleSource.match(/@media \(max-width: 840px\) and \(orientation: portrait\)[\s\S]*?@media \(max-width: 920px\) and \(orientation: landscape\)/)?.[0] || "";

  assert.doesNotMatch(portraitMobile, /\.desktop-editor \{\s*display:\s*none;/);
  assert.match(portraitMobile, /\.desktop-editor \{[\s\S]*?display:\s*grid;/);
  assert.match(portraitMobile, /\.app \{[\s\S]*?height:\s*100dvh;/);
  assert.match(portraitMobile, /--mobile-stage-inline:\s*calc\(100dvw/);
  assert.match(portraitMobile, /--mobile-stage-target:\s*min\(calc\(100dvh - 236px - env\(safe-area-inset-bottom\)\), calc\(var\(--mobile-stage-inline\) \* 1\.12\)\);/);
  assert.match(portraitMobile, /\.stage-area \{[\s\S]*?grid-template-rows:\s*auto minmax\(var\(--mobile-stage-target\), 1fr\) minmax\(150px, 172px\) 0;/);
  assert.match(portraitMobile, /\.timeline-editor \{[\s\S]*?padding:\s*5px;/);
  assert.match(portraitMobile, /\.stage-hint \{[\s\S]*?display:\s*none;/);
  assert.match(portraitMobile, /\.mobile-action-bar \{[\s\S]*?overflow-x:\s*auto;/);
  assert.match(portraitMobile, /\.mobile-action-bar \.icon-hint-wrapper \{[\s\S]*?flex:\s*0 0 54px;/);
  assert.match(portraitMobile, /\.mobile-action-bar button\.active,[\s\S]*?\.mobile-action-bar \.file-button\.active \{[\s\S]*?transform:\s*translateY\(-1px\);/);
  assert.match(portraitMobile, /\.mobile-action-bar button\.active::before,[\s\S]*?background:\s*var\(--wanted-accent\);/);
  assert.match(portraitMobile, /\.mobile-action-bar button\.danger-button\.active \{[\s\S]*?background:\s*#b4234f;/);
  assert.match(portraitMobile, /\.selected-formation-bar \{[\s\S]*?display:\s*none;/);
  assert.match(portraitMobile, /\.left-work-panel,\s*\.right-context-surface \{[\s\S]*?display:\s*none;/);
  assert.match(portraitMobile, /\.mobile-bottom-sheet\.peek \{[\s\S]*?height:\s*min\(16dvh, 136px\);/);
  assert.match(portraitMobile, /\.mobile-bottom-sheet\.half \{[\s\S]*?height:\s*min\(30dvh, 246px\);/);
  assert.match(portraitMobile, /\.mobile-bottom-sheet\.full \{[\s\S]*?height:\s*min\(36dvh, 292px\);/);
});
