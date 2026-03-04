"use client";

import { useEffect } from "react";

/**
 * Sincronizza l'altezza del visual viewport in --vvh.
 * Utile per layout che devono adattarsi alla barra del browser su mobile.
 */
export default function ViewportSync() {
  useEffect(() => {
    const sync = () => {
      const h = window.visualViewport?.height ?? window.innerHeight;
      document.documentElement.style.setProperty("--vvh", `${Math.round(h)}px`);
    };
    sync();
    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener("resize", sync);
      vv.addEventListener("scroll", sync);
    }
    window.addEventListener("resize", sync);
    return () => {
      if (vv) {
        vv.removeEventListener("resize", sync);
        vv.removeEventListener("scroll", sync);
      }
      window.removeEventListener("resize", sync);
    };
  }, []);
  return null;
}
