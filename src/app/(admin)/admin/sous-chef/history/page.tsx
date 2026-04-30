import { getSessionUser } from "@/lib/auth/get-session-user";
import { redirect } from "next/navigation";
import { SousChefHistoryFeed } from "@/components/admin/sous-chef-history-feed";

export default async function SousChefHistoryPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-[family-name:var(--font-press-start)] text-lg text-brand">
          Sous-Chef History
        </h1>
      </div>
      <p className="text-sm text-brand/70">
        Every trigger Sous-Chef sees lands here — drafted, auto-skipped, or
        dismissed. Append-only audit log.
      </p>
      <SousChefHistoryFeed />
    </div>
  );
}
