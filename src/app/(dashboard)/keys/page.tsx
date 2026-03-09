import { getSessionUser } from "@/lib/auth/get-session-user";
import { redirect } from "next/navigation";
import { KeyManager } from "@/components/dashboard/key-manager";

export default async function KeysPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-press-start)] text-lg text-[#4A3326]">
        API Keys
      </h1>
      <KeyManager />
    </div>
  );
}
