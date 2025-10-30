import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then(() => console.log("Service Worker registered"))
      .catch((err) => console.log("Service Worker failed:", err));
  });
}

// Install prompt UX for Android/Chromium: show a button when eligible
let deferredInstallPrompt: any;
let installButtonEl: HTMLButtonElement | null = null;

function ensureInstallButton() {
  if (installButtonEl) return installButtonEl;
  const btn = document.createElement("button");
  btn.textContent = "Install Health Tracker";
  btn.style.position = "fixed";
  btn.style.right = "16px";
  btn.style.bottom = "16px";
  btn.style.zIndex = "9999";
  btn.style.padding = "10px 14px";
  btn.style.borderRadius = "9999px";
  btn.style.border = "none";
  btn.style.color = "#fff";
  btn.style.background = "#4CAF50";
  btn.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
  document.body.appendChild(btn);
  installButtonEl = btn;
  return btn;
}

window.addEventListener("beforeinstallprompt", (e: any) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  const btn = ensureInstallButton();
  btn.onclick = async () => {
    btn.disabled = true;
    try {
      await deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
    } finally {
      deferredInstallPrompt = null;
      btn.remove();
      installButtonEl = null;
    }
  };
});

window.addEventListener("appinstalled", () => {
  if (installButtonEl) {
    installButtonEl.remove();
    installButtonEl = null;
  }
});
