# Dashboard UI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a pixel-arcade-styled authenticated dashboard with Kitchen (stats + recent releases), Brands (CRUD), History (release list), and API Keys (manage) pages.

**Architecture:** Next.js App Router `(dashboard)` route group with shared layout. Layout authenticates via `convexBetterAuthNextJs` server-side, redirects to `/login` if no session. Pages use `fetchQuery`/`fetchMutation` from `convex/nextjs` for data. Pixel UI: Press Start 2P headings, sharp corners, offset box-shadows, `#F8AF3C`/`#4A3326`/`#FFF8F0` palette.

**Tech Stack:** Next.js 16 App Router, Convex (fetchQuery/fetchMutation), Better Auth (convexBetterAuthNextJs), Tailwind CSS 4, Press Start 2P + Geist fonts.

---

### Task 1: Add Missing Convex Queries

Releases table has no `listByUser` query. Kitchen page needs aggregate stats. Add these before building UI.

**Files:**
- Modify: `convex/releases.ts`
- Modify: `convex/userProfiles.ts`

**Step 1: Add `listByUser` to releases.ts**

```ts
export const listByUser = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) =>
    ctx.db
      .query("releases")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect(),
});
```

**Step 2: Add `getStats` to userProfiles.ts**

Returns credits remaining, credits used this month, total releases, total images generated — all from one query to avoid waterfalls.

```ts
export const getStats = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    const releases = await ctx.db
      .query("releases")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const creditsUsedThisMonth = releases
      .filter((r) => r.created_at >= monthStart)
      .reduce((sum, r) => sum + r.credits_used, 0);

    const totalImages = releases
      .filter((r) => r.status === "completed" && r.images)
      .reduce((sum, r) => {
        const imgs = r.images as Record<string, Record<string, string>> | undefined;
        if (!imgs) return sum;
        return sum + Object.values(imgs).reduce((s, formats) => s + Object.keys(formats).length, 0);
      }, 0);

    return {
      creditsRemaining: profile?.creditsRemaining ?? 0,
      plan: profile?.plan ?? "trial",
      creditsUsedThisMonth,
      totalReleases: releases.length,
      totalImages,
    };
  },
});
```

**Step 3: Verify Convex generates types**

Run: `npx convex dev` (should already be running) — check that `api.releases.listByUser` and `api.userProfiles.getStats` are available.

**Step 4: Commit**

```bash
git add convex/releases.ts convex/userProfiles.ts
git commit -m "feat: add listByUser and getStats Convex queries for dashboard"
```

---

### Task 2: Dashboard Layout + Auth Guard

Create the `(dashboard)` route group with shared layout: top nav bar, auth check, pixel styling.

**Files:**
- Create: `src/app/(dashboard)/layout.tsx`
- Create: `src/lib/auth/get-session-user.ts` (extract shared auth helper)

**Step 1: Extract auth helper**

The pattern `convexBetterAuthNextJs` + `getToken()` + `fetchAuthQuery` is repeated in every API route. Extract it once.

```ts
// src/lib/auth/get-session-user.ts
import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs";
import { api } from "@convex/_generated/api";

const auth = convexBetterAuthNextJs({
  convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL!,
  convexSiteUrl: process.env.CONVEX_SITE_URL!,
});

export async function getSessionUser() {
  const token = await auth.getToken();
  if (!token) return null;
  const user = await auth.fetchAuthQuery(api.auth.getCurrentUser);
  return user;
}
```

**Step 2: Create dashboard layout**

```tsx
// src/app/(dashboard)/layout.tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { DashboardNav } from "@/components/dashboard/nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b-2 border-[#4A3326] bg-[#FFF8F0]">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image src="/logo-icon.svg" alt="Bragfast" width={32} height={33} />
            <span className="font-[family-name:var(--font-press-start)] text-sm text-[#4A3326]">
              BRAGFAST
            </span>
          </Link>
          <DashboardNav />
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-6xl px-4 py-8">
        {children}
      </main>
    </div>
  );
}
```

**Step 3: Create nav component (client component for active state)**

