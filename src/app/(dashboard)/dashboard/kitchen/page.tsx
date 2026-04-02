import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { redirect } from "next/navigation";
import { KitchenClient } from "./kitchen-client";
import type { CanvasTemplateConfig } from "@/lib/templates/canvas-types";

export default async function KitchenPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [userTemplates, defaultTemplates, brands, creditBalance] = await Promise.all([
    fetchQuery(api.templates.listByUser, { userId: user._id }),
    fetchQuery(api.templates.listDefaults, {}),
    fetchQuery(api.brands.listByUser, { userId: user._id }),
    fetchQuery(api.userProfiles.getBalance, { userId: user._id }),
  ]);

  const defaultDisplayIds: Record<string, string> = {
    tmpl_standard_browser: "standard-browser",
    tmpl_standard_mobile: "standard-mobile",
    tmpl_split_browser: "split-browser",
    tmpl_split_mobile: "split-mobile",
    tmpl_hero: "hero",
  };

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
        (t.config as Record<string, unknown>).version === 2
    )
    .sort(
      (a, b) =>
        defaultOrder.indexOf(a.externalId) - defaultOrder.indexOf(b.externalId)
    );

  // Build cook templates — all v2 templates (defaults + user's own), with full config
  const allV2Templates = [
    ...v2Defaults,
    ...userTemplates.filter(
      (t) =>
        typeof t.config === "object" &&
        t.config !== null &&
        (t.config as Record<string, unknown>).version === 2
    ),
  ];

  const cookTemplates = allV2Templates.map((t) => ({
    id: t.externalId,
    displayId: defaultDisplayIds[t.externalId],
    name: t.name,
    isDefault: t.isDefault,
    previewUrl: t.previewUrl,
    config: t.config as CanvasTemplateConfig,
  }));

  return (
    <KitchenClient
      defaults={v2Defaults.map(mapTemplate)}
      userTemplates={userTemplates.map(mapTemplate)}
      brands={brands.map((b) => ({
        id: b._id,
        externalId: b.externalId,
        name: b.name,
        colors: b.colors,
        fontFamily: b.font_family,
      }))}
      cookTemplates={cookTemplates}
      creditBalance={creditBalance}
    />
  );
}
