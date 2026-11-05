import { jsx as _jsx } from "react/jsx-runtime";
import React from "react";
import { createRoot } from "react-dom/client";
import Game from "./game/Game.js";

class GameErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error) { console.error("Stairway City Explorer render error:", error); }
  render() {
    if (this.state.error) {
      return React.createElement("div", {
        style: { position: "fixed", inset: 0, display: "grid", placeItems: "center", padding: "24px", background: "#0b1720", color: "#fff", fontFamily: "sans-serif", textAlign: "center", direction: "rtl" }
      }, React.createElement("div", { style: { maxWidth: "620px", padding: "28px", background: "#142633", border: "1px solid #526575", borderRadius: "16px" } },
        React.createElement("h1", null, "המשחק נתקל בתקלה בזמן ההפעלה"),
        React.createElement("p", null, "נסה לרענן את הדף. אם התקלה חוזרת, שלח צילום מסך של ההודעה הזאת."),
        React.createElement("pre", { style: { whiteSpace: "pre-wrap", overflowWrap: "anywhere", direction: "ltr", textAlign: "left", color: "#ffc7c7" } }, String(this.state.error?.stack || this.state.error))
      ));
    }
    return this.props.children;
  }
}

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");
createRoot(root).render(React.createElement(GameErrorBoundary, null, _jsx(Game, {})));

// Do not remove the loading panel until React Three Fiber has actually mounted
// its canvas. This prevents an empty black page when WebGL startup is delayed.
const settleBoot = () => {
  const hasCanvas = Boolean(root.querySelector("canvas"));
  const hasRenderError = Boolean(root.querySelector("pre"));
  if (hasCanvas || hasRenderError) {
    window.__stairwayAppReady = hasCanvas;
    document.getElementById("boot-status")?.remove();
    observer.disconnect();
    return true;
  }
  return false;
};
const observer = new MutationObserver(settleBoot);
observer.observe(root, { childList: true, subtree: true });
window.setTimeout(() => {
  if (!settleBoot()) {
    window.showStairwayBootError("לא נוצר משטח תלת־ממדי. ייתכן שהדפדפן חסם WebGL או שלא הצליח לטעון את ספריות המשחק מהאינטרנט.");
  }
}, 25000);
settleBoot();
