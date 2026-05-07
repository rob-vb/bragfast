import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { LandingNav } from "@/components/landing/landing-nav";
import { TemplateDetailClient } from "./template-detail-client";

type Params = Promise<{ id: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { id } = await params;
  const tmpl = await fetchQuery(api.templates.getPublicTemplate, {
    externalId: id,
  });
  if (!tmpl) return { title: "Template not found | brag.fast" };
  return {
    title: `${tmpl.name} | brag.fast Template Library`,
    description: `${tmpl.name} — a brag.fast release template. Import in one click and ship a branded post.`,
    alternates: { canonical: `/templates/${id}` },
    openGraph: {
      title: tmpl.name,
      description: `${tmpl.name} — a brag.fast release template.`,
      images: tmpl.previewUrls?.landscape ? [tmpl.previewUrls.landscape] : undefined,
    },
  };
}

export default async function TemplateDetailPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const tmpl = await fetchQuery(api.templates.getPublicTemplate, {
    externalId: id,
  });
  if (!tmpl) notFound();

  return (
    <div className="min-h-screen bg-surface text-brand">
      <LandingNav />
      <TemplateDetailClient template={tmpl} />
    </div>
  );
}
