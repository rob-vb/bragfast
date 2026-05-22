import { getSessionUser } from "@/lib/auth/get-session-user";
import { redirect } from "next/navigation";
import { IntegrationsClient } from "@/components/admin/integrations-client";

export default async function IntegrationsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-press-start)] text-lg text-brand">
        Integrations
      </h1>
      <IntegrationsClient />
    </div>
  );
}
