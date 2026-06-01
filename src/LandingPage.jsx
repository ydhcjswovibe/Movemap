import { useEffect } from "react";

const GITHUB_URL = "https://github.com/ydhcjswovibe/Movemap";
const DEMO_URL = "https://stage-map-pi.vercel.app";

const audience = [
  "Choreographers",
  "Salsa and partner dance teams",
  "K-pop cover teams",
  "Performance crews",
  "School performance teams",
  "Rehearsal directors",
  "Independent dance communities"
];

const features = [
  ["Visual stage map", "Arrange performers on a clear front/back stage layout."],
  ["Draggable performer tokens", "Move dancers quickly as formations change in rehearsal."],
  ["Formation design", "Keep section-by-section stage pictures in one editable plan."],
  ["Movement paths", "Review how performers travel between positions, not only where they land."],
  ["Music cues and timing", "Tie formation changes to arrival time and transition duration."],
  ["Shareable rehearsal maps", "Use view links, image export, print, PDF, or project files for team review."],
  ["Web workflow", "Built as a React/Vite app with Supabase and Vercel deployment support."]
];

const workflow = [
  "Create a project for a song or performance.",
  "Add performers and roles.",
  "Place everyone on the stage.",
  "Build formation changes by section or music cue.",
  "Review transitions during rehearsal.",
  "Share the map with the team."
];

const roadmap = [
  "Better onboarding examples",
  "Sample choreography templates",
  "Improved mobile editing",
  "Timeline and cue editor improvements",
  "Collaboration and sharing improvements",
  "Export improvements",
  "Contributor documentation"
];

function StagePreview() {
  return (
    <div className="landing-stage-preview" aria-label="Movemap stage map preview">
      <div className="landing-stage-toolbar">
        <span>Verse 1</span>
        <strong>0:32 - 0:46</strong>
      </div>
      <div className="landing-stage-board">
        <span className="landing-stage-front">Front</span>
        <div className="landing-path landing-path-a" />
        <div className="landing-path landing-path-b" />
        <div className="landing-token token-a">A1</div>
        <div className="landing-token token-b">A2</div>
        <div className="landing-token token-c">B1</div>
        <div className="landing-token token-d">B2</div>
        <div className="landing-token token-e">C1</div>
      </div>
      <div className="landing-cue-strip">
        <span className="active">Intro</span>
        <span>Verse</span>
        <span>Partnerwork</span>
        <span>Final</span>
      </div>
    </div>
  );
}

function LandingPage() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Movemap - Open-source choreography mapping";
    return () => {
      document.title = previousTitle;
    };
  }, []);

  return (
    <main className="landing-page">
      <section className="landing-hero">
        <nav className="landing-nav" aria-label="Project links">
          <a href="/" className="landing-brand">Movemap</a>
          <div>
            <a href={GITHUB_URL}>GitHub</a>
            <a href={DEMO_URL}>Try Movemap</a>
          </div>
        </nav>

        <div className="landing-hero-grid">
          <div className="landing-hero-copy">
            <p className="landing-eyebrow">Open-source rehearsal planning</p>
            <h1>Open-source choreography mapping for dance and performance teams.</h1>
            <p className="landing-lede">
              Movemap helps choreographers and rehearsal leaders design formations, movement paths,
              and music-cue-based stage maps - without relying on screenshots, spreadsheets, or paper diagrams.
            </p>
            <p className="landing-korean-note">공연 대형과 동선을 팀이 함께 이해하기 쉽게 정리하는 오픈소스 도구입니다.</p>
            <div className="landing-actions">
              <a className="landing-button primary" href={DEMO_URL}>Try Movemap</a>
              <a className="landing-button secondary" href={GITHUB_URL}>View on GitHub</a>
            </div>
          </div>
          <StagePreview />
        </div>
      </section>

      <section className="landing-section landing-two-column">
        <div>
          <p className="landing-eyebrow">What it is</p>
          <h2>A visual rehearsal planning tool for stage movement.</h2>
        </div>
        <p>
          Movemap is a web app for arranging performers on a stage, mapping formation changes,
          syncing movement ideas to music cues, and sharing rehearsal plans with a team. It focuses
          on the practical work that happens between a choreographer's idea and a group that can
          reliably remember the transition.
        </p>
      </section>

      <section className="landing-section landing-problem">
        <div>
          <p className="landing-eyebrow">Why it matters</p>
          <h2>Formation plans change faster than screenshots can keep up.</h2>
        </div>
        <div className="landing-problem-grid">
          <p>Dance teams often coordinate movement through paper diagrams, rough drawings, spreadsheets, group chat messages, or memory.</p>
          <p>During rehearsal, positions change frequently, transitions are explained verbally, and old screenshots become misleading.</p>
          <p>Movemap gives non-technical teams a simple visual place to keep the current map, timing, and shareable reference together.</p>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section-heading">
          <p className="landing-eyebrow">Who it helps</p>
          <h2>Built for small teams that still need clear staging.</h2>
        </div>
        <div className="landing-pill-grid">
          {audience.map((item) => <span key={item}>{item}</span>)}
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section-heading">
          <p className="landing-eyebrow">Core features</p>
          <h2>The basics of rehearsal mapping in one focused workspace.</h2>
        </div>
        <div className="landing-feature-grid">
          {features.map(([title, copy]) => (
            <article className="landing-card" key={title}>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section landing-workflow">
        <div>
          <p className="landing-eyebrow">Example workflow</p>
          <h2>From song idea to a map the whole team can review.</h2>
        </div>
        <ol>
          {workflow.map((step) => <li key={step}>{step}</li>)}
        </ol>
      </section>

      <section className="landing-section landing-open-source">
        <div>
          <p className="landing-eyebrow">Open source</p>
          <h2>A niche utility for performing arts communities.</h2>
        </div>
        <p>
          Movemap is open for contributors who care about creative tools, rehearsal workflows, and
          accessible planning software. Useful contributions include UI/UX improvements, accessibility,
          exports, testing, internationalization, documentation, and choreography-specific workflow ideas.
        </p>
        <a className="landing-button secondary" href={GITHUB_URL}>View on GitHub</a>
      </section>

      <section className="landing-section">
        <div className="landing-section-heading">
          <p className="landing-eyebrow">Project status</p>
          <h2>Actively evolving around practical rehearsal needs.</h2>
        </div>
        <div className="landing-roadmap-grid">
          {roadmap.map((item) => <span key={item}>{item}</span>)}
        </div>
      </section>

      <section className="landing-final-cta">
        <h2>Help make rehearsal maps easier to build, update, and share.</h2>
        <div className="landing-actions">
          <a className="landing-button primary" href={DEMO_URL}>Try Movemap</a>
          <a className="landing-button secondary" href={GITHUB_URL}>View on GitHub</a>
        </div>
      </section>
    </main>
  );
}

export default LandingPage;
