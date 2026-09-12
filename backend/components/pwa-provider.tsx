"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { Download, Wifi, WifiOff, X } from "lucide-react";
import { getOfflineReports } from "@/lib/offline-queue";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface PwaContextType {
  isOnline: boolean;
  isInstallable: boolean;
  isStandalone: boolean;
  pendingOfflineCount: number;
  installApp: () => Promise<void>;
  dismissInstallBanner: () => void;
}

const PwaContext = createContext<PwaContextType>({
  isOnline: true,
  isInstallable: false,
  isStandalone: false,
  pendingOfflineCount: 0,
  installApp: async () => {},
  dismissInstallBanner: () => {},
});

export function usePwa() {
  return useContext(PwaContext);
}

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [pendingOfflineCount, setPendingOfflineCount] = useState(0);

  useEffect(() => {
    // 1. Connectivity status
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);

      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      // Check standalone mode
      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      setIsStandalone(isStandaloneMode);

      // 2. Service Worker Registration
      if ("serviceWorker" in navigator && process.env.NODE_ENV !== "test") {
        window.addEventListener("load", () => {
          navigator.serviceWorker
            .register("/sw.js")
            .then((reg) => {
              console.log("[PWA] Service Worker registered with scope:", reg.scope);
            })
            .catch((err) => {
              console.warn("[PWA] Service Worker registration failed:", err);
            });
        });
      }

      // 3. BeforeInstallPrompt
      const handleBeforeInstall = (e: Event) => {
        e.preventDefault();
        setInstallPrompt(e as BeforeInstallPromptEvent);
        // Only show if dismissed flag isn't set recently
        const dismissed = localStorage.getItem("fender_pwa_dismissed");
        if (!dismissed) {
          setShowBanner(true);
        }
      };

      window.addEventListener("beforeinstallprompt", handleBeforeInstall);

      // 4. Track offline reports
      const checkPending = async () => {
        try {
          const reports = await getOfflineReports();
          setPendingOfflineCount(reports.length);
        } catch {
          // ignore
        }
      };
      void checkPending();
      const interval = setInterval(checkPending, 8000);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
        window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
        clearInterval(interval);
      };
    }
  }, []);

  const installApp = async () => {
    if (!installPrompt) return;
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setShowBanner(false);
        setInstallPrompt(null);
      }
    } catch (err) {
      console.error("PWA install error:", err);
    }
  };

  const dismissInstallBanner = () => {
    setShowBanner(false);
    localStorage.setItem("fender_pwa_dismissed", Date.now().toString());
  };

  return (
    <PwaContext.Provider
      value={{
        isOnline,
        isInstallable: !!installPrompt,
        isStandalone,
        pendingOfflineCount,
        installApp,
        dismissInstallBanner,
      }}
    >
      {children}

      {/* Floating A2HS Install Drawer / Banner on Mobile */}
      {showBanner && installPrompt && !isStandalone ? (
        <div className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-md animate-slide-up rounded-2xl border border-blue-200 bg-slate-900/95 p-4 text-white shadow-2xl backdrop-blur-xl md:bottom-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="Fender"
                className="h-10 w-10 rounded-xl bg-white p-1 object-contain shadow-md"
              />
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-blue-400">
                  Instant Access
                </p>
                <h4 className="text-sm font-extrabold text-white">Install Fender App</h4>
                <p className="text-[11px] text-slate-300">
                  Works offline during power cuts & floods.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => void installApp()}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition-transform hover:bg-blue-500 active:scale-95"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Install</span>
              </button>
              <button
                onClick={dismissInstallBanner}
                className="rounded-lg p-1.5 text-slate-400 hover:text-white"
                title="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </PwaContext.Provider>
  );
}
