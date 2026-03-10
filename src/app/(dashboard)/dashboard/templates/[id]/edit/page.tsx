import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { redirect } from "next/navigation";
import { TemplateEditor } from "@/components/editor/template-editor";
import type { CanvasTemplateConfig } from "@/lib/templates/canvas-types";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default async function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const template = await convex.query(api.templates.getByExternalId, { externalId: id });

  if (!template) {
    redirect("/dashboard/templates");
  }

  const config = template.config as CanvasTemplateConfig;

  // If legacy config (no version field), redirect to templates list
  if (!("version" in config) || config.version !== 2) {
    redirect("/dashboard/templates");
  }

  return (
    <TemplateEditor
      templateId={template.externalId}
      name={template.name}
      config={config}
    />
  );
}
