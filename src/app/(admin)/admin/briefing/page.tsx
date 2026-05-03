import { getSessionUser } from "@/lib/auth/get-session-user";
import { redirect } from "next/navigation";
import { BriefingClient } from "@/components/admin/briefing-client";

export default async function BriefingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return <BriefingClient />;
}
