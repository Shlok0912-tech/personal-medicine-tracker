import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Install prompt UX - Only show button when install prompt is available
let deferredInstallPrompt: any = null;
let installButtonEl: HTMLButtonElement | null = null;

// Check if app is already installed
const isInstalled = () => {
  return window.matchMedia('(display-mode: standalone)').matches || 
         (window.navigator as any).standalone === true ||
         document.referrer.includes('android-app://');
};

function createInstallButton() {
  if (installButtonEl) return installButtonEl;
  
  const btn = document.createElement("button");
  btn.textContent = "Install Meditrack";
  btn.style.position = "fixed";
  btn.style.right = "16px";
  btn.style.bottom = "16px";
  btn.style.zIndex = "9999";
  btn.style.padding = "12px 20px";
  btn.style.borderRadius = "8px";
  btn.style.border = "none";
  btn.style.color = "#fff";
  btn.style.background = "#4CAF50";
  btn.style.boxShadow = "0 4px 12px rgba(76, 175, 80, 0.4)";
  btn.style.fontSize = "14px";
  btn.style.fontWeight = "600";
  btn.style.cursor = "pointer";
  btn.style.transition = "all 0.3s ease";
  btn.style.display = "none"; // Hidden by default
  btn.setAttribute("aria-label", "Install Meditrack app");
  
  // Hover effect
  btn.addEventListener("mouseenter", () => {
    btn.style.background = "#45a049";
    btn.style.transform = "scale(1.05)";
  });
  btn.addEventListener("mouseleave", () => {
    btn.style.background = "#4CAF50";
    btn.style.transform = "scale(1)";
  });
  
  btn.onclick = async () => {
    if (!deferredInstallPrompt) {
      console.log("Install prompt not available");
      return;
    }
    
    btn.disabled = true;
    btn.textContent = "Installing...";
    
    try {
      // Show the install prompt
      deferredInstallPrompt.prompt();
      
      // Wait for user's response
      const { outcome } = await deferredInstallPrompt.userChoice;
      
      console.log(`User response to install prompt: ${outcome}`);
      
      if (outcome === 'accepted') {
        btn.textContent = "Installed!";
        setTimeout(() => {
          btn.remove();
          installButtonEl = null;
        }, 1500);
      } else {
        btn.textContent = "Install Meditrack";
        btn.disabled = false;
      }
      
      // Clear the deferred prompt
      deferredInstallPrompt = null;
    } catch (error) {
      console.error("Error showing install prompt:", error);
      btn.textContent = "Install Meditrack";
      btn.disabled = false;
    }
  };
  
  document.body.appendChild(btn);
  installButtonEl = btn;
  return btn;
}

// Listen for the beforeinstallprompt event
window.addEventListener("beforeinstallprompt", (e: Event) => {
  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault();
  
  // Don't show if already installed
  if (isInstalled()) {
    return;
  }
  
  // Store the event for later use
  deferredInstallPrompt = e as any;
  
  // Create and show the install button
  const btn = createInstallButton();
  btn.style.display = "block";
  
  console.log("Install prompt available - button shown");
});

// Hide button if app gets installed
window.addEventListener("appinstalled", () => {
  console.log("PWA was installed");
  if (installButtonEl) {
    installButtonEl.remove();
    installButtonEl = null;
  }
  deferredInstallPrompt = null;
});

// Check on page load if already installed
if (isInstalled()) {
  console.log("App is already installed");
} else {
  // Wait a bit for beforeinstallprompt event
  window.addEventListener("load", () => {
    setTimeout(() => {
      if (deferredInstallPrompt && !installButtonEl) {
        const btn = createInstallButton();
        btn.style.display = "block";
      }
    }, 1000);
  });
}
