"use client";

import { useEffect } from "react";

/** Registriert den Service Worker — nur in Produktion (stört Dev-HMR nicht). */
export function PWARegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registrierung fehlgeschlagen — App funktioniert ohne SW weiter.
    });
  }, []);
  return null;
}
