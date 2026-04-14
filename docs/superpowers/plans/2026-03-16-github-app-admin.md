# GitHub App Admin UI — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add admin UI for installing, configuring, and monitoring the GitHub App integration — no AI, no approval flow (that's Plan B).

**Architecture:** New "GitHub Integration" PixelCard on Account page. Client components fetch from session-authed API routes that wrap Convex queries/mutations. Follows the KeyManager pattern (fetch-based CRUD, no ConvexProvider). Webhook handler gets one small fix (pass webhookUrl).

**Tech Stack:** Next.js 16, Convex, GitHub REST API, Better Auth sessions

**Depends on:** Nothing — ships as a standalone working feature using existing mechanical text mapping.

---

## File Structure

**New files:**
- `src/app/api/github/repos/route.ts` — fetches repo list from GitHub API via installation token
- `src/app/api/github/configs/route.ts` — CRUD for per-repo configs
- `src/app/api/github/installations/route.ts` — list/toggle/disconnect installations
- `src/components/admin/github-section.tsx` — top-level client component for GitHub integration card
- `src/components/admin/github-repo-list.tsx` — repo list with merged config state
- `src/components/admin/github-repo-card.tsx` — per-repo config form
- `src/components/admin/github-skipped-log.tsx` — collapsible skipped releases table
- `src/lib/__tests__/map-release.test.ts` — tests for existing mapReleaseToRequest + stripMarkdown

**Modified files:**
- `convex/schema.ts` — add `webhookUrl` to `githubRepoConfigs`
- `convex/githubRepoConfigs.ts` — accept `webhookUrl` + `enabled` in upsert
- `convex/githubInstallations.ts` — add `toggle` mutation (ownership-checked)
- `src/app/api/github/callback/route.ts` — fix redirect path
- `src/app/api/github/webhooks/route.ts` — pass `webhookUrl` from repo config
- `src/app/(admin)/admin/account/page.tsx` — add GitHub Integration section
- `src/components/admin/history-table.tsx` — add GitHub source badge
- `src/components/admin/pixel-badge.tsx` — support arbitrary label + color
- `.env.example` — add `NEXT_PUBLIC_GITHUB_APP_SLUG`

---

## Chunk 1: Backend — Schema, Convex, Webhook Fix

### Task 1: Add `webhookUrl` to `githubRepoConfigs` schema

**Files:**
- Modify: `convex/schema.ts:122-135`

- [ ] **Step 1: Add webhookUrl field**

In `convex/schema.ts`, add `webhookUrl` to the `githubRepoConfigs` table definition, after `tagFilter`:

```ts
tagFilter: v.optional(v.string()),
webhookUrl: v.optional(v.string()),
```

- [ ] **Step 2: Run `npx convex dev` to verify schema pushes**

Run: `npx convex dev --once`
Expected: Schema validation passes, no errors.

- [ ] **Step 3: Commit**

```bash
git add convex/schema.ts
git commit -m "feat: add webhookUrl to githubRepoConfigs schema"
```

---

### Task 2: Update `githubRepoConfigs.upsert` to accept `webhookUrl` and `enabled`

**Files:**
- Modify: `convex/githubRepoConfigs.ts:4-46`

- [ ] **Step 1: Add args to upsert mutation**

Add `webhookUrl: v.optional(v.string())` and `enabled: v.optional(v.boolean())` to the `args` block:

```ts
export const upsert = mutation({
  args: {
    installationId: v.number(),
    repoFullName: v.string(),
    brandId: v.optional(v.string()),
    template: v.optional(v.string()),
    formats: v.optional(v.array(v.string())),
    skipPrereleases: v.optional(v.boolean()),
    tagFilter: v.optional(v.string()),
    webhookUrl: v.optional(v.string()),
    enabled: v.optional(v.boolean()),
  },
```

- [ ] **Step 2: Pass new fields through in update path**

In the `if (existing)` branch, add after the `tagFilter` line:

```ts
if (args.webhookUrl !== undefined) updates.webhookUrl = args.webhookUrl;
if (args.enabled !== undefined) updates.enabled = args.enabled;
```

- [ ] **Step 3: Pass new fields through in insert path**

