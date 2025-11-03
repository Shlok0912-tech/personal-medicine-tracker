import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Install prompt UX - Only show button when install prompt is available
let deferredInstallPrompt: any = null;
let installButtonEl: HTMLButtonElement | null = null;
let pendingInstallClick = false;

// Detect Samsung Internet browser
const isSamsungInternet = () => {
  const ua = navigator.userAgent;
  return /SamsungBrowser/i.test(ua) || 
         /Samsung/i.test(ua) && /Mobile/i.test(ua);
};

// Detect iOS Safari (no beforeinstallprompt support)
const isIOSSafari = () => {
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  return isIOS && isSafari;
};

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
  console.log("beforeinstallprompt event fired", e);
  
  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault();
  
  // Don't show if already installed
  if (isInstalled()) {
    console.log("App is already installed - skipping install prompt");
    return;
  }
  
  // Store the event for later use
  deferredInstallPrompt = e as any;
  
  // Create and show the install button
  const btn = createInstallButton();
  btn.style.display = "block";
  
  console.log("Install prompt available - button shown");

  // If user already clicked install (e.g., Samsung Internet late event), prompt immediately
  if (pendingInstallClick && deferredInstallPrompt) {
    pendingInstallClick = false;
    (async () => {
      try {
        btn.disabled = true;
        btn.textContent = "Installing...";
        await (deferredInstallPrompt as any).prompt();
        const { outcome } = await (deferredInstallPrompt as any).userChoice;
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
        deferredInstallPrompt = null;
      } catch (err) {
        console.error('Error during immediate prompt after pending click', err);
        btn.textContent = "Install Meditrack";
        btn.disabled = false;
      }
    })();
  }
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

// For Samsung Internet - check if installable even without beforeinstallprompt
let installCheckInterval: ReturnType<typeof setInterval> | null = null;

window.addEventListener("load", () => {
  console.log("Page loaded");
  console.log("Is Samsung Internet:", isSamsungInternet());
  console.log("Is installed:", isInstalled());
  console.log("Service Worker:", 'serviceWorker' in navigator);
  
  // Check for manifest
  const manifestLink = document.querySelector('link[rel="manifest"]');
  console.log("Manifest link:", manifestLink?.getAttribute('href'));
  
  if (isInstalled()) {
    console.log("App is already installed");
    return;
  }
  
  // For Samsung Internet, wait a bit longer and check if prompt became available
  if (isSamsungInternet()) {
    console.log("Detected Samsung Internet - setting up install check");
    
    // Wait for beforeinstallprompt (up to 5 seconds)
    let checkCount = 0;
    installCheckInterval = setInterval(() => {
      checkCount++;
      
      if (deferredInstallPrompt && !installButtonEl) {
        console.log("Install prompt available - showing button");
        const btn = createInstallButton();
        btn.style.display = "block";
        if (installCheckInterval) {
          clearInterval(installCheckInterval);
          installCheckInterval = null;
        }
      }
      
      // After 5 seconds (10 checks), show button anyway for Samsung Internet
      if (checkCount >= 10 && !installButtonEl) {
        console.log("No beforeinstallprompt after 5 seconds - showing manual install button for Samsung Internet");
        
        // Check if manifest exists
        if (manifestLink) {
          const btn = createInstallButton();
          btn.style.display = "block";
          
          // Modify button to show manual instructions if prompt not available
          btn.onclick = async () => {
            if (deferredInstallPrompt) {
              // Use the actual prompt if available
              btn.disabled = true;
              btn.textContent = "Installing...";
              try {
                await deferredInstallPrompt.prompt();
                const { outcome } = await deferredInstallPrompt.userChoice;
                console.log(`User response: ${outcome}`);
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
                deferredInstallPrompt = null;
              } catch (error) {
                console.error("Error:", error);
                btn.textContent = "Install Meditrack";
                btn.disabled = false;
              }
            } else {
              // Remember click and show guidance; auto-prompt when event arrives
              pendingInstallClick = true;
              const message = `Preparing install... If nothing appears:\n\n1. Tap the menu button (⋮) at the top right\n2. Select "Add page to"\n3. Choose "Home screen"\n\nOr look for the install icon in the address bar.`;
              alert(message);
            }
          };
        }
        
        if (installCheckInterval) {
          clearInterval(installCheckInterval);
          installCheckInterval = null;
        }
      }
    }, 500);
  } else {
    // For non-Samsung browsers
    if (isIOSSafari()) {
      // iOS Safari: show manual Add to Home Screen guidance if not installed
      if (!isInstalled() && !installButtonEl) {
        const btn = createInstallButton();
        btn.style.display = "block";
        btn.onclick = () => {
          const message = `To install Meditrack on iOS:\n\n1. Tap the Share button (square with an up arrow)\n2. Scroll and tap "Add to Home Screen"\n3. Tap Add`;
          alert(message);
        };
      }
    } else {
      // Other browsers: wait a bit for beforeinstallprompt
      setTimeout(() => {
        if (deferredInstallPrompt && !installButtonEl) {
          const btn = createInstallButton();
          btn.style.display = "block";
        }
      }, 1000);
    }
  }
});
