import { getSessionUser } from "@/lib/auth/get-session-user";
import { redirect } from "next/navigation";
import { PixelCard } from "@/components/admin/pixel-card";
import { KeyManager } from "@/components/admin/key-manager";

export default async function KeysPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-press-start)] text-lg text-brand">
        API Keys
      </h1>
      <PixelCard>
        <KeyManager />
      </PixelCard>
    </div>
  );
}
