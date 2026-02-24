import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import AdminLogoutButton from "../AdminLogoutButton";
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
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b bg-white px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <h1 className="text-lg font-semibold">Backend</h1>
          <AdminLogoutButton />
        </div>
      </header>
      <div className="mx-auto max-w-6xl">
        <AdminMatchingAlerts />
      </div>
      {children}
    </div>
  );
}
