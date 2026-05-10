import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { redirect } from "next/navigation";
import { KitchenClient } from "./kitchen-client";
import type { CanvasTemplateConfig } from "@/lib/templates/canvas-types";
import {
  getDefaultMedium,
  type TemplateMedium,
} from "@/lib/templates/canvas-defaults";

const defaultDisplayIds: Record<string, string> = {
  "standard-browser": "standard-browser",
  "standard-mobile": "standard-mobile",
  "split-browser": "split-browser",
  "split-mobile": "split-mobile",
  hero: "hero",
  "carousel-slide": "carousel-slide",
};

export default async function KitchenPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [userTemplates, defaultTemplates] = await Promise.all([
    fetchQuery(api.templates.listByUser, { userId: user._id }),
    fetchQuery(api.templates.listDefaults, {}),
  ]);

  // ?imported=<sourceExternalId> lands here after the public Library import
  // flow. Look up the import by source so we can show the right banner.
  const params = await searchParams;
  const importedSource =
    typeof params.imported === "string" ? params.imported : undefined;
  const importedTemplate = importedSource
    ? userTemplates.find((t) => t.importedFromTemplateId === importedSource)
    : undefined;

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

  const allV2Templates = [
    ...v2Defaults,
    ...userTemplates.filter(
      (t) =>
        typeof t.config === "object" &&
        t.config !== null &&
        (t.config as Record<string, unknown>).version === 2,
    ),
  ];

  const cookTemplates = allV2Templates.map((t) => ({
    id: t.externalId,
    displayId: defaultDisplayIds[t.externalId],
    name: t.name,
    isDefault: t.isDefault,
    previewUrl: t.previewUrl,
    config: t.config as CanvasTemplateConfig,
    // For built-ins, the in-process TEMPLATE_MEDIUMS map is the source of
    // truth — a stale DB row (pre-seedDefaults) must not unlock video for an
    // image-only template like carousel-slide.
    medium: (getDefaultMedium(t.externalId) ??
      (t as { medium?: TemplateMedium }).medium ??
      "both") as TemplateMedium,
  }));

  const importedBanner = importedTemplate
    ? {
        externalId: importedTemplate.externalId,
        name: importedTemplate.name,
      }
    : undefined;

  return (
    <KitchenClient
      cookTemplates={cookTemplates}
      importedBanner={importedBanner}
    />
  );
}