```tsx
// src/components/dashboard/nav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Kitchen", href: "/dashboard" },
  { label: "Brands", href: "/dashboard/brands" },
  { label: "History", href: "/dashboard/history" },
  { label: "Keys", href: "/dashboard/keys" },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1">
      {tabs.map((tab) => {
        const isActive =
          tab.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`
              font-[family-name:var(--font-press-start)] text-xs px-3 py-2
              border-2 border-[#4A3326]
              transition-all
              ${
                isActive
                  ? "bg-[#F8AF3C] text-[#4A3326] shadow-[2px_2px_0_#4A3326]"
                  : "bg-transparent text-[#4A3326] hover:bg-[#F8AF3C]/20 shadow-[3px_3px_0_#4A3326] hover:shadow-[2px_2px_0_#4A3326]"
              }
            `}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
```

**Step 4: Add placeholder Kitchen page**

```tsx
// src/app/(dashboard)/page.tsx
export default function KitchenPage() {
  return <h1 className="font-[family-name:var(--font-press-start)] text-xl text-[#4A3326]">Kitchen</h1>;
}
```

**Step 5: Verify** — run `npm run dev`, visit `/dashboard`. Should redirect to `/login` if not authenticated. If authenticated, should show top bar with nav tabs and "Kitchen" heading.

**Step 6: Commit**

```bash
git add src/lib/auth/get-session-user.ts src/app/\(dashboard\)/layout.tsx src/app/\(dashboard\)/page.tsx src/components/dashboard/nav.tsx
git commit -m "feat: add dashboard layout with pixel arcade nav bar and auth guard"
```

---

### Task 3: Pixel UI Primitives

Create reusable styled components for the dashboard's pixel aesthetic. These are used by all four pages.

**Files:**
- Create: `src/components/dashboard/pixel-card.tsx`
- Create: `src/components/dashboard/pixel-button.tsx`
- Create: `src/components/dashboard/pixel-badge.tsx`
- Create: `src/components/dashboard/pixel-table.tsx`

**Step 1: PixelCard**

```tsx
// src/components/dashboard/pixel-card.tsx
export function PixelCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`border-2 border-[#4A3326] bg-white p-4 shadow-[4px_4px_0_#4A3326] ${className}`}
    >
      {children}
    </div>
  );
}
```

**Step 2: PixelButton**

```tsx
// src/components/dashboard/pixel-button.tsx
import { ButtonHTMLAttributes } from "react";

