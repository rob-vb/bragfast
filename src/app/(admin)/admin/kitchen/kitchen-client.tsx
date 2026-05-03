"use client";

import { CookPage } from "@/components/kitchen/cook-page";
import type { TemplateItem } from "@/components/kitchen/recipe-step";

interface KitchenClientProps {
  cookTemplates: TemplateItem[];
}

export function KitchenClient({ cookTemplates }: KitchenClientProps) {
  return <CookPage templates={cookTemplates} />;
}
