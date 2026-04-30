import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { redirect } from "next/navigation";
import { SousChefClient } from "@/components/admin/sous-chef-client";

export default async function SousChefPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [installations, profile] = await Promise.all([
    fetchQuery(api.githubInstallations.listByUserId, { userId: user._id }),
    fetchQuery(api.userProfiles.getByUserId, { userId: user._id }),
  ]);

  return (
    <SousChefClient
      github={{
        installations,
        appSlug: process.env.NEXT_PUBLIC_GITHUB_APP_SLUG ?? "",
      }}
      plan={profile?.plan ?? "trial"}
    />
  );
}
