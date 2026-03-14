import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAuth = await getSession();
  if (isAuth) redirect("/ad2min3k");
  return <>{children}</>;
}
