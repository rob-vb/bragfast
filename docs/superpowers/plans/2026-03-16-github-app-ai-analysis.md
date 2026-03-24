# GitHub App AI Content Analysis + Approval Flow — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace mechanical text truncation with Claude-powered content analysis that intelligently fills template slots, decides slide count, and extracts images from release bodies. Add an approval flow so users review AI suggestions before rendering (with opt-in auto-approve).

**Architecture:** New `analyzeRelease()` module calls Claude Haiku to produce structured JSON matching the `FormatEntry.slides[].objects[]` schema. Webhook handler branches on `autoApprove` — either render immediately or store as `pending_review`. Approval API route + dashboard UI for reviewing/editing AI suggestions before rendering.

**Tech Stack:** Anthropic SDK (`@anthropic-ai/sdk`), Claude Haiku 4.5, Convex, Next.js 16

**Depends on:** Plan A (GitHub App Dashboard UI) must be implemented first. This plan assumes the GitHub section on the Account page exists with repo configs, and the webhook handler is passing `webhookUrl`.

---

## File Structure

**New files:**
- `src/lib/github/analyze-release.ts` — AI content analysis module
- `src/lib/__tests__/analyze-release.test.ts` — tests with mocked Claude responses
- `src/app/api/github/releases/[id]/approve/route.ts` — approval endpoint
- `src/components/dashboard/pending-reviews.tsx` — pending review cards with approve/edit/dismiss

**Modified files:**
- `convex/schema.ts` — add `pending_review` + `dismissed` status, `aiContent` field on releases
- `convex/releases.ts` — accept optional status in `create`, add `approve` + `dismiss` mutations, add `listPendingByUser` query
- `convex/githubRepoConfigs.ts` — add `autoApprove` + `maxSlides` to schema and upsert
- `src/app/api/github/webhooks/route.ts` — rewrite `handleReleasePublished` to use AI analysis + approval flow
- `src/components/dashboard/github-repo-card.tsx` — add auto-approve toggle + max slides input
- `src/app/(dashboard)/dashboard/page.tsx` — show pending reviews section
- `src/components/dashboard/pixel-badge.tsx` — add `pending_review` and `dismissed` variants
- `package.json` — add `@anthropic-ai/sdk`
- `.env.example` — add `ANTHROPIC_API_KEY`

---

## Chunk 1: Schema + Convex Backend

### Task 1: Add `autoApprove` and `maxSlides` to `githubRepoConfigs`

**Files:**
- Modify: `convex/schema.ts:122-135`
- Modify: `convex/githubRepoConfigs.ts:4-46`

- [ ] **Step 1: Update schema**

In `convex/schema.ts`, add to `githubRepoConfigs` table, after `webhookUrl`:

```ts
webhookUrl: v.optional(v.string()),
autoApprove: v.optional(v.boolean()),
maxSlides: v.optional(v.number()),
```

- [ ] **Step 2: Update upsert mutation args**

In `convex/githubRepoConfigs.ts`, add to `args`:

```ts
autoApprove: v.optional(v.boolean()),
maxSlides: v.optional(v.number()),
```

Add to the update path (inside `if (existing)`):

```ts
if (args.autoApprove !== undefined) updates.autoApprove = args.autoApprove;
if (args.maxSlides !== undefined) updates.maxSlides = args.maxSlides;
```

Add to the insert path:

```ts
autoApprove: args.autoApprove,
maxSlides: args.maxSlides,
```

- [ ] **Step 3: Verify schema pushes**

