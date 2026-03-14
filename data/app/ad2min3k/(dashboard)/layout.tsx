import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSession } from "@/lib/auth";
import AdminDashboardShell from "../AdminDashboardShell";
import AdminMatchingAlerts from "../AdminMatchingAlerts";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAuth = await getSession();

  if (!isAuth) {
    redirect("/ad2min3k/login");
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-neutral-50 p-6">Caricamento…</div>}>
      <AdminDashboardShell alertsSlot={<AdminMatchingAlerts />}>
        {children}
      </AdminDashboardShell>
    </Suspense>
  );
}
