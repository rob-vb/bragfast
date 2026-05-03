import { fetchQuery } from "convex/nextjs";
import Link from "next/link";
import { api } from "@convex/_generated/api";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { redirect, notFound } from "next/navigation";
import { BrandForm } from "@/components/admin/brand-form";

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
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 font-[family-name:var(--font-press-start)] text-[10px] text-brand/50">
        <Link href="/admin/brands" className="hover:text-brand transition-colors">
          Brands
        </Link>
        <span aria-hidden="true">&rsaquo;</span>
        <span className="text-brand truncate max-w-[200px]">{brand.name}</span>
      </nav>
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
