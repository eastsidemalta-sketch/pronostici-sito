"use client";

import { useEffect } from "react";

/**
 * Sincronizza visual viewport (altezza + offset) in --vvh e --vvo.
 * Su iOS quando si scrolla il visual viewport si sposta: --vvo aggiorna
 * così la bottom nav resta sempre in fondo allo schermo visibile.
 */
export default function ViewportSync() {
  useEffect(() => {
    const sync = () => {
      const vv = window.visualViewport;
      const h = vv?.height ?? window.innerHeight;
      const offsetTop = vv?.offsetTop ?? 0;
      document.documentElement.style.setProperty("--vvh", `${Math.round(h)}px`);
      document.documentElement.style.setProperty("--vvo", `${Math.round(offsetTop)}px`);
    };
    sync();
    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener("resize", sync);
      vv.addEventListener("scroll", sync);
    }
    window.addEventListener("resize", sync);
    window.addEventListener("scroll", sync, { passive: true });
    return () => {
      if (vv) {
        vv.removeEventListener("resize", sync);
        vv.removeEventListener("scroll", sync);
      }
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", sync);
    };
  }, []);
  return null;
}
