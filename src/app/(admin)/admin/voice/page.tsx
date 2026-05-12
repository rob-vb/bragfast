import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { redirect } from "next/navigation";
import { VoiceProfileEditor } from "./VoiceProfileEditor";

export default async function VoicePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const md = await fetchQuery(api.userProfiles.getVoiceProfileMd, {
    userId: user._id,
  });

  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-press-start)] text-sm text-brand">
        Voice Profile
      </h1>
      <VoiceProfileEditor userId={user._id} initialMd={md} />
    </div>
  );
}