In the `else` (insert) branch, add the fields:

```ts
await ctx.db.insert("githubRepoConfigs", {
  installationId: args.installationId,
  repoFullName: args.repoFullName,
  enabled: args.enabled ?? true,
  brandId: args.brandId,
  template: args.template,
  formats: args.formats,
  skipPrereleases: args.skipPrereleases ?? true,
  tagFilter: args.tagFilter,
  webhookUrl: args.webhookUrl,
  created_at: now,
  updated_at: now,
});
```

- [ ] **Step 4: Commit**

```bash
git add convex/githubRepoConfigs.ts
git commit -m "feat: accept webhookUrl and enabled in githubRepoConfigs.upsert"
```

---

### Task 3: Add ownership-checked `toggle` mutation to `githubInstallations`

**Files:**
- Modify: `convex/githubInstallations.ts`

Note: `remove` already handles webhook-driven deletion. We need a user-facing `toggle` that verifies ownership via `userId`.

- [ ] **Step 1: Add toggle mutation**

Append to `convex/githubInstallations.ts`:

```ts
export const toggle = mutation({
  args: {
    installationId: v.number(),
    userId: v.string(),
    enabled: v.boolean(),
  },
  handler: async (ctx, { installationId, userId, enabled }) => {
    const inst = await ctx.db
      .query("githubInstallations")
      .withIndex("by_installationId", (q) =>
        q.eq("installationId", installationId)
      )
      .first();
    if (!inst || inst.userId !== userId) {
      throw new Error("Installation not found");
    }
    await ctx.db.patch(inst._id, {
      enabled,
      updated_at: new Date().toISOString(),
    });
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add convex/githubInstallations.ts
git commit -m "feat: add ownership-checked toggle mutation for githubInstallations"
```

---

### Task 4: Fix callback redirect

**Files:**
- Modify: `src/app/api/github/callback/route.ts:19-20,51`

- [ ] **Step 1: Update redirect paths**

Change line 20 from:
```ts
new URL("/admin/github?error=missing_installation_id", request.url)
```
to:
```ts
new URL("/admin/account?error=github_missing_installation_id", request.url)
```

Change line 51 from:
```ts
return Response.redirect(new URL("/admin/github", request.url));
```
to:
```ts
return Response.redirect(new URL("/admin/account", request.url));
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/github/callback/route.ts
git commit -m "fix: redirect GitHub callback to /admin/account"
```

---

### Task 5: Pass `webhookUrl` through webhook handler

**Files:**
- Modify: `src/app/api/github/webhooks/route.ts:183-189`

- [ ] **Step 1: Add webhookUrl to release request**

In `handleReleasePublished`, after line 188 where `releaseRequest` is built, add:

```ts
if (repoConfig?.webhookUrl) {
  releaseRequest.webhook_url = repoConfig.webhookUrl;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/github/webhooks/route.ts
git commit -m "feat: pass webhookUrl from repo config through to release"
```

---

### Task 6: Tests for existing `mapReleaseToRequest` + `stripMarkdown`

**Files:**
- Create: `src/lib/__tests__/map-release.test.ts`

These functions have no tests yet. Add coverage before we build more on top.

- [ ] **Step 1: Write tests**

