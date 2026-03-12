import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { redirect, notFound } from "next/navigation";
import { BrandForm } from "@/components/dashboard/brand-form";

export default async function EditBrandPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const brand = await fetchQuery(api.brands.getByExternalId, { externalId: id });
  if (!brand || brand.userId !== user._id) notFound();

  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-press-start)] text-lg text-brand">
        Edit Brand
      </h1>
      <BrandForm
        action="edit"
        brandId={brand.externalId}
        initial={{
          name: brand.name,
          logo_url: brand.logo_url,
          website: brand.website,
          font_family: brand.font_family,
          colors: brand.colors,
        }}
      />
    </div>
  );
}
