import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { redirect } from "next/navigation";
import { TemplateListClient } from "./template-list-client";

export default async function TemplatesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [userTemplates, defaultTemplates] = await Promise.all([
    fetchQuery(api.templates.listByUser, { userId: user._id }),
    fetchQuery(api.templates.listDefaults, {}),
  ]);

  const mapTemplate = (t: {
    externalId: string;
    name: string;
    isDefault: boolean;
    previewUrl?: string;
    config: unknown;
  }) => ({
    id: t.externalId,
    name: t.name,
    isDefault: t.isDefault,
    previewUrl: t.previewUrl,
    isV2: typeof t.config === "object" && t.config !== null && (t.config as Record<string, unknown>).version === 2,
  });

  // Only show v2 canvas defaults (have version: 2 in config)
  const v2Defaults = defaultTemplates.filter(
    (t) => typeof t.config === "object" && t.config !== null && (t.config as Record<string, unknown>).version === 2
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-[family-name:var(--font-press-start)] text-lg text-[#4A3326]">
          Templates
        </h1>
      </div>

      <TemplateListClient
        defaults={v2Defaults.map(mapTemplate)}
        userTemplates={userTemplates.map(mapTemplate)}
      />
    </div>
  );
}
