import { fetchMutation } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { redirect } from "next/navigation";
import { DashboardClient } from "@/components/admin/dashboard-client";
import { isLaunchModeRepositioned } from "@/lib/launch-mode";

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  // Ensure trial profile exists (grants 10 credits on first visit)
  await fetchMutation(api.userProfiles.create, { userId: user._id, email: user.email });

  return <DashboardClient showRetroHero={isLaunchModeRepositioned()} />;
}
