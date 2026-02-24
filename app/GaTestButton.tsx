"use client";

import { trackEvent } from "@/lib/analytics/ga";

export default function GaTestButton() {
  if (process.env.NODE_ENV !== "development") return null;

  return (
    <button
      type="button"
      onClick={() => trackEvent("test_event", { test_param: "ok" })}
      className="fixed bottom-20 right-4 z-[9999] rounded-lg border border-amber-400 bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-900 shadow-md hover:bg-amber-200 md:bottom-4"
      title="Invia evento GA4 test_event (solo dev)"
    >
      GA4 Test
    </button>
  );
}
