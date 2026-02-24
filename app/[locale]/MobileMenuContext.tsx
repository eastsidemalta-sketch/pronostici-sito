"use client";

import { createContext, useContext, useState, useCallback } from "react";

export type MenuView = "main" | "sports";

type MobileMenuContextType = {
  isOpen: boolean;
  view: MenuView;
  openMenu: (view?: MenuView) => void;
  closeMenu: () => void;
  setView: (view: MenuView) => void;
};

const MobileMenuContext = createContext<MobileMenuContextType | null>(null);

export function useMobileMenu() {
  const ctx = useContext(MobileMenuContext);
  if (!ctx) throw new Error("useMobileMenu must be used within MobileMenuProvider");
  return ctx;
}

export function MobileMenuProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<MenuView>("main");
  const openMenu = useCallback((v: MenuView = "main") => {
    setView(v);
    setIsOpen(true);
  }, []);
  const closeMenu = useCallback(() => setIsOpen(false), []);
  return (
    <MobileMenuContext.Provider value={{ isOpen, view, openMenu, closeMenu, setView }}>
      {children}
    </MobileMenuContext.Provider>
  );
}
