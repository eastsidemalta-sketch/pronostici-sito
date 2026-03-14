import Link from "next/link";
import { getMatchingReportAlerts } from "@/lib/matchingReportAlerts";

export default function AdminMatchingAlerts() {
  const alert = getMatchingReportAlerts();

  if (!alert.hasAlerts) return null;

  return (
    <div
      role="alert"
      className="mx-4 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm"
    >
      <div className="flex items-center gap-2">
        <span className="text-amber-600" aria-hidden>
          ⚠
        </span>
        <span className="font-medium text-amber-800">
          Report matching: intervento richiesto — {alert.message}
        </span>
        {alert.lastRun && (
          <span className="text-amber-600">
            (report: {new Date(alert.lastRun).toLocaleDateString("it-IT")})
          </span>
        )}
      </div>
      <Link
        href="/ad2min3k/matching-report"
        className="shrink-0 rounded bg-amber-600 px-3 py-1.5 font-medium text-white hover:bg-amber-700"
      >
        Vai al report
      </Link>
    </div>
  );
}
