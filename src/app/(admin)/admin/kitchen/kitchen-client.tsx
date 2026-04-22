"use client";

import { CookPage } from "@/components/kitchen/cook-page";
import type { TemplateItem } from "@/components/kitchen/recipe-step";

interface KitchenClientProps {
  cookTemplates: TemplateItem[];
}

export function KitchenClient({ cookTemplates }: KitchenClientProps) {
  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-press-start)] text-lg text-brand">
        Kitchen
      </h1>
      <CookPage templates={cookTemplates} />
    </div>
  );
}
