import React from "react";
import CoolIcon from "./icons/CoolIcon.jsx";
import "./v2VisualEditor.css";

const performers = [
  { id: "A3", group: "a", x: 20, y: 20 },
  { id: "A2", group: "a", x: 60, y: 29 },
  { id: "A1", group: "a", x: 30, y: 40 },
  { id: "A4", group: "a", x: 72, y: 51 },
  { id: "B2", group: "b", x: 24, y: 67 },
  { id: "B1", group: "b", x: 39, y: 75 },
  { id: "B3", group: "b", x: 55, y: 80 }
];

const bottomActions = [
  { icon: "select", label: "복제" },
  { icon: "redo", label: "동기화" },
  { icon: "close", label: "삭제" },
  { icon: "timer-add", label: "자동 보정", primary: true },
  { icon: "more", label: "더보기" }
];

function IconButton({ icon, label, className = "", primary = false }) {
  return (
    <button className={`v2-icon-button ${primary ? "is-primary" : ""} ${className}`} type="button" aria-label={label} title={label}>
      <CoolIcon name={icon} />
    </button>
  );
}

function V2VisualEditor() {
  return (
    <main className="v2-visual-editor" data-v2-visual-editor>
      <section className="v2-phone-shell" aria-label="Movemap Pro Editor visual prototype">
        <header className="v2-topbar">
          <IconButton icon="grid" label="편집 메뉴" className="v2-brand-mark" />
          <div className="v2-title-cluster">
            <h1>Finale Scene</h1>
            <span className="v2-saved-chip">
              <span aria-hidden="true" />
              Saved
            </span>
          </div>
          <IconButton icon="more" label="더보기" />
        </header>

        <section className="v2-stage-wrap" data-v2-stage aria-label="Stage">
          <div className="v2-stage-surface">
            <div className="v2-stage-crosshair" aria-hidden="true" />
            <div className="v2-center-diamond" aria-hidden="true" />
            <div className="v2-audience-zone">
              <span>관객</span>
            </div>

            {performers.map((performer) => (
              <button
                key={performer.id}
                className={`v2-token v2-token-${performer.group} ${performer.id === "A1" ? "is-selected" : ""}`}
                style={{ "--token-x": `${performer.x}%`, "--token-y": `${performer.y}%` }}
                type="button"
                aria-label={`${performer.id} performer`}
              >
                {performer.id}
              </button>
            ))}

            <div className="v2-zoom-rail" aria-label="Stage zoom controls">
              <IconButton icon="add" label="확대" />
              <IconButton icon="zoom-minus" label="축소" />
              <IconButton icon="expand" label="중앙 맞춤" />
            </div>
          </div>
        </section>

        <section className="v2-transport" aria-label="Playback controls">
          <IconButton icon="play" label="재생" className="v2-play-button" />
          <div className="v2-timecode" aria-label="Current timecode">00 : 01 : 14 .23</div>
          <div className="v2-transport-spacer" aria-hidden="true" />
          <IconButton icon="settings" label="타임라인 설정" />
        </section>

        <section className="v2-timeline" data-v2-timeline aria-label="Formation timeline">
          <div className="v2-playhead" aria-hidden="true" />
          <div className="v2-ruler">
            {["0:00", "0:01", "0:02", "0:03"].map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>

          <div className="v2-lane-row">
            <div className="v2-lane-label">
              <CoolIcon name="users" />
              <button className="v2-track-add-button" type="button" aria-label="대형 추가">+</button>
            </div>
            <div className="v2-formation-lane">
              <button className="v2-formation-block v2-intro-block" type="button">Intro V</button>
              <button className="v2-formation-block v2-diamond-block is-selected" type="button">Diamond Form</button>
            </div>
          </div>

          <div className="v2-audio-row" aria-label="Audio reference lane">
            <div className="v2-audio-tools">
              <CoolIcon name="note" />
              <button className="v2-track-add-button" type="button" aria-label="음악 추가">+</button>
            </div>
            <div className="v2-waveform" aria-hidden="true">
              {Array.from({ length: 42 }, (_, index) => (
                <span key={index} style={{ "--bar-height": `${8 + ((index * 17) % 46)}px` }} />
              ))}
            </div>
          </div>
        </section>

        <nav className="v2-bottom-rail" data-v2-bottom-rail aria-label="Selected item actions">
          {bottomActions.map((action) => (
            <IconButton key={action.label} icon={action.icon} label={action.label} primary={action.primary} />
          ))}
        </nav>
      </section>
    </main>
  );
}

export default V2VisualEditor;
