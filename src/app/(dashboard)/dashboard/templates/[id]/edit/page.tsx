import { getSessionUser } from "@/lib/auth/get-session-user";
import { redirect } from "next/navigation";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { TemplateEditor } from "@/components/dashboard/template-editor";
import type { TemplateConfig } from "@/lib/templates/config-types";

export default async function TemplateEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const template = await fetchQuery(api.templates.getByExternalId, { externalId: id });

  // Can't edit defaults or non-existent — redirect
  if (!template || template.isDefault || (template.userId !== user._id)) {
    redirect("/dashboard/templates");
  }

  // Fetch user's brands for preview selector
  const brands = await fetchQuery(api.brands.listByUser, { userId: user._id });

  return (
    <TemplateEditor
      templateId={template.externalId}
      initialName={template.name}
      initialConfig={template.config as TemplateConfig}
      brands={brands.map((b) => ({
        id: b.externalId,
        name: b.name,
        colors: b.colors,
      }))}
    />
  );
}