Run: `npx convex dev --once`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add convex/schema.ts convex/githubRepoConfigs.ts
git commit -m "feat: add autoApprove and maxSlides to githubRepoConfigs"
```

---

### Task 2: Add `pending_review` status + `aiContent` to releases

**Files:**
- Modify: `convex/schema.ts:67-90`
- Modify: `convex/releases.ts`

- [ ] **Step 1: Update releases schema**

In `convex/schema.ts`, update the releases table:

```ts
status: v.union(
  v.literal("pending"),
  v.literal("pending_review"),
  v.literal("completed"),
  v.literal("failed"),
  v.literal("dismissed")
),
```

Add after `sourceMetadata`:

```ts
aiContent: v.optional(v.string()),
pendingConfig: v.optional(v.string()),
```

`pendingConfig` stores a JSON snapshot of `{ template, formats, brandId, webhookUrl }` at webhook receipt time, preventing config drift if the user changes repo settings before approving.

- [ ] **Step 2: Update `releases.create` to accept optional status and aiContent**

In `convex/releases.ts`, update the `create` mutation args:

```ts
args: {
  userId: v.string(),
  externalId: v.string(),
  template: v.string(),
  credits_used: v.number(),
  metadata: v.optional(v.string()),
  webhook_url: v.optional(v.string()),
  source: v.optional(v.union(v.literal("api"), v.literal("github"))),
  sourceMetadata: v.optional(v.string()),
  output: v.optional(v.union(v.literal("image"), v.literal("video"))),
  status: v.optional(v.union(
    v.literal("pending"),
    v.literal("pending_review"),
  )),
  aiContent: v.optional(v.string()),
  pendingConfig: v.optional(v.string()),
},
```

Update the handler to use the provided status:

```ts
handler: async (ctx, args) => {
  const now = new Date().toISOString();
  await ctx.db.insert("releases", {
    ...args,
    output: args.output ?? "image",
    status: args.status ?? "pending",
    created_at: now,
  });
},
```

- [ ] **Step 3: Add `approve` mutation**

Append to `convex/releases.ts`:

```ts
export const approve = mutation({
  args: {
    externalId: v.string(),
    userId: v.string(),
    aiContent: v.optional(v.string()),
    credits_used: v.number(),
  },
  handler: async (ctx, { externalId, userId, aiContent, credits_used }) => {
    const r = await ctx.db
      .query("releases")
      .withIndex("by_externalId", (q) => q.eq("externalId", externalId))
      .first();
    if (!r) throw new Error("Release not found");
    if (r.userId !== userId) throw new Error("Not authorized");
    if (r.status !== "pending_review") throw new Error("Release is not pending review");

    const patch: Record<string, unknown> = { status: "pending", credits_used };
    if (aiContent !== undefined) patch.aiContent = aiContent;
    await ctx.db.patch(r._id, patch);
  },
});
```

- [ ] **Step 4: Add `dismiss` mutation**

```ts
export const dismiss = mutation({
  args: {
    externalId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, { externalId, userId }) => {
    const r = await ctx.db
      .query("releases")
      .withIndex("by_externalId", (q) => q.eq("externalId", externalId))
      .first();
    if (!r) throw new Error("Release not found");
    if (r.userId !== userId) throw new Error("Not authorized");
    if (r.status !== "pending_review") throw new Error("Release is not pending review");
    await ctx.db.patch(r._id, { status: "dismissed" });
  },
});
```

- [ ] **Step 5: Add `listPendingByUser` query**

```ts
export const listPendingByUser = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const all = await ctx.db
      .query("releases")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
    return all.filter((r) => r.status === "pending_review");
  },
});
```

- [ ] **Step 6: Verify schema pushes**

Run: `npx convex dev --once`
Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add convex/schema.ts convex/releases.ts
git commit -m "feat: add pending_review status, aiContent, approve/dismiss mutations to releases"
```

---

### Task 3: Update PixelBadge for new statuses

**Files:**
- Modify: `src/components/dashboard/pixel-badge.tsx`

- [ ] **Step 1: Add new status styles**

Add to the `statusStyles` record:

```ts
pending_review: "bg-blue-400 text-white",
dismissed: "bg-brand/20 text-brand",
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/pixel-badge.tsx
git commit -m "feat: add pending_review and dismissed badge variants"
```

---

## Chunk 2: AI Content Analysis Module

### Task 4: Install Anthropic SDK

**Files:**
- Modify: `package.json`
- Modify: `.env.example`

- [ ] **Step 1: Install**

Run: `npm install @anthropic-ai/sdk`

- [ ] **Step 2: Add env var**

Append to `.env.example`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json .env.example
git commit -m "chore: install @anthropic-ai/sdk, add ANTHROPIC_API_KEY to env"
```

---

### Task 5: Write `analyzeRelease` module

**Files:**
- Create: `src/lib/github/analyze-release.ts`

This is the core AI module. It takes a GitHub release + template object definitions and returns structured slide content.

- [ ] **Step 1: Write the test first**

Create `src/lib/__tests__/analyze-release.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { analyzeRelease, buildAnalysisPrompt, parseAnalysisResponse } from "../github/analyze-release";

