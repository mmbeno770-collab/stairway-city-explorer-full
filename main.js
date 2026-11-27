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
  const [loadProgress, setLoadProgress] = useState(3);
  const [loadMessage, setLoadMessage] = useState("מתחילים להכין את העיר...");

  const retryLoad = useCallback(() => {
    setLoadError(""); setLoadProgress(7); setLoadMessage("מנסים שוב לטעון את קובצי העיר..."); setLoading(true);
    loadGameModule().then((module) => {
      setLoadProgress(54); setLoadMessage("מפעילים את העולם התלת־ממדי...");
      setGameComponent(() => module.default); setLoading(false);
    }).catch((error) => { setLoading(false); setLoadError(String(error?.message || error || "שגיאה לא ידועה")); });
  }, []);

  useEffect(() => {
    let active = true, stageTimers = [];
    const startTimer = window.setTimeout(() => {
      if (!active) return;
      setLoading(true); setLoadProgress(8); setLoadMessage("מכינים את מפת העיר...");
      const stages = [
        [420,13,"טוענים את הרחובות והבניינים..."], [1050,19,"מחברים את השכונות והפארקים..."],
        [1900,27,"מכינים את האיים והחופים..."], [3100,35,"טוענים כלי רכב, סירות ותושבים..."],
        [5000,43,"מסיימים להכין את מנוע המשחק..."]
      ];
      stageTimers = stages.map(([delay,value,message]) => window.setTimeout(() => {
        if (active) { setLoadProgress(value); setLoadMessage(message); }
      }, delay));
      loadGameModule().then((module) => {
        stageTimers.forEach(window.clearTimeout);
        if (!active) return;
        setLoadProgress(54); setLoadMessage("מפעילים את העולם התלת־ממדי...");
        setGameComponent(() => module.default); setLoading(false);
      }).catch((error) => {
        stageTimers.forEach(window.clearTimeout);
        if (active) { setLoading(false); setLoadError(String(error?.message || error || "שגיאה לא ידועה")); }
      });
    }, 100);
    return () => { active = false; window.clearTimeout(startTimer); stageTimers.forEach(window.clearTimeout); };
  }, []);

  if (GameComponent) return React.createElement(GameComponent, { initialProgress: 54 });
  const percent = Math.max(0, Math.min(99, Math.round(loadProgress)));
  const statusText = loadError ? "לא הצלחנו לטעון את העיר" : loadMessage;
  return React.createElement("main", { className:"city-loading-screen quick-home-screen", dir:"rtl", role:"status", "aria-live":"polite" },
    React.createElement("div", { className:"city-loading-shell" },
      React.createElement("header", { className:"city-loading-header" },
        React.createElement("div", { className:"city-loading-logo" }, "🏙️"),
        React.createElement("div", { className:"city-loading-title" },
          React.createElement("span", null, "ברוכים הבאים אל"),
          React.createElement("h1", null, "STAIRWAY CITY"),
          React.createElement("p", null, "עיר שלמה של הרפתקאות")
        )
      ),
      React.createElement("div", { className:"city-loading-art-frame" },
        React.createElement("img", { src:"./city-loading-panorama.svg", alt:"תמונה פנורמית מאוירת של העיר, הפארק, השכונות והאיים", draggable:false }),
        React.createElement("span", { className:"city-loading-art-label" }, "מבט פנורמי על העיר")
      ),
      React.createElement("footer", { className:"city-loading-footer" },
        React.createElement("div", { className:"city-loading-progress-line" },
          React.createElement("span", null, statusText), React.createElement("strong", null, percent + "%")
        ),
        React.createElement("div", { className:"city-loading-progress-track" },
          React.createElement("span", { style:{ width:percent + "%" } })
        ),
        React.createElement("div", { className:"city-loading-footnote" },
          React.createElement("span", null, "🌳 מכינים את הרחובות והגנים"),
          React.createElement("span", null, "🏝️ טוענים את האיים")
        ),
        loadError ? React.createElement("div", { className:"city-loading-error", role:"alert" },
          React.createElement("p", null, "אפשר לנסות לטעון שוב."),
          React.createElement("button", { type:"button", onClick:retryLoad }, "נסה שוב")
        ) : null
      )
    )
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

const settleBoot = () => {
  const hasAppShell = Boolean(root.querySelector(".city-loading-screen, .game-root, pre"));
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
