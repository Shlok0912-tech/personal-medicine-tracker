import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Install prompt UX for Android/Chromium/Samsung Internet: show a button when eligible
let deferredInstallPrompt: any;
let installButtonEl: HTMLButtonElement | null = null;

// Detect Samsung Internet browser
const isSamsungInternet = () => {
  const ua = navigator.userAgent;
  return /SamsungBrowser/i.test(ua) || /Samsung/i.test(ua);
};

function ensureInstallButton() {
  if (installButtonEl) return installButtonEl;
  const btn = document.createElement("button");
  btn.textContent = "Install Meditrack";
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
  btn.style.fontSize = "14px";
  btn.style.fontWeight = "500";
  btn.style.cursor = "pointer";
  btn.setAttribute("aria-label", "Install Meditrack app");
  document.body.appendChild(btn);
  installButtonEl = btn;
  return btn;
}

window.addEventListener("beforeinstallprompt", (e: any) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  const btn = ensureInstallButton();
  
  // For Samsung Internet, show button immediately
  if (isSamsungInternet()) {
    btn.style.display = "block";
  }
  
  btn.onclick = async () => {
    btn.disabled = true;
    try {
      if (deferredInstallPrompt) {
        await deferredInstallPrompt.prompt();
        const choiceResult = await deferredInstallPrompt.userChoice;
        console.log("User choice:", choiceResult.outcome);
      } else {
        // Fallback: try manual installation instructions
        alert("Please use the browser menu to add this site to your home screen.\n\nSamsung Internet: Menu > Add page to > Home screen");
      }
    } catch (error) {
      console.error("Install prompt error:", error);
    } finally {
      deferredInstallPrompt = null;
      btn.remove();
      installButtonEl = null;
    }
  };
});

// For Samsung Internet, check if app is installable after page load
if (isSamsungInternet() && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    setTimeout(() => {
      // Check if manifest is available
      const manifestLink = document.querySelector('link[rel="manifest"]');
      if (manifestLink && !installButtonEl) {
        // Show install option even if beforeinstallprompt didn't fire
        const btn = ensureInstallButton();
        btn.onclick = () => {
          alert("To install Meditrack:\n\n1. Tap the menu (⋮) in Samsung Internet\n2. Select 'Add page to'\n3. Choose 'Home screen'\n\nOr use the browser's install prompt if available.");
          btn.remove();
          installButtonEl = null;
        };
      }
    }, 2000);
  });
}

window.addEventListener("appinstalled", () => {
  if (installButtonEl) {
    installButtonEl.remove();
    installButtonEl = null;
  }
});
