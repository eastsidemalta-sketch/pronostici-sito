"use client";

import { useState } from "react";
import AdminLogoutButton from "./AdminLogoutButton";
import AdminMatchingAlerts from "./AdminMatchingAlerts";
import AdminSidebar from "./AdminSidebar";

export default function AdminDashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-50 border-b bg-white px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen((o) => !o)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 md:hidden"
              aria-label="Apri menu"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold">Backend</h1>
          </div>
          <AdminLogoutButton />
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4">
        <AdminMatchingAlerts />
      </div>
      <div className="flex">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/30 md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden
          />
        )}
        {/* Sidebar: drawer su mobile, fisso su desktop */}
        <div
          className={`fixed inset-y-0 left-0 z-40 w-56 shrink-0 transform border-r border-neutral-200 bg-white pt-20 transition-transform md:static md:pt-0 md:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <AdminSidebar onNavigate={() => setSidebarOpen(false)} />
        </div>
        <div className="min-w-0 flex-1 p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
}
