import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { redirect } from "next/navigation";
import { PixelCard } from "@/components/dashboard/pixel-card";
import { PixelButton } from "@/components/dashboard/pixel-button";
import Link from "next/link";
import { CopyButton } from "@/components/dashboard/copy-button";

export default async function BrandsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const brands = await fetchQuery(api.brands.listByUser, { userId: user._id });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-[family-name:var(--font-press-start)] text-lg text-[#4A3326]">
          Brands
        </h1>
        <Link href="/dashboard/brands/new">
          <PixelButton>+ New Brand</PixelButton>
        </Link>
      </div>

      {brands.length === 0 ? (
        <PixelCard>
          <p className="text-center text-sm text-[#4A3326]/60 py-8">
            No brands yet. Create your first brand kit!
          </p>
        </PixelCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {brands.map((brand) => (
            <Link key={brand._id} href={`/dashboard/brands/${brand.externalId}`}>
              <PixelCard className="hover:shadow-[2px_2px_0_#4A3326] transition-shadow cursor-pointer">
                <h3 className="font-[family-name:var(--font-press-start)] text-xs text-[#4A3326]">
                  {brand.name}
                </h3>
                <div className="mt-3 flex gap-2">
                  {Object.values(brand.colors).map((color, i) => (
                    <div
                      key={i}
                      className="h-6 w-6 border-2 border-[#4A3326]"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                {brand.font && (
                  <p className="mt-2 text-xs text-[#4A3326]/60">{brand.font}</p>
                )}
                <p className="mt-2 flex items-center gap-1 text-[10px] font-mono text-[#4A3326]/40">
                  {brand.externalId}
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
