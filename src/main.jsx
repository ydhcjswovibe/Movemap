import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import "./stitchMobileEditor.css";
import App from "./App.jsx";
import StitchMobileEditorMock from "./StitchMobileEditorMock.jsx";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="loading">
          <div className="wizard-card">
            <p className="eyebrow">Render error</p>
            <h1>앱을 여는 중 오류가 났습니다.</h1>
            <p className="muted">{this.state.error.message}</p>
            <button
              className="primary"
              onClick={() => {
                localStorage.removeItem("movemap-project");
                localStorage.removeItem("choreo-stage-planner-project");
                window.location.reload();
              }}
            >
              저장 데이터 초기화 후 다시 열기
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const currentPath = window.location.pathname.replace(/\/+$/, "") || "/";
const RootComponent = currentPath === "/stitch-mobile-mock"
    ? StitchMobileEditorMock
    : App;

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <RootComponent />
    </ErrorBoundary>
  </React.StrictMode>
);
