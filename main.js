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
  const [loadMessage, setLoadMessage] = useState("מכינים את העיר התלת־ממדית...");

  const retryLoad = useCallback(() => {
    setLoadError("");
    setLoadMessage("ממשיכים להכין את העיר...");
    setLoading(true);
    loadGameModule()
      .then((module) => {
        setGameComponent(() => module.default);
        setLoading(false);
      })
      .catch((error) => {
        setLoading(false);
        setLoadError(String(error?.message || error || "שגיאה לא ידועה"));
      });
  }, []);

  useEffect(() => {
    let active = true;
    const startTimer = window.setTimeout(() => {
      if (!active) return;
      setLoading(true);
      loadGameModule()
        .then((module) => {
          if (!active) return;
          setGameComponent(() => module.default);
          setLoading(false);
        })
        .catch((error) => {
          if (!active) return;
          setLoading(false);
          setLoadError(String(error?.message || error || "שגיאה לא ידועה"));
        });
    }, 100);
    const messageTimer = window.setTimeout(() => {
      if (active) setLoadMessage("טוענים את העיר, האיים, כלי הרכב והתושבים...");
    }, 4200);
    return () => {
      active = false;
      window.clearTimeout(startTimer);
      window.clearTimeout(messageTimer);
    };
  }, []);

  if (GameComponent) return React.createElement(GameComponent);

  const statusText = loadError
    ? "הטעינה נתקלה בבעיה"
    : loading
      ? loadMessage
      : "מכינים את הלובי והחנות...";

  return React.createElement("main", { className: "quick-home-screen", dir: "rtl" },
    React.createElement("div", { className: "quick-home-shell" },
      React.createElement("header", { className: "quick-home-topbar" },
        React.createElement("div", { className: "quick-home-brand" },
          React.createElement("span", { className: "quick-home-brand-mark" }, "✦"),
          React.createElement("span", null, "STAIRWAY CITY EXPLORER")
        ),
        React.createElement("span", { className: "quick-home-world-tag" }, "עולם פתוח · תלת־ממד")
      ),
      React.createElement("section", { className: "quick-home-hero" },
        React.createElement("div", { className: "quick-home-copy" },
          React.createElement("div", { className: "quick-home-kicker" }, "ההרפתקה הבאה מתחילה כאן"),
          React.createElement("h1", null, "עיר שלמה מחכה לך."),
          React.createElement("p", null, "שוטטו ברחובות, גלו איים וחופים, נהגו בכלי רכב ופגשו את תושבי העיר."),
          React.createElement("div", { className: "quick-home-status " + (loadError ? "has-error" : "is-loading"), role: "status", "aria-live": "polite" },
            React.createElement("span", { className: "quick-home-status-dot", "aria-hidden": "true" }),
            React.createElement("span", null, statusText)
          ),
          React.createElement("div", { className: "quick-home-progress", "aria-hidden": "true" },
            React.createElement("span", null)
          ),
          loadError
            ? React.createElement("div", { className: "quick-home-error", role: "alert" },
                React.createElement("p", null, "לא הצלחנו לטעון את קובצי המשחק. אפשר לנסות שוב."),
                React.createElement("button", { type: "button", onClick: retryLoad }, "נסה לטעון שוב")
              )
            : React.createElement("div", { className: "quick-home-actions" },
                React.createElement("button", { type: "button", className: "quick-home-button", disabled: true },
                  "מכינים את הלובי..."
                ),
                React.createElement("button", { type: "button", className: "quick-home-shop-button", disabled: true },
                  "🛒 החנות תיפתח בלובי"
                )
              ),
          React.createElement("div", { className: "quick-home-footnote" },
            "בינתיים אפשר להישאר כאן — המשחק נטען ברקע."
          )
        ),
        React.createElement("div", { className: "quick-home-visual", "aria-hidden": "true" },
          React.createElement("div", { className: "quick-home-sun" }),
          React.createElement("div", { className: "quick-home-cloud cloud-one" }),
          React.createElement("div", { className: "quick-home-cloud cloud-two" }),
          React.createElement("div", { className: "quick-home-hill hill-back" }),
          React.createElement("div", { className: "quick-home-hill hill-front" }),
          React.createElement("div", { className: "quick-home-cityline" },
            React.createElement("span", { className: "building-a" }),
            React.createElement("span", { className: "building-b" }),
            React.createElement("span", { className: "building-c" }),
            React.createElement("span", { className: "building-d" }),
            React.createElement("span", { className: "building-e" })
          ),
          React.createElement("div", { className: "quick-home-water" }),
          React.createElement("div", { className: "quick-home-road" }),
          React.createElement("span", { className: "quick-home-tree tree-one" }, "🌲"),
          React.createElement("span", { className: "quick-home-tree tree-two" }, "🌴"),
          React.createElement("span", { className: "quick-home-boat" }, "⛵"),
          React.createElement("span", { className: "quick-home-scene-label" }, "עיר · טבע · איים")
        )
      ),
      React.createElement("section", { className: "quick-home-discover" },
        React.createElement("div", { className: "quick-home-section-heading" },
          React.createElement("div", null,
            React.createElement("span", { className: "quick-home-kicker" }, "מה מחכה בפנים"),
            React.createElement("h2", null, "בוחרים את ההרפתקה")
          ),
          React.createElement("span", { className: "quick-home-section-note" }, "החנות האמיתית זמינה אחרי הטעינה")
        ),
        React.createElement("div", { className: "quick-home-feature-grid" },
          React.createElement("article", { className: "quick-home-feature-card" },
            React.createElement("span", { className: "quick-home-feature-icon" }, "🛒"),
            React.createElement("strong", null, "חנות ההרפתקנים"),
            React.createElement("span", null, "אי אישי, שדרוגים ועוד")
          ),
          React.createElement("article", { className: "quick-home-feature-card" },
            React.createElement("span", { className: "quick-home-feature-icon" }, "🏝️"),
            React.createElement("strong", null, "איים וחופים"),
            React.createElement("span", null, "לגלות מקומות חדשים")
          ),
          React.createElement("article", { className: "quick-home-feature-card" },
            React.createElement("span", { className: "quick-home-feature-icon" }, "🚘"),
            React.createElement("strong", null, "עיר חיה"),
            React.createElement("span", null, "רכבים, תושבים ומשימות")
          )
        )
      ),
      React.createElement("footer", { className: "quick-home-footer" },
        React.createElement("span", null, "Stairway City · עולם פתוח לחקירה"),
        React.createElement("a", { href: "./privacy.html" }, "מדיניות פרטיות")
      )
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