describe("buildAnalysisPrompt", () => {
  const templateObjects = [
    { id: "title", type: "text" as const },
    { id: "description", type: "text" as const },
    { id: "image", type: "image" as const },
  ];

  it("includes release body in user message", () => {
    const prompt = buildAnalysisPrompt({
      releaseName: "v1.0",
      releaseTag: "v1.0.0",
      releaseBody: "## Features\n- Fast\n- Reliable",
      templateObjects,
      maxSlides: 3,
    });
    expect(prompt.userMessage).toContain("## Features");
    expect(prompt.userMessage).toContain("v1.0");
  });

  it("lists available template slots", () => {
    const prompt = buildAnalysisPrompt({
      releaseName: "v1.0",
      releaseTag: "v1.0.0",
      releaseBody: "body",
      templateObjects,
      maxSlides: 1,
    });
    expect(prompt.userMessage).toContain("title");
    expect(prompt.userMessage).toContain("description");
    expect(prompt.userMessage).toContain("image");
  });

  it("includes maxSlides constraint", () => {
    const prompt = buildAnalysisPrompt({
      releaseName: "v1.0",
      releaseTag: "v1.0.0",
      releaseBody: "body",
      templateObjects,
      maxSlides: 2,
    });
    expect(prompt.userMessage).toContain("2");
  });
});