```ts
import { describe, it, expect } from "vitest";
import {
  stripMarkdown,
  mapReleaseToRequest,
  buildSourceMetadata,
  type GitHubReleasePayload,
} from "../github/map-release";

const makePayload = (overrides?: Partial<GitHubReleasePayload>): GitHubReleasePayload => ({
  action: "published",
  release: {
    id: 123,
    tag_name: "v1.0.0",
    name: "Release 1.0",
    body: "## What's new\n\n- Feature A\n- Feature B",
    prerelease: false,
    draft: false,
    html_url: "https://github.com/org/repo/releases/tag/v1.0.0",
  },
  repository: {
    full_name: "org/repo",
    owner: { login: "org" },
    name: "repo",
  },
  installation: { id: 456 },
  ...overrides,
});

describe("stripMarkdown", () => {
  it("removes headers", () => {
    expect(stripMarkdown("## Title\nBody")).toBe("Title\nBody");
  });

  it("removes bold and italic", () => {
    expect(stripMarkdown("**bold** and *italic*")).toBe("bold and italic");
  });

  it("removes images but keeps link text", () => {
    expect(stripMarkdown("![alt](img.png) and [link](url)")).toBe("and link");
  });

  it("removes code blocks", () => {
    expect(stripMarkdown("before\n```js\ncode\n```\nafter")).toBe("before\n\nafter");
  });

  it("removes list markers", () => {
    expect(stripMarkdown("- item\n- item")).toBe("item\nitem");
  });

  it("collapses excessive newlines", () => {
    expect(stripMarkdown("a\n\n\n\nb")).toBe("a\n\nb");
  });
});

describe("mapReleaseToRequest", () => {
  it("uses release name as title", () => {
    const req = mapReleaseToRequest(makePayload(), {});
    const titleObj = req.formats[0].slides[0].objects![0];
    expect(titleObj.text).toBe("Release 1.0");
  });

  it("falls back to tag_name when name is null", () => {
    const req = mapReleaseToRequest(
      makePayload({ release: { ...makePayload().release, name: null } }),
      {}
    );
    expect(req.formats[0].slides[0].objects![0].text).toBe("v1.0.0");
  });

  it("strips markdown from body for description", () => {
    const req = mapReleaseToRequest(makePayload(), {});
    const descObj = req.formats[0].slides[0].objects![1];
    expect(descObj.text).not.toContain("##");
    expect(descObj.text).toContain("Feature A");
  });

  it("truncates description to 200 chars", () => {
    const longBody = "A".repeat(300);
    const req = mapReleaseToRequest(
      makePayload({ release: { ...makePayload().release, body: longBody } }),
      {}
    );
    const desc = req.formats[0].slides[0].objects![1].text!;
    expect(desc.length).toBe(200);
    expect(desc.endsWith("...")).toBe(true);
  });

  it("applies brand_id from config", () => {
    const req = mapReleaseToRequest(makePayload(), { brandId: "brand_123" });
    expect(req.brand_id).toBe("brand_123");
    expect(req.colors).toBeUndefined();
  });

  it("falls back to default colors without brand_id", () => {
    const req = mapReleaseToRequest(makePayload(), {});
    expect(req.colors).toBeDefined();
    expect(req.name).toBe("org");
  });

  it("respects config template and formats", () => {
    const req = mapReleaseToRequest(makePayload(), {
      template: "hero",
      formats: ["square", "portrait"],
    });
    expect(req.template).toBe("hero");
    expect(req.formats).toHaveLength(2);
    expect(req.formats[0].name).toBe("square");
  });

  it("defaults to standard-browser and landscape", () => {
    const req = mapReleaseToRequest(makePayload(), {});
    expect(req.template).toBe("standard-browser");
    expect(req.formats[0].name).toBe("landscape");
  });
});

describe("buildSourceMetadata", () => {
  it("produces deterministic JSON for idempotency", () => {
    const a = buildSourceMetadata(makePayload());
    const b = buildSourceMetadata(makePayload());
    expect(a).toBe(b);
  });

  it("includes all required fields", () => {
    const meta = JSON.parse(buildSourceMetadata(makePayload()));
    expect(meta.installationId).toBe(456);
    expect(meta.repoFullName).toBe("org/repo");
    expect(meta.releaseTag).toBe("v1.0.0");
    expect(meta.githubReleaseId).toBe(123);
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run src/lib/__tests__/map-release.test.ts`
Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/lib/__tests__/map-release.test.ts
git commit -m "test: add coverage for mapReleaseToRequest and stripMarkdown"
```

---

### Task 7: Add env variable

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Add GITHUB_APP_SLUG**

Append to `.env.example`:

```
NEXT_PUBLIC_GITHUB_APP_SLUG=your-github-app-slug
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "chore: add NEXT_PUBLIC_GITHUB_APP_SLUG to env example"
```

---

## Chunk 2: API Routes

### Task 8: Installations API route

**Files:**
- Create: `src/app/api/github/installations/route.ts`

- [ ] **Step 1: Write the route**

```ts
import { fetchQuery, fetchMutation } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { getSessionUser } from "@/lib/auth/get-session-user";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const installations = await fetchQuery(api.githubInstallations.listByUserId, {
    userId: user._id,
  });
  return Response.json(installations);
}

