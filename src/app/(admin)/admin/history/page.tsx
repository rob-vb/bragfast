import { getSessionUser } from "@/lib/auth/get-session-user";
import { redirect } from "next/navigation";
import { HistoryClient } from "@/components/admin/history-client";

export default async function HistoryPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return <HistoryClient />;
}
