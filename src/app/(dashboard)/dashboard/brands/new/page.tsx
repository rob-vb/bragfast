import { BrandForm } from "@/components/dashboard/brand-form";

export default function NewBrandPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-press-start)] text-lg text-brand">
        New Brand
      </h1>
      <BrandForm action="create" />
    </div>
  );
}
