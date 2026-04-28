import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { redirect } from "next/navigation";
import { RoutingDefaultsClient } from "@/components/admin/routing-defaults-client";

export default async function RoutingDefaultsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [routingRows, integrationRows] = await Promise.all([
    fetchQuery(api.routingDefaults.listByUser, { userId: user._id }),
    fetchQuery(api.integrationSecrets.listByUser, { userId: user._id }),
  ]);

  // Only posting providers are relevant here.
  const postingIntegrations = integrationRows.filter(
    (r) => r.provider === "buffer" || r.provider === "postiz",
  );

  return (
    <RoutingDefaultsClient
      userId={user._id}
      routingRows={routingRows}
      integrations={postingIntegrations}
    />
  );
}
