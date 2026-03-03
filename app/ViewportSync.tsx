"use client";

import { useEffect } from "react";

/**
 * Sincronizza l'altezza del visual viewport in una CSS variable.
 * Aiuta Chrome mobile a posizionare correttamente elementi fixed quando
 * la barra del browser si nasconde durante lo scroll.
 */
export default function ViewportSync() {
  useEffect(() => {
    const setVvh = () => {
      const h = window.visualViewport?.height ?? window.innerHeight;
      document.documentElement.style.setProperty("--vvh", `${Math.round(h)}px`);
    };
    setVvh();
    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener("resize", setVvh);
      vv.addEventListener("scroll", setVvh);
    }
    window.addEventListener("resize", setVvh);
    return () => {
      if (vv) {
        vv.removeEventListener("resize", setVvh);
        vv.removeEventListener("scroll", setVvh);
      }
      window.removeEventListener("resize", setVvh);
    };
  }, []);
  return null;
}