describe("parseAnalysisResponse", () => {
  it("parses valid JSON slides array", () => {
    const response = JSON.stringify({
      slides: [
        {
          objects: [
            { id: "title", text: "Big Launch" },
            { id: "description", text: "We shipped it" },
          ],
        },
      ],
    });
    const result = parseAnalysisResponse(response);
    expect(result.slides).toHaveLength(1);
    expect(result.slides[0].objects[0].text).toBe("Big Launch");
  });

  it("extracts image URLs into image_url field", () => {
    const response = JSON.stringify({
      slides: [
        {
          objects: [
            { id: "image", image_url: "https://example.com/screenshot.png" },
          ],
        },
      ],
    });
    const result = parseAnalysisResponse(response);
    expect(result.slides[0].objects[0].image_url).toBe("https://example.com/screenshot.png");
  });

  it("respects maxSlides by truncating", () => {
    const response = JSON.stringify({
      slides: [
        { objects: [{ id: "title", text: "Slide 1" }] },
        { objects: [{ id: "title", text: "Slide 2" }] },
        { objects: [{ id: "title", text: "Slide 3" }] },
      ],
    });
    const result = parseAnalysisResponse(response, 2);
    expect(result.slides).toHaveLength(2);
  });

  it("returns fallback on invalid JSON", () => {
    const result = parseAnalysisResponse("not json");
    expect(result.slides).toHaveLength(1);
    expect(result.slides[0].objects[0].id).toBe("title");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/__tests__/analyze-release.test.ts`
Expected: FAIL — module doesn't exist yet.

- [ ] **Step 3: Write the implementation**

Create `src/lib/github/analyze-release.ts`:

```ts
import Anthropic from "@anthropic-ai/sdk";
import type { ObjectModification } from "../types";

const anthropic = new Anthropic();

type TemplateObjectSlot = {
  id: string;
  type: "text" | "image" | "logo";
};

type AnalysisInput = {
  releaseName: string;
  releaseTag: string;
  releaseBody: string;
  templateObjects: TemplateObjectSlot[];
  maxSlides: number;
};

type AnalysisResult = {
  slides: Array<{ objects: ObjectModification[] }>;
};

export function buildAnalysisPrompt(input: AnalysisInput): {
  systemMessage: string;
  userMessage: string;
} {
  const textSlots = input.templateObjects
    .filter((o) => o.type === "text")
    .map((o) => `- "${o.id}" (text)`)
    .join("\n");
  const imageSlots = input.templateObjects
    .filter((o) => o.type === "image")
    .map((o) => `- "${o.id}" (image)`)
    .join("\n");

  const systemMessage = `You fill template slots for social media images that announce software releases.
You output JSON only. No markdown, no explanation.

Output format:
{
  "slides": [
    {
      "objects": [
        { "id": "<slot_id>", "text": "content" },
        { "id": "<slot_id>", "image_url": "https://..." }
      ]
    }
  ]
}

Rules:
- For text slots: write concise, marketing-friendly copy. Not raw changelogs.
- "title" slot: catchy headline, not just the version number. 5-10 words max.
- "description" slot: if the release is small, one punchy sentence. If large, use bullet points separated by " • ".
- For image slots: only fill if you find image URLs in the release body (markdown ![alt](url) syntax). Otherwise omit the slot.
- You can create 1 to ${input.maxSlides} slides. Use multiple slides only when the release has distinct sections worth highlighting separately.
- Each slide must include at least the "title" object.
- Do NOT include "logo" slots — those are auto-filled.`;

  const userMessage = `Release: "${input.releaseName}" (tag: ${input.releaseTag})

Available template slots:
${textSlots}
${imageSlots || "(no image slots)"}

Max slides: ${input.maxSlides}

Release body:
---
${input.releaseBody || "(empty)"}
---

Generate the slides JSON.`;

  return { systemMessage, userMessage };
}

export function parseAnalysisResponse(
  text: string,
  maxSlides?: number
): AnalysisResult {
  try {
    // Extract JSON from response (handle potential markdown wrapping)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");

    const parsed = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(parsed.slides) || parsed.slides.length === 0) {
      throw new Error("No slides in response");
    }

    let slides = parsed.slides.map((slide: { objects?: Array<Record<string, string>> }) => ({
      objects: (slide.objects ?? [])
        .filter((obj: Record<string, string>) => typeof obj.id === "string" && obj.id.length > 0)
        .map((obj: Record<string, string>) => {
          const mod: ObjectModification = { id: obj.id };
          if (obj.text) mod.text = obj.text;
          if (obj.image_url) mod.image_url = obj.image_url;
          return mod;
        }),
    }));

    if (maxSlides && slides.length > maxSlides) {
      slides = slides.slice(0, maxSlides);
    }

    return { slides };
  } catch {
    // Fallback: single slide with release name as title
    return {
      slides: [
        {
          objects: [{ id: "title", text: "New Release" }],
        },
      ],
    };
  }
}

export async function analyzeRelease(input: AnalysisInput): Promise<AnalysisResult> {
  const { systemMessage, userMessage } = buildAnalysisPrompt(input);

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: systemMessage,
      messages: [{ role: "user", content: userMessage }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    return parseAnalysisResponse(text, input.maxSlides);
  } catch (err) {
    console.error("AI analysis failed, using fallback:", err);
    // Fallback: use release name as title, stripped body as description
    const title = input.releaseName || input.releaseTag;
    const description = input.releaseBody
      ? input.releaseBody.slice(0, 197) + (input.releaseBody.length > 200 ? "..." : "")
      : "";
    return {
      slides: [
        {
          objects: [
            { id: "title", text: title },
            ...(description ? [{ id: "description", text: description }] : []),
          ],
        },
      ],
    };
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/__tests__/analyze-release.test.ts`
Expected: All pass (buildAnalysisPrompt and parseAnalysisResponse are pure functions, no API mock needed).

- [ ] **Step 5: Commit**

```bash
git add src/lib/github/analyze-release.ts src/lib/__tests__/analyze-release.test.ts
git commit -m "feat: add AI release analysis module with Claude Haiku"
```

---

## Chunk 3: Webhook Handler Rewrite + Approval Route

### Task 6: Rewrite webhook handler for AI + approval flow

**Files:**
- Modify: `src/app/api/github/webhooks/route.ts:81-222`

- [ ] **Step 1: Add imports**

Add at top of file:

```ts
import { analyzeRelease } from "@/lib/github/analyze-release";
import { getDefaultConfig } from "@/lib/templates/default-configs";
import type { CanvasTemplateConfig } from "@/lib/templates/canvas-types";
```

- [ ] **Step 2: Rewrite `handleReleasePublished`**

Replace the function body from step 8 (Build ReleaseRequest) onwards. After the idempotency check (step 7), replace steps 8-11 with:

```ts
  // 8. Load template to discover available object slots
  const templateName = repoConfig?.template ?? "standard-browser";
  let templateConfig: CanvasTemplateConfig | null = null;

  const defaultConfig = getDefaultConfig(templateName);
  if (defaultConfig) {
    templateConfig = defaultConfig;
  } else if (templateName.startsWith("tmpl_")) {
    const tmpl = await convex.query(api.templates.getByExternalId, { externalId: templateName });
    if (tmpl) templateConfig = tmpl.config as CanvasTemplateConfig;
  }

  // Extract object slots from the first format (slots are same across formats)
  const templateObjects = templateConfig
    ? Object.values(templateConfig.formats)[0].objects.map((o) => ({
        id: o.id,
        type: o.type as "text" | "image" | "logo",
      }))
    : [
        { id: "title", type: "text" as const },
        { id: "description", type: "text" as const },
      ];

  // 9. AI analysis
  const maxSlides = repoConfig?.maxSlides ?? 1;
  const aiResult = await analyzeRelease({
    releaseName: payload.release.name || payload.release.tag_name,
    releaseTag: payload.release.tag_name,
    releaseBody: payload.release.body || "",
    templateObjects,
    maxSlides,
  });

  const aiContentJson = JSON.stringify(aiResult);
  const autoApprove = repoConfig?.autoApprove ?? false;

  // 10. Build ReleaseRequest from AI content
  const formatNames = (repoConfig?.formats ?? ["landscape"]) as FormatKey[];
  const releaseRequest = mapReleaseToRequest(payload, {
    brandId: repoConfig?.brandId,
    template: repoConfig?.template,
    formats: repoConfig?.formats,
  });

  // Override the mechanical slides with AI-generated content
  for (const formatEntry of releaseRequest.formats) {
    formatEntry.slides = aiResult.slides;
  }

  if (repoConfig?.webhookUrl) {
    releaseRequest.webhook_url = repoConfig.webhookUrl;
  }

  if (autoApprove) {
    // 11a. Auto-approve: reserve credits, create release, render
    const creditsNeeded = calculateCredits({ output: "image", formats: releaseRequest.formats });
    try {
      await convex.mutation(api.userProfiles.reserve, {
        userId,
        amount: creditsNeeded,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("Insufficient credits")) {
        await convex.mutation(api.githubSkippedReleases.log, {
          userId,
          repoFullName,
          releaseTag,
          releaseName: payload.release.name ?? undefined,
          reason: "insufficient_credits",
        });
        return Response.json({ ok: true, skipped: "insufficient_credits" });
      }
      throw err;
    }

    const result = await createRelease(releaseRequest, userId, {
      source: "github",
      sourceMetadata,
    });

    after(() => renderReleaseAsync(result.cook_id, releaseRequest, userId));
    return Response.json({ ok: true, cook_id: result.cook_id, mode: "auto" });
  } else {
    // 11b. Manual approval: store as pending_review, no credits reserved yet
    const releaseId = `cook_${crypto.randomUUID().slice(0, 10)}`;

    // Snapshot render config at webhook time to prevent config drift
    const pendingConfig = JSON.stringify({
      template: repoConfig?.template ?? "standard-browser",
      formats: repoConfig?.formats ?? ["landscape"],
      brandId: repoConfig?.brandId,
      webhookUrl: repoConfig?.webhookUrl,
    });

    await convex.mutation(api.releases.create, {
      userId,
      externalId: releaseId,
      template: releaseRequest.template || "standard-browser",
      credits_used: 0, // updated to actual amount on approval
      source: "github",
      sourceMetadata,
      status: "pending_review",
      aiContent: aiContentJson,
      pendingConfig,
    });

    return Response.json({ ok: true, cook_id: releaseId, mode: "pending_review" });
  }
```

- [ ] **Step 3: Add crypto import**

Add at top of file (if not already present):

```ts
import crypto from "crypto";
```

Also add the `FormatKey` import:

```ts
import type { FormatKey } from "@/lib/templates/canvas-types";
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/github/webhooks/route.ts
git commit -m "feat: rewrite webhook handler with AI analysis + approval flow"
```

---

### Task 7: Approval API route

**Files:**
- Create: `src/app/api/github/releases/[id]/approve/route.ts`

- [ ] **Step 1: Write the route**

```ts
import { fetchQuery, fetchMutation } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { createRelease, renderReleaseAsync } from "@/lib/pipeline/render";
import { mapReleaseToRequest } from "@/lib/github/map-release";
import { calculateCredits } from "@/lib/types";
import type { FormatEntry, ObjectModification } from "@/lib/types";
import type { FormatKey } from "@/lib/templates/canvas-types";
import { after } from "next/server";

export const maxDuration = 60;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: releaseId } = await params;

  // 1. Load the pending_review release
  const release = await fetchQuery(api.releases.getByExternalId, {
    externalId: releaseId,
  });
  if (!release || release.userId !== user._id) {
    return Response.json({ error: "Release not found" }, { status: 404 });
  }
  if (release.status !== "pending_review") {
    return Response.json({ error: "Release is not pending review" }, { status: 400 });
  }

  // 2. Parse AI content (optionally overridden by request body)
  let aiContent: { slides: Array<{ objects: ObjectModification[] }> };
  try {
    const body = await request.json().catch(() => null);
    if (body?.aiContent) {
      // User edited the AI suggestion
      aiContent = typeof body.aiContent === "string"
        ? JSON.parse(body.aiContent)
        : body.aiContent;
    } else {
      aiContent = JSON.parse(release.aiContent || "{}");
    }
  } catch {
    return Response.json({ error: "Invalid aiContent" }, { status: 400 });
  }

  if (!aiContent.slides?.length) {
    return Response.json({ error: "No slides in content" }, { status: 400 });
  }

  // 3. Reconstruct ReleaseRequest from pendingConfig snapshot (not live repo config)
  const sourceMetadata = release.sourceMetadata ? JSON.parse(release.sourceMetadata) : {};
  const pendingConfig = release.pendingConfig ? JSON.parse(release.pendingConfig) : {
    template: release.template,
    formats: ["landscape"],
  };

  const formatNames = (pendingConfig.formats ?? ["landscape"]) as FormatKey[];
  const formats: FormatEntry[] = formatNames.map((name) => ({
    name,
    slides: aiContent.slides,
  }));

  const releaseRequest = {
    template: pendingConfig.template ?? release.template,
    formats,
    brand_id: pendingConfig.brandId,
    webhook_url: pendingConfig.webhookUrl,
    ...(!pendingConfig.brandId && {
      colors: { background: "#0f172a", text: "#f8fafc", primary: "#3b82f6" },
      name: sourceMetadata.owner,
    }),
  };

  // 4. Reserve credits
  const creditsNeeded = calculateCredits({ output: "image", formats });
  try {
    await fetchMutation(api.userProfiles.reserve, {
      userId: user._id,
      amount: creditsNeeded,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("Insufficient credits")) {
      return Response.json({ error: "Insufficient credits" }, { status: 402 });
    }
    throw err;
  }

  // 5. Approve: update status to pending, set credits_used, update aiContent if edited
  await fetchMutation(api.releases.approve, {
    externalId: releaseId,
    userId: user._id,
    aiContent: JSON.stringify(aiContent),
    credits_used: creditsNeeded,
  });

  // 6. Trigger render in background
  after(() => renderReleaseAsync(releaseId, releaseRequest, user._id));

  return Response.json({ ok: true, cook_id: releaseId });
}
```

- [ ] **Step 2: Create the directory structure**

Run: `mkdir -p src/app/api/github/releases/\[id\]/approve`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/github/releases/
git commit -m "feat: add POST /api/github/releases/[id]/approve route"
```

---

## Chunk 4: UI — Pending Reviews + Repo Config Updates

### Task 8: Pending reviews component

**Files:**
- Create: `src/components/dashboard/pending-reviews.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useState } from "react";
import { PixelButton } from "@/components/dashboard/pixel-button";
import { PixelCard } from "@/components/dashboard/pixel-card";
import { PixelBadge } from "@/components/dashboard/pixel-badge";

type PendingRelease = {
  _id: string;
  externalId: string;
  template: string;
  aiContent?: string;
  sourceMetadata?: string;
  created_at: string;
};

type AiSlide = {
  objects: Array<{ id: string; text?: string; image_url?: string }>;
};

function parseAiContent(json?: string): AiSlide[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return parsed.slides ?? [];
  } catch {
    return [];
  }
}

function parseSourceMeta(json?: string): { repoFullName?: string; releaseTag?: string } {
  if (!json) return {};
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}

function PendingCard({ release, onAction }: { release: PendingRelease; onAction: () => void }) {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const slides = parseAiContent(release.aiContent);
  const meta = parseSourceMeta(release.sourceMetadata);
  const [editedContent, setEditedContent] = useState(release.aiContent ?? "");

  async function handleApprove() {
    setLoading(true);
    await fetch(`/api/github/releases/${release.externalId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing ? { aiContent: editedContent } : {}),
    });
    setLoading(false);
    onAction();
  }

  async function handleDismiss() {
    setLoading(true);
    await fetch(`/api/github/releases/${release.externalId}/approve`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });
    setLoading(false);
    onAction();
  }

  return (
    <PixelCard>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {meta.repoFullName && (
              <span className="font-mono text-xs text-brand/60">{meta.repoFullName}</span>
            )}
            {meta.releaseTag && (
              <PixelBadge label={meta.releaseTag} variant="pending" />
            )}
          </div>
          <span className="text-[10px] text-brand/40">
            {new Date(release.created_at).toLocaleDateString()}
          </span>
        </div>

        {/* AI-suggested content preview */}
        {!editing && slides.length > 0 && (
          <div className="border border-brand/10 bg-brand/5 p-3 space-y-2">
            <p className="text-[10px] text-brand/40 uppercase tracking-wide">AI Suggestion — {slides.length} slide{slides.length > 1 ? "s" : ""}</p>
            {slides.map((slide, i) => (
              <div key={i} className="text-xs text-brand space-y-1">
                {slides.length > 1 && (
                  <span className="text-[10px] text-brand/40">Slide {i + 1}</span>
                )}
                {slide.objects.map((obj, j) => (
                  <p key={j}>
                    <span className="text-brand/40">{obj.id}:</span>{" "}
                    {obj.text ?? (obj.image_url ? `[image: ${obj.image_url.slice(0, 40)}...]` : "")}
                  </p>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Edit mode */}
        {editing && (
          <textarea
            className="w-full border-2 border-brand bg-white px-3 py-2 text-xs font-mono text-brand min-h-[120px] focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]"
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
          />
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <PixelButton onClick={handleApprove} disabled={loading}>
            {loading ? "..." : editing ? "Save & Approve" : "Approve"}
          </PixelButton>
          <PixelButton variant="ghost" onClick={() => setEditing(!editing)} disabled={loading}>
            {editing ? "Cancel Edit" : "Edit"}
          </PixelButton>
          <PixelButton variant="danger" onClick={handleDismiss} disabled={loading}>
            Dismiss
          </PixelButton>
        </div>
      </div>
    </PixelCard>
  );
}

export function PendingReviews({
  releases,
  onRefresh,
}: {
  releases: PendingRelease[];
  onRefresh?: () => void;
}) {
  if (releases.length === 0) return null;

  function handleAction() {
    if (onRefresh) onRefresh();
    else window.location.reload();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="font-[family-name:var(--font-press-start)] text-sm text-brand">
          Pending Reviews
        </h2>
        <PixelBadge label={String(releases.length)} variant="pending_review" />
      </div>
      {releases.map((r) => (
        <PendingCard key={r._id} release={r} onAction={handleAction} />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/pending-reviews.tsx
git commit -m "feat: add PendingReviews component with approve/edit/dismiss"
```

---

### Task 9: Add dismiss API support

**Files:**
- Create: `src/app/api/github/releases/[id]/approve/route.ts` (add DELETE handler)

- [ ] **Step 1: Add DELETE handler to the approval route**

Append to the route file:

```ts
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: releaseId } = await params;

  await fetchMutation(api.releases.dismiss, {
    externalId: releaseId,
    userId: user._id,
  });

  return Response.json({ ok: true });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/github/releases/
git commit -m "feat: add DELETE handler for dismissing pending releases"
```

---

### Task 10: Dashboard page — show pending reviews

**Files:**
- Modify: `src/app/(dashboard)/dashboard/page.tsx`

- [ ] **Step 1: Add import**

```ts
import { PendingReviews } from "@/components/dashboard/pending-reviews";
```

- [ ] **Step 2: Fetch pending releases**

Add to the `Promise.all` in `DashboardPage()`:

```ts
const [stats, releases, pendingReleases] = await Promise.all([
  fetchQuery(api.userProfiles.getStats, { userId: user._id }),
  fetchQuery(api.releases.listByUser, { userId: user._id }),
  fetchQuery(api.releases.listPendingByUser, { userId: user._id }),
]);
```

- [ ] **Step 3: Render PendingReviews section**

Insert between the stats row and "Recent Releases":

```tsx
{/* Pending Reviews */}
{pendingReleases.length > 0 && (
  <PendingReviews releases={pendingReleases} />
)}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\\(dashboard\\)/dashboard/page.tsx
git commit -m "feat: show pending AI reviews on dashboard home"
```

---

### Task 11: Update repo config card with auto-approve + max slides

**Files:**
- Modify: `src/components/dashboard/github-repo-card.tsx`

- [ ] **Step 1: Add state for new fields**

Add to the state declarations:

```ts
const [autoApprove, setAutoApprove] = useState(config?.autoApprove ?? false);
const [maxSlides, setMaxSlides] = useState(config?.maxSlides ?? 1);
```

Note: `config` type needs updating. Add to the `RepoConfig` type:

```ts
autoApprove?: boolean;
maxSlides?: number;
```

- [ ] **Step 2: Add UI controls**

Insert after the webhook URL input, before the Save button:

```tsx
{/* Auto-approve */}
<label className="flex items-center gap-2 text-xs text-brand cursor-pointer">
  <input
    type="checkbox"
    checked={autoApprove}
    onChange={(e) => setAutoApprove(e.target.checked)}
    className="accent-[var(--color-gold)]"
  />
  Auto-approve (skip manual review)
</label>

{/* Max slides — only show when auto-approve is on */}
{autoApprove && (
  <div>
    <label className="block text-xs text-brand/60 mb-1">Max slides per release</label>
    <input
      type="number"
      min={1}
      max={5}
      className={inputClass}
      value={maxSlides}
      onChange={(e) => setMaxSlides(Math.max(1, Math.min(5, Number(e.target.value))))}
      style={{ maxWidth: 80 }}
    />
  </div>
)}
```

- [ ] **Step 3: Include in save payload**

Update the `handleSave` body to include:

```ts
autoApprove,
maxSlides,
```

- [ ] **Step 4: Update configs API route to pass through new fields**

In `src/app/api/github/configs/route.ts`, add to the `PUT` handler's `fetchMutation` call:

```ts
autoApprove: body.autoApprove,
maxSlides: body.maxSlides,
```

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/github-repo-card.tsx src/app/api/github/configs/route.ts
git commit -m "feat: add auto-approve toggle and max slides to repo config"
```

---

## Chunk 5: Final Verification

### Task 12: Type check + tests

- [ ] **Step 1: Type check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 2: Run all tests**

Run: `npx vitest run`
Expected: All pass.

- [ ] **Step 3: Dev server smoke test**

Run: `npx next dev`
Verify:
- Dashboard shows "Pending Reviews" section (empty if no pending releases)
- Account page GitHub section shows auto-approve toggle on repo cards
- No console errors

- [ ] **Step 4: Commit any fixes**

---

## Error Handling Summary

- **Claude API failure** → `analyzeRelease` catches errors and falls back to mechanical truncation (release name as title, truncated body as description). The release still gets created — just with simpler content.
- **Invalid AI JSON** → `parseAnalysisResponse` returns a single-slide fallback with "New Release" as title.
- **Missing object IDs in AI response** → `parseAnalysisResponse` filters out objects without valid string IDs.
- **Approval on insufficient credits** → Returns 402 error, release stays in `pending_review`.
- **maxSlides exceeded by AI** → `parseAnalysisResponse` truncates to maxSlides.
- **Config drift** → `pendingConfig` snapshot stored at webhook time ensures approval uses the same template/formats/brand as when the AI analyzed the content.

## Unresolved Questions

1. **Notification for pending reviews** — No push notification or email when a release arrives for review. Could add later. For now, user sees them on dashboard load.
2. **Edit UX** — The raw JSON edit textarea is functional but not polished. A proper per-field editor (title input, description textarea) would be better UX. Defer to a later iteration.