export function PixelButton({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "danger" | "ghost";
}) {
  const base =
    "font-[family-name:var(--font-press-start)] text-xs px-4 py-2 border-2 border-[#4A3326] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary: "bg-[#F8AF3C] text-[#4A3326] shadow-[4px_4px_0_#4A3326] hover:shadow-[2px_2px_0_#4A3326]",
    danger: "bg-red-500 text-white shadow-[4px_4px_0_#4A3326] hover:shadow-[2px_2px_0_#4A3326]",
    ghost: "bg-transparent text-[#4A3326] shadow-[4px_4px_0_#4A3326] hover:bg-[#F8AF3C]/20 hover:shadow-[2px_2px_0_#4A3326]",
  };

  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
```

**Step 3: PixelBadge**

```tsx
// src/components/dashboard/pixel-badge.tsx
const statusStyles = {
  completed: "bg-green-400 text-[#4A3326]",
  pending: "bg-yellow-300 text-[#4A3326]",
  failed: "bg-red-400 text-white",
};

export function PixelBadge({
  status,
}: {
  status: "completed" | "pending" | "failed";
}) {
  return (
    <span
      className={`inline-block border-2 border-[#4A3326] px-2 py-0.5 font-[family-name:var(--font-press-start)] text-[10px] ${statusStyles[status]}`}
    >
      {status}
    </span>
  );
}
```

**Step 4: PixelTable**

```tsx
// src/components/dashboard/pixel-table.tsx
export function PixelTable({
  headers,
  children,
}: {
  headers: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto border-2 border-[#4A3326] bg-white shadow-[4px_4px_0_#4A3326]">
      <table className="w-full text-left text-sm text-[#4A3326]">
        <thead>
          <tr className="border-b-2 border-[#4A3326] bg-[#F8AF3C]/20">
            {headers.map((h) => (
              <th
                key={h}
                className="px-4 py-3 font-[family-name:var(--font-press-start)] text-[10px] uppercase"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#4A3326]/10">{children}</tbody>
      </table>
    </div>
  );
}
```

**Step 5: Commit**

```bash
git add src/components/dashboard/
git commit -m "feat: add pixel UI primitives (card, button, badge, table)"
```

---

### Task 4: Kitchen Page (Dashboard Home)

Stats row + recent releases table.

**Files:**
- Modify: `src/app/(dashboard)/page.tsx`

**Step 1: Build the Kitchen page**

```tsx
// src/app/(dashboard)/page.tsx
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { redirect } from "next/navigation";
import { PixelCard } from "@/components/dashboard/pixel-card";
import { PixelTable } from "@/components/dashboard/pixel-table";
import { PixelBadge } from "@/components/dashboard/pixel-badge";
import Link from "next/link";

export default async function KitchenPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [stats, releases] = await Promise.all([
    fetchQuery(api.userProfiles.getStats, { userId: user._id }),
    fetchQuery(api.releases.listByUser, { userId: user._id }),
  ]);

  const recent = releases.slice(0, 10);

  const statCards = [
    { label: "Credits Left", value: stats.creditsRemaining },
    { label: "Used (Month)", value: stats.creditsUsedThisMonth },
    { label: "Releases", value: stats.totalReleases },
    { label: "Images", value: stats.totalImages },
  ];

  return (
    <div className="space-y-8">
      <h1 className="font-[family-name:var(--font-press-start)] text-lg text-[#4A3326]">
        Kitchen
      </h1>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {statCards.map((s) => (
          <PixelCard key={s.label}>
            <p className="font-[family-name:var(--font-press-start)] text-2xl text-[#4A3326]">
              {s.value}
            </p>
            <p className="mt-1 text-xs text-[#4A3326]/60">{s.label}</p>
          </PixelCard>
        ))}
      </div>

      {/* Recent orders */}
      <div>
        <h2 className="mb-4 font-[family-name:var(--font-press-start)] text-sm text-[#4A3326]">
          Recent Orders
        </h2>
        {recent.length === 0 ? (
          <PixelCard>
            <p className="text-center text-sm text-[#4A3326]/60 py-8">
              No releases yet. Fire off your first one via the API!
            </p>
          </PixelCard>
        ) : (
          <PixelTable headers={["ID", "Template", "Status", "Credits", "Date"]}>
            {recent.map((r) => (
              <tr key={r._id} className="hover:bg-[#F8AF3C]/5">
                <td className="px-4 py-3 font-mono text-xs">
                  <Link
                    href={`/dashboard/history?id=${r.externalId}`}
                    className="underline underline-offset-4 hover:text-[#F8AF3C]"
                  >
                    {r.externalId.slice(0, 14)}...
                  </Link>
                </td>
                <td className="px-4 py-3 text-xs">{r.template}</td>
                <td className="px-4 py-3">
                  <PixelBadge status={r.status} />
                </td>
                <td className="px-4 py-3 text-xs">{r.credits_used}</td>
                <td className="px-4 py-3 text-xs">
                  {new Date(r.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </PixelTable>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Verify** — visit `/dashboard` while logged in. Should see 4 stat cards and recent releases table.

**Step 3: Commit**

```bash
git add src/app/\(dashboard\)/page.tsx
git commit -m "feat: Kitchen page with stats and recent releases"
```

---

### Task 5: Brands Page (List + CRUD)

Brand card grid with create/edit forms.

**Files:**
- Create: `src/app/(dashboard)/brands/page.tsx`
- Create: `src/app/(dashboard)/brands/new/page.tsx`
- Create: `src/app/(dashboard)/brands/[id]/page.tsx`
- Create: `src/components/dashboard/brand-form.tsx`

**Step 1: Brand list page**

```tsx
// src/app/(dashboard)/brands/page.tsx
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { redirect } from "next/navigation";
import { PixelCard } from "@/components/dashboard/pixel-card";
import { PixelButton } from "@/components/dashboard/pixel-button";
import Link from "next/link";

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
              </PixelCard>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Brand form (client component, shared by create + edit)**

```tsx
// src/components/dashboard/brand-form.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PixelButton } from "@/components/dashboard/pixel-button";
import { PixelCard } from "@/components/dashboard/pixel-card";

type BrandData = {
  name: string;
  logo_url?: string;
  website?: string;
  font?: string;
  colors: { background: string; text: string; primary: string };
};

export function BrandForm({
  initial,
  action,
}: {
  initial?: BrandData;
  action: "create" | "edit";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<BrandData>(
    initial ?? {
      name: "",
      logo_url: "",
      website: "",
      font: "",
      colors: { background: "#FFF8F0", text: "#1A1A1A", primary: "#F8AF3C" },
    }
  );

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateColor(field: string, value: string) {
    setForm((prev) => ({
      ...prev,
      colors: { ...prev.colors, [field]: value },
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Submit to API route (reuses existing v1 endpoints)
    // BrandForm receives the fetch URL + method from the page
    const url =
      action === "create"
        ? "/api/v1/brands"
        : `/api/v1/brands/${(initial as any)?.id}`;
    const method = action === "create" ? "POST" : "PATCH";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Something went wrong");
      return;
    }

    router.push("/dashboard/brands");
    router.refresh();
  }

  const inputClass =
    "w-full border-2 border-[#4A3326] bg-white px-3 py-2 text-sm text-[#4A3326] placeholder:text-[#4A3326]/40 focus:outline-none focus:ring-2 focus:ring-[#F8AF3C]";

  return (
    <PixelCard>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-bold text-[#4A3326]">Name *</label>
          <input
            className={inputClass}
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            required
            placeholder="My Product"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-[#4A3326]">Logo URL</label>
          <input
            className={inputClass}
            value={form.logo_url ?? ""}
            onChange={(e) => update("logo_url", e.target.value)}
            placeholder="https://..."
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-[#4A3326]">Website</label>
          <input
            className={inputClass}
            value={form.website ?? ""}
            onChange={(e) => update("website", e.target.value)}
            placeholder="https://..."
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-[#4A3326]">Font</label>
          <input
            className={inputClass}
            value={form.font ?? ""}
            onChange={(e) => update("font", e.target.value)}
            placeholder="Inter"
          />
        </div>

        {/* Color pickers */}
        <div className="grid grid-cols-3 gap-4">
          {(["background", "text", "primary"] as const).map((key) => (
            <div key={key}>
              <label className="mb-1 block text-xs font-bold text-[#4A3326] capitalize">
                {key}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.colors[key]}
                  onChange={(e) => updateColor(key, e.target.value)}
                  className="h-8 w-8 cursor-pointer border-2 border-[#4A3326]"
                />
                <input
                  className={`${inputClass} font-mono text-xs`}
                  value={form.colors[key]}
                  onChange={(e) => updateColor(key, e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <PixelButton type="submit" disabled={loading}>
            {loading ? "Saving..." : action === "create" ? "Create" : "Save"}
          </PixelButton>
          <PixelButton
            type="button"
            variant="ghost"
            onClick={() => router.push("/dashboard/brands")}
          >
            Cancel
          </PixelButton>
        </div>
      </form>
    </PixelCard>
  );
}
```

**Step 3: Create brand page**

```tsx
// src/app/(dashboard)/brands/new/page.tsx
import { BrandForm } from "@/components/dashboard/brand-form";

export default function NewBrandPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-press-start)] text-lg text-[#4A3326]">
        New Brand
      </h1>
      <BrandForm action="create" />
    </div>
  );
}
```

**Step 4: Edit brand page**

```tsx
// src/app/(dashboard)/brands/[id]/page.tsx
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
      <h1 className="font-[family-name:var(--font-press-start)] text-lg text-[#4A3326]">
        Edit Brand
      </h1>
      <BrandForm
        action="edit"
        initial={{
          name: brand.name,
          logo_url: brand.logo_url,
          website: brand.website,
          font: brand.font,
          colors: brand.colors,
          id: brand.externalId,
        } as any}
      />
    </div>
  );
}
```

**Step 5: Fix brands API route auth** — the existing `/api/v1/brands` route uses API key auth (Bearer token). The dashboard uses session auth. Need to update the brands route to also accept session auth, OR create dashboard-specific API routes.

Check: the existing brands route at `src/app/api/v1/brands/route.ts` — does it use `validateApiKey` or session auth? If API key only, add session auth support.

**Step 6: Verify** — visit `/dashboard/brands`, create a brand, edit it.

**Step 7: Commit**

```bash
git add src/app/\(dashboard\)/brands/ src/components/dashboard/brand-form.tsx
git commit -m "feat: Brands page with list, create, and edit"
```

---

### Task 6: History Page

Release history table with status filter.

**Files:**
- Create: `src/app/(dashboard)/history/page.tsx`

**Step 1: Build History page**

```tsx
// src/app/(dashboard)/history/page.tsx
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { redirect } from "next/navigation";
import { PixelTable } from "@/components/dashboard/pixel-table";
import { PixelBadge } from "@/components/dashboard/pixel-badge";
import { PixelCard } from "@/components/dashboard/pixel-card";
import { HistoryFilter } from "@/components/dashboard/history-filter";

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { status } = await searchParams;
  const allReleases = await fetchQuery(api.releases.listByUser, { userId: user._id });

  const releases = status && status !== "all"
    ? allReleases.filter((r) => r.status === status)
    : allReleases;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-[family-name:var(--font-press-start)] text-lg text-[#4A3326]">
          History
        </h1>
        <HistoryFilter current={status ?? "all"} />
      </div>

      {releases.length === 0 ? (
        <PixelCard>
          <p className="text-center text-sm text-[#4A3326]/60 py-8">
            No releases found.
          </p>
        </PixelCard>
      ) : (
        <PixelTable
          headers={["ID", "Template", "Slides", "Status", "Credits", "Date"]}
        >
          {releases.map((r) => (
            <tr key={r._id} className="hover:bg-[#F8AF3C]/5">
              <td className="px-4 py-3 font-mono text-xs">{r.externalId}</td>
              <td className="px-4 py-3 text-xs">{r.template}</td>
              <td className="px-4 py-3 text-xs">
                {r.images ? Object.keys(r.images as Record<string, unknown>).length : "-"}
              </td>
              <td className="px-4 py-3">
                <PixelBadge status={r.status} />
              </td>
              <td className="px-4 py-3 text-xs">{r.credits_used}</td>
              <td className="px-4 py-3 text-xs">
                {new Date(r.created_at).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </PixelTable>
      )}
    </div>
  );
}
```

**Step 2: Create filter component**

```tsx
// src/components/dashboard/history-filter.tsx
"use client";

import { useRouter } from "next/navigation";
import { PixelButton } from "@/components/dashboard/pixel-button";

const filters = ["all", "completed", "pending", "failed"] as const;

export function HistoryFilter({ current }: { current: string }) {
  const router = useRouter();

  return (
    <div className="flex gap-1">
      {filters.map((f) => (
        <PixelButton
          key={f}
          variant={current === f ? "primary" : "ghost"}
          onClick={() =>
            router.push(f === "all" ? "/dashboard/history" : `/dashboard/history?status=${f}`)
          }
        >
          {f}
        </PixelButton>
      ))}
    </div>
  );
}
```

**Step 3: Verify** — visit `/dashboard/history`, check filter buttons work.

**Step 4: Commit**

```bash
git add src/app/\(dashboard\)/history/ src/components/dashboard/history-filter.tsx
git commit -m "feat: History page with status filtering"
```

---

### Task 7: API Keys Page

Key list + generate + revoke.

**Files:**
- Create: `src/app/(dashboard)/keys/page.tsx`
- Create: `src/components/dashboard/key-manager.tsx`

**Step 1: Keys page (server component loads data, client component handles interactions)**

```tsx
// src/app/(dashboard)/keys/page.tsx
import { getSessionUser } from "@/lib/auth/get-session-user";
import { redirect } from "next/navigation";
import { KeyManager } from "@/components/dashboard/key-manager";

export default async function KeysPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-press-start)] text-lg text-[#4A3326]">
        API Keys
      </h1>
      <KeyManager />
    </div>
  );
}
```

**Step 2: KeyManager client component**

```tsx
// src/components/dashboard/key-manager.tsx
"use client";

import { useState, useEffect } from "react";
import { PixelButton } from "@/components/dashboard/pixel-button";
import { PixelCard } from "@/components/dashboard/pixel-card";
import { PixelTable } from "@/components/dashboard/pixel-table";

type ApiKey = { id: string; name: string; prefix: string; created_at: string };

export function KeyManager() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    fetch("/api/v1/api-keys")
      .then((r) => r.json())
      .then(setKeys);
  }, []);

  async function handleCreate() {
    setLoading(true);
    const res = await fetch("/api/v1/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name || "default" }),
    });
    const data = await res.json();
    setNewKey(data.key);
    setName("");
    setShowCreate(false);
    setLoading(false);
    // Refresh list
    const updated = await fetch("/api/v1/api-keys").then((r) => r.json());
    setKeys(updated);
  }

  async function handleRevoke(id: string) {
    if (!confirm("Revoke this key? This cannot be undone.")) return;
    await fetch(`/api/v1/api-keys`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setKeys((prev) => prev.filter((k) => k.id !== id));
  }

  const inputClass =
    "w-full border-2 border-[#4A3326] bg-white px-3 py-2 text-sm text-[#4A3326] placeholder:text-[#4A3326]/40 focus:outline-none focus:ring-2 focus:ring-[#F8AF3C]";

  return (
    <div className="space-y-4">
      {/* New key alert */}
      {newKey && (
        <PixelCard className="border-[#F8AF3C] bg-[#F8AF3C]/10">
          <p className="font-[family-name:var(--font-press-start)] text-xs text-[#4A3326] mb-2">
            Save this key — you won&apos;t see it again!
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-white border-2 border-[#4A3326] px-3 py-2 font-mono text-xs break-all">
              {newKey}
            </code>
            <PixelButton
              variant="ghost"
              onClick={() => {
                navigator.clipboard.writeText(newKey);
              }}
            >
              Copy
            </PixelButton>
          </div>
          <button
            onClick={() => setNewKey(null)}
            className="mt-2 text-xs text-[#4A3326]/60 hover:text-[#4A3326] underline"
          >
            Dismiss
          </button>
        </PixelCard>
      )}

      {/* Create form */}
      <div className="flex items-end gap-3">
        {showCreate ? (
          <>
            <input
              className={inputClass}
              placeholder="Key name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ maxWidth: 240 }}
            />
            <PixelButton onClick={handleCreate} disabled={loading}>
              {loading ? "..." : "Generate"}
            </PixelButton>
            <PixelButton variant="ghost" onClick={() => setShowCreate(false)}>
              Cancel
            </PixelButton>
          </>
        ) : (
          <PixelButton onClick={() => setShowCreate(true)}>
            + New Key
          </PixelButton>
        )}
      </div>

      {/* Key table */}
      {keys.length === 0 ? (
        <PixelCard>
          <p className="text-center text-sm text-[#4A3326]/60 py-8">
            No API keys yet.
          </p>
        </PixelCard>
      ) : (
        <PixelTable headers={["Name", "Key", "Created", ""]}>
          {keys.map((k) => (
            <tr key={k.id} className="hover:bg-[#F8AF3C]/5">
              <td className="px-4 py-3 text-xs">{k.name}</td>
              <td className="px-4 py-3 font-mono text-xs">{k.prefix}...</td>
              <td className="px-4 py-3 text-xs">
                {new Date(k.created_at).toLocaleDateString()}
              </td>
              <td className="px-4 py-3">
                <PixelButton variant="danger" onClick={() => handleRevoke(k.id)}>
                  Revoke
                </PixelButton>
              </td>
            </tr>
          ))}
        </PixelTable>
      )}
    </div>
  );
}
```

**Step 3: Check if DELETE endpoint exists** on `/api/v1/api-keys`. If not, add a DELETE handler that accepts `{ id }` in body and calls `api.apiKeys.remove`.

**Step 4: Verify** — visit `/dashboard/keys`, generate a key, copy it, revoke it.

**Step 5: Commit**

```bash
git add src/app/\(dashboard\)/keys/ src/components/dashboard/key-manager.tsx
git commit -m "feat: API Keys page with generate and revoke"
```

---

### Task 8: Auth Route Compatibility

The brands API route (`/api/v1/brands`) may only support API key auth. The dashboard needs session auth to work with the same endpoints. Check and fix.

**Files:**
- Modify: `src/app/api/v1/brands/route.ts`
- Modify: `src/app/api/v1/brands/[id]/route.ts`
- Possibly modify: `src/app/api/v1/api-keys/route.ts` (add DELETE handler)

**Step 1: Read current brands route auth pattern**

Check if it uses `validateApiKey` (Bearer token) or session auth. If only Bearer, add a fallback to session auth using `getSessionUser`.

**Step 2: Add DELETE to api-keys route if missing**

```ts
export async function DELETE(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const result = await fetchMutation(api.apiKeys.remove, {
    id: body.id,
    userId: user._id,
  });

  return result
    ? Response.json({ success: true })
    : Response.json({ error: "Key not found" }, { status: 404 });
}
```

**Step 3: Verify** — test all dashboard pages end-to-end with session auth.

**Step 4: Commit**

```bash
git add src/app/api/
git commit -m "feat: add session auth support to API routes for dashboard"
```

---

### Task 9: Polish + Responsive

Final pass: mobile responsiveness, empty states, loading states.

**Files:**
- Modify: various dashboard components

**Step 1: Make nav responsive** — on mobile, use smaller text or a hamburger menu.

**Step 2: Test all pages at mobile viewport** — check tables scroll horizontally, cards stack vertically.

**Step 3: Verify the full flow** — sign up → login → kitchen → create brand → generate key → check history.

**Step 4: Commit**

```bash
git add .
git commit -m "fix: responsive polish for dashboard"
```
