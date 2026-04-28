import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { redirect } from "next/navigation";
import { TemplateListClient } from "./template-list-client";

const defaultDisplayIds: Record<string, string> = {
  "standard-browser": "standard-browser",
  "standard-mobile": "standard-mobile",
  "split-browser": "split-browser",
  "split-mobile": "split-mobile",
  hero: "hero",
  "carousel-cover": "carousel-cover",
  "carousel-content-text": "carousel-content-text",
  "carousel-content-image": "carousel-content-image",
  "carousel-outro": "carousel-outro",
};

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
    displayId: defaultDisplayIds[t.externalId],
    name: t.name,
    isDefault: t.isDefault,
    previewUrl: t.previewUrl,
    isV2:
      typeof t.config === "object" &&
      t.config !== null &&
      (t.config as Record<string, unknown>).version === 2,
  });

  const defaultOrder = Object.keys(defaultDisplayIds);
  const v2Defaults = defaultTemplates
    .filter(
      (t) =>
        typeof t.config === "object" &&
        t.config !== null &&
        (t.config as Record<string, unknown>).version === 2,
    )
    .sort(
      (a, b) =>
        defaultOrder.indexOf(a.externalId) -
        defaultOrder.indexOf(b.externalId),
    );

  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-press-start)] text-lg text-brand">
        Templates
      </h1>
      <TemplateListClient
        defaults={v2Defaults.map(mapTemplate)}
        userTemplates={userTemplates.map(mapTemplate)}
      />
    </div>
  );
}
