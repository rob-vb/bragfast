import { getSessionUser } from "@/lib/auth/get-session-user";
import { redirect } from "next/navigation";
import { ReportClient } from "@/components/admin/report-client";

export default async function ReportPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return <ReportClient />;
}
