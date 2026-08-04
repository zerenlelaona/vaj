"use client";

import { useEffect } from "react";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * Registers the service worker so the app keeps working with no internet
 * (and can be installed to a phone home screen). No-ops where unsupported
 * or on insecure origins.
 */
export default function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register(`${BASE}/sw.js`).catch(() => {
      // Offline support is a bonus; never break the app over it.
    });
  }, []);
  return null;
}
