"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { TemplateListClient } from "../templates/template-list-client";
import { PixelCard } from "@/components/dashboard/pixel-card";
import { PixelButton } from "@/components/dashboard/pixel-button";
import { PixelEmptyState } from "@/components/dashboard/pixel-empty-state";
import { CopyButton } from "@/components/dashboard/copy-button";
import { CookPage } from "@/components/kitchen/cook-page";
import type { TemplateItem } from "@/components/kitchen/recipe-step";
import Link from "next/link";

interface TemplateListItem {
  id: string;
  displayId?: string;
  name: string;
  isDefault: boolean;
  previewUrl?: string;
  isV2?: boolean;
}

interface BrandItem {
  id: string;
  externalId: string;
  name: string;
  colors: Record<string, string>;
  fontFamily?: string;
}

interface KitchenClientProps {
  defaults: TemplateListItem[];
  userTemplates: TemplateListItem[];
  brands: BrandItem[];
  cookTemplates: TemplateItem[];
  creditBalance?: number;
}

const tabs = ["cook", "templates", "brands"] as const;
type Tab = (typeof tabs)[number];

export function KitchenClient({
  defaults,
  userTemplates,
  brands,
  cookTemplates,
  creditBalance,
}: KitchenClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = (searchParams.get("tab") as Tab) || "cook";

  function setTab(tab: Tab) {
    router.replace(`/dashboard/kitchen?tab=${tab}`, { scroll: false });
  }

  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-press-start)] text-lg text-brand">
        Kitchen
      </h1>

      {/* Tabs */}
      <div className="relative">
        <div className="flex gap-0 -mb-[2px] relative z-10">
          {tabs.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setTab(tab)}
                className={`
                  font-[family-name:var(--font-press-start)] text-sm px-5 py-2.5
                  transition-colors capitalize
                  ${
                    isActive
                      ? "border-2 border-brand border-b-surface bg-surface text-brand"
                      : "border-2 border-transparent text-brand/40 hover:text-brand/60"
                  }
                `}
              >
                {tab}
              </button>
            );
          })}
        </div>
        <div className="border-b-2 border-brand" />
      </div>

      {/* Tab content */}
      {activeTab === "cook" && (
        <CookPage templates={cookTemplates} creditBalance={creditBalance} />
      )}

      {activeTab === "templates" && (
        <TemplateListClient defaults={defaults} userTemplates={userTemplates} />
      )}

      {activeTab === "brands" && (
        <div className="space-y-4">
          <div className="flex items-center justify-end">
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
                <Link
                  key={brand.id}
                  href={`/dashboard/brands/${brand.externalId}`}
                >
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
                    {brand.fontFamily && (
                      <p className="mt-2 text-xs text-brand/60">
                        {brand.fontFamily}
                      </p>
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
      )}
    </div>
  );
}
