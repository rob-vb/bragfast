import { getSessionUser } from "@/lib/auth/get-session-user";
import { redirect } from "next/navigation";
import { SousChefClient } from "@/components/admin/sous-chef-client";

export default async function SousChefPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return <SousChefClient />;
}
