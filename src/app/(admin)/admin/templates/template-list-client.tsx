"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TemplateCard } from "@/components/admin/template-card";
import { PixelButton } from "@/components/admin/pixel-button";
import { PixelCard } from "@/components/admin/pixel-card";
import type { CanvasTemplateConfig } from "@/lib/templates/canvas-types";

interface TemplateItem {
  id: string;
  displayId?: string;
  name: string;
  isDefault: boolean;
  medium?: "image" | "video" | "both";
  previewUrl?: string;
  isV2?: boolean;
  config?: CanvasTemplateConfig;
}

interface TemplateListClientProps {
  defaults: TemplateItem[];
  userTemplates: TemplateItem[];
}

export function TemplateListClient({
  defaults,
  userTemplates: initialUserTemplates,
}: TemplateListClientProps) {
  const router = useRouter();
  const [userTemplates, setUserTemplates] =
    useState<TemplateItem[]>(initialUserTemplates);

  async function handleClone(id: string) {
    try {
      const res = await fetch(`/api/v1/templates/${id}/clone`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Clone failed");
      const data = await res.json();
      const newTemplate: TemplateItem = {
        id: data.id,
        name: data.name,
        isDefault: false,
        previewUrl: data.preview_url ?? undefined,
        isV2: data.config?.version === 2,
        config: data.config?.version === 2 ? (data.config as CanvasTemplateConfig) : undefined,
      };
      setUserTemplates((prev) => [...prev, newTemplate]);
    } catch (err) {
      console.error("Failed to clone template:", err);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/v1/templates/${id}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 204) throw new Error("Delete failed");
      setUserTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error("Failed to delete template:", err);
    }
  }

  async function handleCreateBlank() {
    try {
      const res = await fetch("/api/v1/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Untitled Template",
          config: {
            version: 2,
            colors: { background: "#ffffff", text: "#000000", primary: "#3b82f6" },
            formats: {
              landscape: { objects: [
                { id: "title", type: "text", name: "title", x: 48, y: 400, width: 1104, height: 120, opacity: 1, zIndex: 1,
                  fontFamily: "Plus Jakarta Sans", fontSize: 48, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "top" },
              ]},
              square: { objects: [
                { id: "title", type: "text", name: "title", x: 48, y: 720, width: 984, height: 120, opacity: 1, zIndex: 1,
                  fontFamily: "Plus Jakarta Sans", fontSize: 48, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "top" },
              ]},
              portrait: { objects: [
                { id: "title", type: "text", name: "title", x: 48, y: 900, width: 984, height: 150, opacity: 1, zIndex: 1,
                  fontFamily: "Plus Jakarta Sans", fontSize: 56, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "top" },
              ]},
            },
          },
        }),
      });
      if (!res.ok) throw new Error("Create failed");
      const data = await res.json();
      router.push(`/admin/templates/${data.id}/edit`);
    } catch (err) {
      console.error("Failed to create template:", err);
    }
  }

  return (
    <div className="space-y-8">
      {/* Default Templates */}
      <section className="space-y-4">
        <h2 className="font-[family-name:var(--font-press-start)] text-sm text-brand">
          Default Templates
        </h2>
        {defaults.length === 0 ? (
          <PixelCard>
            <p className="text-center text-sm text-brand/60 py-8">
              No default templates available.
            </p>
          </PixelCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {defaults.map((t) => (
              <TemplateCard
                key={t.id}
                id={t.id}
                displayId={t.displayId}
                name={t.name}
                isDefault={t.isDefault}
                medium={t.medium}
                previewUrl={t.previewUrl}
                config={t.config}
                onClone={handleClone}
              />
            ))}
          </div>
        )}
      </section>

      {/* My Templates */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-[family-name:var(--font-press-start)] text-sm text-brand">
            My Templates
          </h2>
          <PixelButton onClick={handleCreateBlank}>+ Create Blank</PixelButton>
        </div>
        {userTemplates.length === 0 ? (
          <PixelCard>
            <p className="text-center text-sm text-brand/60 py-8">
              No templates yet. Clone a default or create a blank one!
            </p>
          </PixelCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userTemplates.map((t) => (
              <TemplateCard
                key={t.id}
                id={t.id}
                displayId={t.displayId}
                name={t.name}
                isDefault={t.isDefault}
                medium={t.medium}
                previewUrl={t.previewUrl}
                isV2={t.isV2}
                config={t.config}
                onClone={handleClone}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
