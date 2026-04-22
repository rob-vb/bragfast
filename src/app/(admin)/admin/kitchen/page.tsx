import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { redirect } from "next/navigation";
import { KitchenClient } from "./kitchen-client";
import type { CanvasTemplateConfig } from "@/lib/templates/canvas-types";

const defaultDisplayIds: Record<string, string> = {
  tmpl_standard_browser: "standard-browser",
  tmpl_standard_mobile: "standard-mobile",
  tmpl_split_browser: "split-browser",
  tmpl_split_mobile: "split-mobile",
  tmpl_hero: "hero",
};

export default async function KitchenPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [userTemplates, defaultTemplates] = await Promise.all([
    fetchQuery(api.templates.listByUser, { userId: user._id }),
    fetchQuery(api.templates.listDefaults, {}),
  ]);

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
  }));

  return <KitchenClient cookTemplates={cookTemplates} />;
}
