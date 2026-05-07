"use client";

import { CookPage } from "@/components/kitchen/cook-page";
import type { TemplateItem } from "@/components/kitchen/recipe-step";

interface KitchenClientProps {
  cookTemplates: TemplateItem[];
  importedBanner?: { externalId: string; name: string };
}

export function KitchenClient({ cookTemplates, importedBanner }: KitchenClientProps) {
  return <CookPage templates={cookTemplates} importedBanner={importedBanner} />;
}
