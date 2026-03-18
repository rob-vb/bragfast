import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { redirect } from "next/navigation";
import { PixelCard } from "@/components/dashboard/pixel-card";
import { PixelButton } from "@/components/dashboard/pixel-button";
import { PixelEmptyState } from "@/components/dashboard/pixel-empty-state";
import Link from "next/link";
import { CopyButton } from "@/components/dashboard/copy-button";

export default async function BrandsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const brands = await fetchQuery(api.brands.listByUser, { userId: user._id });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-[family-name:var(--font-press-start)] text-lg text-brand">
          Brands
        </h1>
        <Link href="/dashboard/brands/new">
          <PixelButton>+ New Brand</PixelButton>
        </Link>
      </div>

      {brands.length === 0 ? (
        <PixelEmptyState
          title="No brands yet"
          description="Set your colors, logo, and fonts. Every image comes out on-brand."
          cta={{ label: "Create Brand", href: "/dashboard/brands/new" }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {brands.map((brand) => (
            <Link key={brand._id} href={`/dashboard/brands/${brand.externalId}`}>
              <PixelCard className="hover:shadow-[2px_2px_0_var(--color-brand)] transition-shadow cursor-pointer">
                <h3 className="font-[family-name:var(--font-press-start)] text-xs text-brand">
                  {brand.name}
                </h3>
                <div className="mt-3 flex gap-2">
                  {Object.values(brand.colors).map((color, i) => (
                    <div
                      key={i}
                      className="h-6 w-6 border-2 border-brand"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                {brand.font_family && (
                  <p className="mt-2 text-xs text-brand/60">{brand.font_family}</p>
                )}
                <p className="mt-2 flex items-center gap-1 text-[10px] font-mono text-brand/80">
                  Brand ID: {brand.externalId}
                  <CopyButton text={brand.externalId} />
                </p>
              </PixelCard>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
