import { getSessionUser } from "@/lib/auth/get-session-user";
import { redirect } from "next/navigation";
import { DraftsClient } from "@/components/admin/drafts-client";

export default async function DraftsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return <DraftsClient />;
}
