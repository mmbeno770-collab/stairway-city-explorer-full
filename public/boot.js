(() => {
  const panel = () => document.getElementById("boot-status");

  window.showStairwayBootError = (message) => {
    const el = panel();
    if (!el) return;

    const card = document.createElement("div");
    card.className = "boot-card boot-error";
    const heading = document.createElement("h1");
    heading.textContent = "המשחק לא הצליח להיטען";
    const explanation = document.createElement("p");
    explanation.textContent = "הדפדפן לא הצליח להפעיל רכיב של המשחק.";
    const retryHint = document.createElement("p");
    retryHint.textContent = "נסה לרענן את הדף. אם התקלה חוזרת, בדוק אם המכשיר תומך ב-WebGL.";
    const retry = document.createElement("button");
    retry.type = "button";
    retry.textContent = "נסה שוב";
    retry.addEventListener("click", () => window.location.reload(), { once: true });

    const details = document.createElement("details");
    const summary = document.createElement("summary");
    summary.textContent = "פרטי התקלה";
    const pre = document.createElement("pre");
    pre.textContent = String(message || "לא התקבל פירוט");
    details.append(summary, pre);

    card.append(heading, explanation, retryHint, retry, details);
    el.replaceChildren(card);
  };

  window.addEventListener("error", (event) => {
    if (event?.message || event?.target?.tagName === "SCRIPT") {
      window.showStairwayBootError(event.message || "טעינת קובץ JavaScript נכשלה");
    }
  }, true);
  window.addEventListener("unhandledrejection", (event) => {
    window.showStairwayBootError(event.reason?.message || event.reason || "שגיאת טעינה לא מטופלת");
  });

  window.setTimeout(() => {
    if (!window.__stairwayAppReady && panel()) {
      window.showStairwayBootError("הטעינה ארכה יותר מהרגיל. ייתכן שהמכשיר חסם WebGL או שזיכרון המכשיר אינו מספיק.");
    }
  }, 18000);

  if ("serviceWorker" in navigator && window.location.protocol === "https:" &&
      !window.Capacitor?.isNativePlatform?.()) {
    const sourceUrl = document.currentScript?.src || window.location.href;
    const workerUrl = new URL("./service-worker.js", sourceUrl);
    window.addEventListener("load", () => {
      navigator.serviceWorker.register(workerUrl).catch(() => {});
    }, { once: true });
  }
})();
