"use client";

import { useRouter } from "next/navigation";

export default function AdminLogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/ad2min3k/logout", { method: "POST" });
    router.push("/ad2min3k/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="text-sm text-neutral-600 hover:text-neutral-900"
    >
      Esci
    </button>
  );
}