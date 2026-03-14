"use client";

import { MobileMenuProvider } from "./MobileMenuContext";
import MobileMenuOverlay from "./MobileMenuOverlay";

export default function MobileMenuWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MobileMenuProvider>
      {children}
      <MobileMenuOverlay />
    </MobileMenuProvider>
  );
}
