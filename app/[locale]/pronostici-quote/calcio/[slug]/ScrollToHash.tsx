"use client";

import { useEffect } from "react";

/**
 * Scrolla all'elemento con id corrispondente all'hash nell'URL (es. #pronostici).
 * Utile per link diretti alla sezione pronostici dalla home.
 */
export default function ScrollToHash() {
  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash.slice(1) : "";
    if (!hash) return;
    const el = document.getElementById(hash);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);
  return null;
}
