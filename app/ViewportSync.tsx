"use client";

import { useEffect } from "react";

/**
 * Sincronizza visual viewport (altezza e offset) in CSS variables.
 * Su iOS Safari/Chrome la barra degli indirizzi rende il layout viewport
 * più alto dell'area visibile; position:fixed bottom:0 si ancora al layout
 * e la nav finisce sotto lo schermo. Usando --vvh e --vvo posizioniamo
 * la bottom nav in base al visual viewport reale.
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
