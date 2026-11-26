import React, { useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

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

let gameModulePromise;
function loadGameModule() {
  if (!gameModulePromise) {
    gameModulePromise = import("./game/Game.js").catch((error) => {
      gameModulePromise = null;
      throw error;
    });
  }
  return gameModulePromise;
}

function FastGameBoot() {
  const [GameComponent, setGameComponent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  const startLoading = useCallback(() => {
    if (GameComponent || loading) return;
    setLoading(true);
    setLoadError("");
    loadGameModule()
      .then((module) => setGameComponent(() => module.default))
      .catch((error) => {
        setLoading(false);
        setLoadError(String(error?.message || error || "שגיאה לא ידועה"));
      });
  }, [GameComponent, loading]);

  useEffect(() => {
    let idleId = null;
    let timerId = null;
    if (typeof window.requestIdleCallback === "function") {
      idleId = window.requestIdleCallback(startLoading, { timeout: 1400 });
    } else {
      timerId = window.setTimeout(startLoading, 550);
    }
    return () => {
      if (idleId !== null) window.cancelIdleCallback?.(idleId);
      if (timerId !== null) window.clearTimeout(timerId);
    };
  }, [startLoading]);

  if (GameComponent) return React.createElement(GameComponent);

  return React.createElement("main", { className: "quick-home-screen", dir: "rtl" },
    React.createElement("section", { className: "quick-home-card" },
      React.createElement("div", { className: "quick-home-kicker" }, "עיר פתוחה · עולם תלת־ממדי"),
      React.createElement("h1", null, "Stairway City Explorer"),
      React.createElement("p", null, "גלו עיר חיה, טיילו בין האיים, נהגו ופגשו תושבים."),
      React.createElement("div", { className: "quick-home-features" },
        React.createElement("span", null, "🌲 טבע וחיות"),
        React.createElement("span", null, "🏝️ איים"),
        React.createElement("span", null, "🚘 נהיגה"),
        React.createElement("span", null, "🏆 משימות")
      ),
      loadError
        ? React.createElement("div", { className: "quick-home-error", role: "alert" },
            React.createElement("p", null, "לא הצלחנו לטעון את המשחק."),
            React.createElement("button", { type: "button", onClick: startLoading }, "נסה שוב")
          )
        : React.createElement(React.Fragment, null,
            React.createElement("div", { className: "quick-home-loading", role: "status", "aria-live": "polite" },
              React.createElement("span", { className: "quick-home-spinner", "aria-hidden": "true" }),
              React.createElement("span", null, loading ? "מכינים את העיר..." : "מכינים את מסך המשחק...")
            ),
            React.createElement("button", { type: "button", className: "quick-home-button", onClick: startLoading, disabled: loading },
              loading ? "טוענים..." : "כניסה למסך המשחק"
            )
          ),
      React.createElement("a", { className: "quick-home-privacy", href: "./privacy.html" }, "מדיניות פרטיות")
    )
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

const settleBoot = () => {
  const hasAppShell = Boolean(root.querySelector(".quick-home-screen, .game-root, pre"));
  if (hasAppShell) {
    window.__stairwayAppReady = true;
    document.getElementById("boot-status")?.remove();
    observer.disconnect();
    return true;
  }
  return false;
};
const observer = new MutationObserver(settleBoot);
observer.observe(root, { childList: true, subtree: true });
createRoot(root).render(
  React.createElement(GameErrorBoundary, null, React.createElement(FastGameBoot))
);
settleBoot();
