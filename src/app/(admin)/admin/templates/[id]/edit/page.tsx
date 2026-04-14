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
    redirect("/admin/templates");
  }

  const config = template.config as CanvasTemplateConfig;

  // If legacy config (no version field), redirect to templates list
  if (!("version" in config) || config.version !== 2) {
    redirect("/admin/templates");
  }

  return (
    <>
      {/* Mobile gate — editor is desktop-only */}
      <div className="md:hidden px-4 py-12">
        <div className="border-[3px] border-brand bg-white shadow-[6px_6px_0_var(--color-brand)] overflow-hidden max-w-sm mx-auto">
          <div className="bg-brand text-gold px-4 py-3">
            <h2 className="font-[family-name:var(--font-press-start)] text-xs">
              &#9654; Desktop Only
            </h2>
          </div>
          <div className="p-6 text-center">
            <p className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/80 mb-4">
              The template editor works best on desktop. Open this page on a larger screen.
            </p>
            <a
              href="/admin/templates"
              className="inline-block font-[family-name:var(--font-press-start)] text-[10px] px-4 py-3 border-2 border-brand bg-gold text-brand shadow-[3px_3px_0_var(--color-brand)] hover:shadow-[1px_1px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            >
              &larr; Back to Templates
            </a>
          </div>
        </div>
      </div>

      {/* Desktop editor */}
      <div className="hidden md:block fixed inset-0 top-[57px] z-40">
        <TemplateEditor
          templateId={template.externalId}
          name={template.name}
          config={config}
        />
      </div>
    </>
  );
}
