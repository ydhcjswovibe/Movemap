import React, { memo } from "react";
import addPlus from "./coolicons/add-plus.svg?raw";
import closeMd from "./coolicons/close-md.svg?raw";
import download from "./coolicons/download.svg?raw";
import editPencilLine from "./coolicons/edit-pencil-line-01.svg?raw";
import expand from "./coolicons/expand.svg?raw";
import grid from "./coolicons/grid.svg?raw";
import headphones from "./coolicons/headphones.svg?raw";
import house from "./coolicons/house-02.svg?raw";
import label from "./coolicons/label.svg?raw";
import layer from "./coolicons/layer.svg?raw";
import moreGrid from "./coolicons/more-grid-small.svg?raw";
import note from "./coolicons/note.svg?raw";
import path from "./coolicons/path.svg?raw";
import pause from "./coolicons/pause.svg?raw";
import play from "./coolicons/play.svg?raw";
import redo from "./coolicons/redo.svg?raw";
import save from "./coolicons/save.svg?raw";
import selectMultiple from "./coolicons/select-multiple.svg?raw";
import settings from "./coolicons/settings.svg?raw";
import share from "./coolicons/share-ios-export.svg?raw";
import star from "./coolicons/star.svg?raw";
import timerAdd from "./coolicons/timer-add.svg?raw";
import undo from "./coolicons/undo.svg?raw";
import users from "./coolicons/users.svg?raw";
import zoomMinus from "./coolicons/zoom-minus.svg?raw";
import zoomPlus from "./coolicons/magnifying-glass-plus.svg?raw";

const ICONS = {
  add: addPlus,
  close: closeMd,
  download,
  edit: editPencilLine,
  expand,
  grid,
  home: house,
  label,
  layer,
  more: moreGrid,
  music: headphones,
  note,
  path,
  pause,
  play,
  redo,
  save,
  select: selectMultiple,
  settings,
  share,
  sparkle: star,
  "timer-add": timerAdd,
  undo,
  users,
  "zoom-minus": zoomMinus,
  "zoom-plus": zoomPlus
};

function normalizeSvg(svg) {
  return svg
    .replaceAll('stroke="black"', 'stroke="currentColor"')
    .replaceAll('fill="black"', 'fill="currentColor"')
    .replace("<svg ", '<svg aria-hidden="true" focusable="false" ');
}

const NORMALIZED_ICONS = Object.fromEntries(
  Object.entries(ICONS).map(([name, svg]) => [name, normalizeSvg(svg)])
);

function CoolIcon({ name, className = "cool-icon" }) {
  const svg = NORMALIZED_ICONS[name];
  if (!svg) return null;
  return <span className={className} dangerouslySetInnerHTML={{ __html: svg }} />;
}

export default memo(CoolIcon);
