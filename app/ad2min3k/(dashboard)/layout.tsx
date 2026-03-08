import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSession } from "@/lib/auth";
import AdminLogoutButton from "../AdminLogoutButton";
import AdminMatchingAlerts from "../AdminMatchingAlerts";
import AdminSidebar from "../AdminSidebar";

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
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4">
          <h1 className="text-lg font-semibold">Backend</h1>
          <AdminLogoutButton />
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4">
        <AdminMatchingAlerts />
      </div>
      <div className="flex">
        <Suspense fallback={<div className="w-56 shrink-0 border-r border-neutral-200 bg-white" />}>
          <AdminSidebar />
        </Suspense>
        <div className="min-w-0 flex-1 p-6">{children}</div>
      </div>
    </div>
  );
}
