import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { redirect } from "next/navigation";
import { SousChefGoalsClient } from "@/components/admin/sous-chef-goals-client";

export default async function SousChefGoalsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const installations = await fetchQuery(api.githubInstallations.listByUserId, {
    userId: user._id,
  });

  return <SousChefGoalsClient hasGithub={installations.some((i) => i.status === "active" && i.enabled)} />;
}