export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { installationId, enabled } = body;

  if (typeof installationId !== "number" || typeof enabled !== "boolean") {
    return Response.json({ error: "installationId (number) and enabled (boolean) required" }, { status: 400 });
  }

  await fetchMutation(api.githubInstallations.toggle, {
    installationId,
    userId: user._id,
    enabled,
  });

  return Response.json({ success: true });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/github/installations/route.ts
git commit -m "feat: add GET/PATCH /api/github/installations route"
```

---

### Task 9: Repos API route

**Files:**
- Create: `src/app/api/github/repos/route.ts`

- [ ] **Step 1: Write the route**

```ts
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { getInstallationToken } from "@/lib/github/auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const installations = await fetchQuery(api.githubInstallations.listByUserId, {
    userId: user._id,
  });

  const active = installations.find(
    (i) => i.status === "active" && i.userId === user._id
  );
  if (!active) {
    return Response.json({ repos: [] });
  }

  const token = await getInstallationToken(active.installationId);

  const repos: Array<{
    full_name: string;
    name: string;
    private: boolean;
    description: string | null;
  }> = [];

  let page = 1;
  while (true) {
    const res = await fetch(
      `https://api.github.com/installation/repositories?per_page=100&page=${page}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error(`GitHub repos fetch failed: ${res.status} ${text}`);
      return Response.json({ error: "Failed to fetch repos" }, { status: 502 });
    }

    const data = await res.json();
    for (const r of data.repositories) {
      repos.push({
        full_name: r.full_name,
        name: r.name,
        private: r.private,
        description: r.description,
      });
    }

    if (repos.length >= data.total_count || data.repositories.length < 100) break;
    page++;
  }

  return Response.json(
    { repos },
    { headers: { "Cache-Control": "private, max-age=60" } }
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/github/repos/route.ts
git commit -m "feat: add GET /api/github/repos route (fetches via installation token)"
```

---

### Task 10: Configs API route

**Files:**
- Create: `src/app/api/github/configs/route.ts`

- [ ] **Step 1: Write the route**

```ts
import { fetchQuery, fetchMutation } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { getSessionUser } from "@/lib/auth/get-session-user";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const installations = await fetchQuery(api.githubInstallations.listByUserId, {
    userId: user._id,
  });
  const active = installations.find((i) => i.status === "active");
  if (!active) return Response.json([]);

  const configs = await fetchQuery(api.githubRepoConfigs.listByInstallation, {
    installationId: active.installationId,
  });
  return Response.json(configs);
}

export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  // Verify ownership: installation must belong to this user
  const installations = await fetchQuery(api.githubInstallations.listByUserId, {
    userId: user._id,
  });
  const owns = installations.find(
    (i) => i.installationId === body.installationId && i.status === "active"
  );
  if (!owns) {
    return Response.json({ error: "Installation not found" }, { status: 404 });
  }

  await fetchMutation(api.githubRepoConfigs.upsert, {
    installationId: body.installationId,
    repoFullName: body.repoFullName,
    enabled: body.enabled,
    brandId: body.brandId || undefined,
    template: body.template || undefined,
    formats: body.formats?.length ? body.formats : undefined,
    skipPrereleases: body.skipPrereleases,
    tagFilter: body.tagFilter || undefined,
    webhookUrl: body.webhookUrl || undefined,
  });

  return Response.json({ success: true });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/github/configs/route.ts
git commit -m "feat: add GET/PUT /api/github/configs route"
```

---

## Chunk 3: UI Components

### Task 11: Extend PixelBadge for arbitrary labels

**Files:**
- Modify: `src/components/admin/pixel-badge.tsx`

- [ ] **Step 1: Add support for custom label + variant**

Replace the entire file:

```tsx
const statusStyles: Record<string, string> = {
  completed: "bg-green-400 text-brand",
  pending: "bg-yellow-300 text-brand",
  failed: "bg-red-400 text-white",
  active: "bg-green-400 text-brand",
  suspended: "bg-orange-400 text-brand",
  removed: "bg-red-400 text-white",
  github: "bg-purple-400 text-white",
};

type Props =
  | { status: "completed" | "pending" | "failed"; label?: never; variant?: never }
  | { label: string; variant?: string; status?: never };

export function PixelBadge(props: Props) {
  const text = props.status ?? props.label ?? "";
  const style = statusStyles[props.status ?? props.variant ?? ""] ?? "bg-brand/20 text-brand";

  return (
    <span
      className={`inline-block border-2 border-brand px-2 py-0.5 font-[family-name:var(--font-press-start)] text-[10px] ${style}`}
    >
      {text}
    </span>
  );
}
```

- [ ] **Step 2: Verify existing usage still works**

Run: `npx tsc --noEmit`
Expected: No errors. Existing `<PixelBadge status="completed" />` calls still compile.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/pixel-badge.tsx
git commit -m "feat: extend PixelBadge to support arbitrary label and variant"
```

---

### Task 12: GitHub skipped releases log

**Files:**
- Create: `src/components/admin/github-skipped-log.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useState } from "react";
import { PixelBadge } from "@/components/admin/pixel-badge";
import { PixelTable } from "@/components/admin/pixel-table";

type SkippedRelease = {
  _id: string;
  repoFullName: string;
  releaseTag: string;
  releaseName?: string;
  reason: string;
  created_at: string;
};

const reasonVariant: Record<string, string> = {
  account_disabled: "removed",
  repo_disabled: "removed",
  insufficient_credits: "failed",
  prerelease: "suspended",
  filtered: "suspended",
  duplicate: "pending",
};

export function SkippedReleasesLog({ releases }: { releases: SkippedRelease[] }) {
  const [open, setOpen] = useState(false);

  if (releases.length === 0) return null;

  return (
    <div className="mt-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-xs text-brand/60 hover:text-brand transition-colors"
      >
        <span>{open ? "▼" : "▶"}</span>
        <span>Skipped Releases ({releases.length})</span>
      </button>
      {open && (
        <div className="mt-2">
          <PixelTable headers={["Repo", "Tag", "Reason", "Date"]}>
            {releases.map((r) => (
              <tr key={r._id} className="hover:bg-gold/5">
                <td className="px-4 py-2 text-xs font-mono">{r.repoFullName}</td>
                <td className="px-4 py-2 text-xs">{r.releaseTag}</td>
                <td className="px-4 py-2">
                  <PixelBadge
                    label={r.reason.replace(/_/g, " ")}
                    variant={reasonVariant[r.reason]}
                  />
                </td>
                <td className="px-4 py-2 text-xs">
                  {new Date(r.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </PixelTable>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/github-skipped-log.tsx
git commit -m "feat: add SkippedReleasesLog component"
```

---

### Task 13: GitHub repo config card

**Files:**
- Create: `src/components/admin/github-repo-card.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useState } from "react";
import { PixelButton } from "@/components/admin/pixel-button";
import { PixelCard } from "@/components/admin/pixel-card";

type Brand = { externalId: string; name: string };
type Template = { externalId: string; name: string };

type RepoConfig = {
  installationId: number;
  repoFullName: string;
  enabled: boolean;
  brandId?: string;
  template?: string;
  formats?: string[];
  skipPrereleases: boolean;
  tagFilter?: string;
  webhookUrl?: string;
};

type Props = {
  repo: { full_name: string; name: string; private: boolean; description: string | null };
  config: RepoConfig | null;
  installationId: number;
  brands: Brand[];
  templates: Template[];
  onSaved: () => void;
};

const FORMAT_OPTIONS = ["landscape", "square", "portrait"] as const;

export function RepoConfigCard({ repo, config, installationId, brands, templates, onSaved }: Props) {
  const [enabled, setEnabled] = useState(config?.enabled ?? false);
  const [brandId, setBrandId] = useState(config?.brandId ?? "");
  const [template, setTemplate] = useState(config?.template ?? "standard-browser");
  const [formats, setFormats] = useState<string[]>(config?.formats ?? ["landscape"]);
  const [skipPrereleases, setSkipPrereleases] = useState(config?.skipPrereleases ?? true);
  const [tagFilter, setTagFilter] = useState(config?.tagFilter ?? "");
  const [webhookUrl, setWebhookUrl] = useState(config?.webhookUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(!!config?.enabled);

  function toggleFormat(f: string) {
    setFormats((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]
    );
  }

  async function handleSave() {
    setSaving(true);
    await fetch("/api/github/configs", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        installationId,
        repoFullName: repo.full_name,
        enabled,
        brandId: brandId || undefined,
        template,
        formats,
        skipPrereleases,
        tagFilter: tagFilter || undefined,
        webhookUrl: webhookUrl || undefined,
      }),
    });
    setSaving(false);
    onSaved();
  }

  const inputClass =
    "w-full border-2 border-brand bg-white px-3 py-2 text-sm text-brand placeholder:text-brand/40 focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]";

  return (
    <PixelCard>
      <div className="flex items-center justify-between">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-left"
        >
          <span className="text-xs text-brand/40">{expanded ? "▼" : "▶"}</span>
          <span className="font-mono text-sm text-brand font-bold">{repo.full_name}</span>
          {repo.private && (
            <span className="text-[10px] text-brand/40 border border-brand/20 px-1">private</span>
          )}
        </button>
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-xs text-brand/60">Enabled</span>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="accent-[var(--color-gold)]"
          />
        </label>
      </div>

      {expanded && (
        <div className="mt-4 space-y-3">
          {repo.description && (
            <p className="text-xs text-brand/50">{repo.description}</p>
          )}

          {/* Brand */}
          <div>
            <label className="block text-xs text-brand/60 mb-1">Brand</label>
            <select className={inputClass} value={brandId} onChange={(e) => setBrandId(e.target.value)}>
              <option value="">None (fallback colors)</option>
              {brands.map((b) => (
                <option key={b.externalId} value={b.externalId}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Template */}
          <div>
            <label className="block text-xs text-brand/60 mb-1">Template</label>
            <select className={inputClass} value={template} onChange={(e) => setTemplate(e.target.value)}>
              {templates.map((t) => (
                <option key={t.externalId} value={t.externalId}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Formats */}
          <div>
            <label className="block text-xs text-brand/60 mb-1">Formats</label>
            <div className="flex gap-3">
              {FORMAT_OPTIONS.map((f) => (
                <label key={f} className="flex items-center gap-1 text-xs text-brand cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formats.includes(f)}
                    onChange={() => toggleFormat(f)}
                    className="accent-[var(--color-gold)]"
                  />
                  {f}
                </label>
              ))}
            </div>
          </div>

          {/* Tag filter */}
          <div>
            <label className="block text-xs text-brand/60 mb-1">Tag filter</label>
            <input
              className={inputClass}
              placeholder="v*"
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
            />
          </div>

          {/* Skip prereleases */}
          <label className="flex items-center gap-2 text-xs text-brand cursor-pointer">
            <input
              type="checkbox"
              checked={skipPrereleases}
              onChange={(e) => setSkipPrereleases(e.target.checked)}
              className="accent-[var(--color-gold)]"
            />
            Skip pre-releases
          </label>

          {/* Webhook URL */}
          <div>
            <label className="block text-xs text-brand/60 mb-1">Webhook URL (optional)</label>
            <input
              className={inputClass}
              placeholder="https://your-app.com/webhooks/bragfast"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
            />
          </div>

          <PixelButton onClick={handleSave} disabled={saving || formats.length === 0}>
            {saving ? "Saving..." : "Save"}
          </PixelButton>
        </div>
      )}
    </PixelCard>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/github-repo-card.tsx
git commit -m "feat: add RepoConfigCard component"
```

---

### Task 14: GitHub repo list

**Files:**
- Create: `src/components/admin/github-repo-list.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { RepoConfigCard } from "@/components/admin/github-repo-card";

type Repo = { full_name: string; name: string; private: boolean; description: string | null };
type RepoConfig = {
  installationId: number;
  repoFullName: string;
  enabled: boolean;
  brandId?: string;
  template?: string;
  formats?: string[];
  skipPrereleases: boolean;
  tagFilter?: string;
  webhookUrl?: string;
};
type Brand = { externalId: string; name: string };
type Template = { externalId: string; name: string };

type Props = {
  installationId: number;
  brands: Brand[];
  templates: Template[];
};

export function RepoConfigList({ installationId, brands, templates }: Props) {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [configs, setConfigs] = useState<RepoConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [reposRes, configsRes] = await Promise.all([
        fetch("/api/github/repos"),
        fetch("/api/github/configs"),
      ]);
      if (!reposRes.ok) throw new Error("Failed to fetch repos");
      const reposData = await reposRes.json();
      setRepos(reposData.repos);
      setConfigs(await configsRes.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return <p className="text-xs text-brand/60 py-4">Loading repositories...</p>;
  }

  if (error) {
    return <p className="text-xs text-red-600 py-4">{error}</p>;
  }

  // Sort: configured repos first, then alphabetical
  const configuredNames = new Set(configs.filter((c) => c.enabled).map((c) => c.repoFullName));
  const sorted = [...repos].sort((a, b) => {
    const aConf = configuredNames.has(a.full_name) ? 0 : 1;
    const bConf = configuredNames.has(b.full_name) ? 0 : 1;
    if (aConf !== bConf) return aConf - bConf;
    return a.full_name.localeCompare(b.full_name);
  });

  return (
    <div className="mt-4 space-y-3">
      <p className="text-xs text-brand/60">{repos.length} repositories</p>
      {sorted.map((repo) => (
        <RepoConfigCard
          key={repo.full_name}
          repo={repo}
          config={configs.find((c) => c.repoFullName === repo.full_name) ?? null}
          installationId={installationId}
          brands={brands}
          templates={templates}
          onSaved={loadData}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/github-repo-list.tsx
git commit -m "feat: add RepoConfigList component"
```

---

### Task 15: GitHub section (top-level)

**Files:**
- Create: `src/components/admin/github-section.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useState } from "react";
import { PixelButton } from "@/components/admin/pixel-button";
import { PixelBadge } from "@/components/admin/pixel-badge";
import { RepoConfigList } from "@/components/admin/github-repo-list";
import { SkippedReleasesLog } from "@/components/admin/github-skipped-log";

type Installation = {
  _id: string;
  installationId: number;
  accountLogin: string;
  accountType: string;
  enabled: boolean;
  status: string;
};
type Brand = { externalId: string; name: string };
type Template = { externalId: string; name: string };
type SkippedRelease = {
  _id: string;
  repoFullName: string;
  releaseTag: string;
  releaseName?: string;
  reason: string;
  created_at: string;
};

type Props = {
  installations: Installation[];
  brands: Brand[];
  templates: Template[];
  skippedReleases: SkippedRelease[];
  appSlug: string;
};

export function GitHubSection({ installations, brands, templates, skippedReleases, appSlug }: Props) {
  const active = installations.find((i) => i.status === "active");
  const [enabled, setEnabled] = useState(active?.enabled ?? false);
  const [toggling, setToggling] = useState(false);

  async function handleToggle() {
    if (!active) return;
    setToggling(true);
    await fetch("/api/github/installations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ installationId: active.installationId, enabled: !enabled }),
    });
    setEnabled(!enabled);
    setToggling(false);
  }

  if (!active) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-brand/60 mb-4">
          Connect your GitHub account to auto-generate images when you publish a release.
        </p>
        <a
          href={`https://github.com/apps/${appSlug}/installations/new`}
          className="inline-block"
        >
          <PixelButton>Install GitHub App</PixelButton>
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Installation header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-brand font-bold">{active.accountLogin}</span>
          <PixelBadge label={active.accountType} variant="active" />
          <PixelBadge
            label={enabled ? "enabled" : "disabled"}
            variant={enabled ? "active" : "suspended"}
          />
        </div>
        <div className="flex gap-2">
          <PixelButton variant="ghost" onClick={handleToggle} disabled={toggling}>
            {enabled ? "Disable" : "Enable"}
          </PixelButton>
          <a
            href={`https://github.com/settings/installations/${active.installationId}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <PixelButton variant="ghost">Manage on GitHub</PixelButton>
          </a>
        </div>
      </div>

      {/* Repo configs */}
      {enabled && (
        <RepoConfigList
          installationId={active.installationId}
          brands={brands}
          templates={templates}
        />
      )}

      {/* Skipped releases */}
      <SkippedReleasesLog releases={skippedReleases} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/github-section.tsx
git commit -m "feat: add GitHubSection component"
```

---

## Chunk 4: Page Integration

### Task 16: Account page — add GitHub Integration section

**Files:**
- Modify: `src/app/(admin)/admin/account/page.tsx`

- [ ] **Step 1: Add imports**

Add at top of file:

```ts
import { GitHubSection } from "@/components/admin/github-section";
```

- [ ] **Step 2: Add server-side data fetching**

Inside `AccountPage()`, after the existing `stats` fetch, add:

```ts
const [installations, brands, defaultTemplates, userTemplates, skippedReleases] =
  await Promise.all([
    fetchQuery(api.githubInstallations.listByUserId, { userId: user._id }),
    fetchQuery(api.brands.listByUser, { userId: user._id }),
    fetchQuery(api.templates.listDefaults, {}),
    fetchQuery(api.templates.listByUser, { userId: user._id }),
    fetchQuery(api.githubSkippedReleases.listByUserId, { userId: user._id }),
  ]);

const allTemplates = [...defaultTemplates, ...userTemplates].map((t) => ({
  externalId: t.externalId,
  name: t.name,
}));
const brandList = brands.map((b) => ({ externalId: b.externalId, name: b.name }));
```

- [ ] **Step 3: Add GitHub Integration PixelCard**

Insert between the API Keys card and the Danger Zone card:

```tsx
{/* Card 3 — GitHub Integration */}
<PixelCard>
  <h2 className="font-[family-name:var(--font-press-start)] text-sm text-brand mb-4">
    GitHub Integration
  </h2>
  <GitHubSection
    installations={installations}
    brands={brandList}
    templates={allTemplates}
    skippedReleases={skippedReleases}
    appSlug={process.env.NEXT_PUBLIC_GITHUB_APP_SLUG ?? ""}
  />
</PixelCard>
```

- [ ] **Step 4: Verify the page compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/\\(admin\\)/admin/account/page.tsx
git commit -m "feat: add GitHub Integration section to Account page"
```

---

### Task 17: History page — GitHub source badge

**Files:**
- Modify: `src/components/admin/history-table.tsx`

- [ ] **Step 1: Add `source` to Release type**

Update the `Release` type (line 7-18) to add:

```ts
source?: "api" | "github";
sourceMetadata?: string;
```

- [ ] **Step 2: Show GitHub badge in ExpandableRow**

In the `<td>` that shows `release.externalId` (line 46-48), add a badge after the ID:

```tsx
<td className="px-4 py-3 font-mono text-xs">
  <span className="inline-block w-4 text-brand/40 mr-1">
    {open ? "▼" : "▶"}
  </span>
  {release.externalId}
  {release.source === "github" && (
    <PixelBadge label="GitHub" variant="github" />
  )}
</td>
```

- [ ] **Step 3: Show repo name in expanded view when source is GitHub**

In the `buildResponseBody` function, add:

```ts
...(r.source ? { source: r.source } : {}),
...(r.sourceMetadata ? (() => {
  try { return { sourceMetadata: JSON.parse(r.sourceMetadata) }; } catch { return {}; }
})() : {}),
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/history-table.tsx
git commit -m "feat: show GitHub source badge in release history"
```

---

### Task 18: Final verification

- [ ] **Step 1: Type check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 2: Run all tests**

Run: `npx vitest run`
Expected: All pass.

- [ ] **Step 3: Dev server smoke test**

Run: `npx next dev`
Visit `/admin/account` — verify GitHub Integration section renders (shows install button if no installation).

---

## Unresolved Questions

1. **Convex `templates.listDefaults`** — does this query exist? Need to verify the exact query name. If not, may need `templates.listByUser` filtered to `isDefault: true`, or a dedicated query.
2. **PixelButton `variant="ghost"`** — does this variant exist? Check the PixelButton component. If not, adjust to use an existing variant or add it.
