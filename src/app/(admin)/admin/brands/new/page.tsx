import { BrandForm } from "@/components/admin/brand-form";

export default function NewBrandPage() {
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 font-[family-name:var(--font-press-start)] text-[10px] text-brand/50">
        <a href="/admin/brands" className="hover:text-brand transition-colors">
          Brands
        </a>
        <span aria-hidden="true">&rsaquo;</span>
        <span className="text-brand">New</span>
      </nav>
      <BrandForm action="create" />
    </div>
  );
}
