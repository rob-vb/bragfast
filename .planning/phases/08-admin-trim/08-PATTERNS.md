# Phase 8: Admin Trim — Pattern Map

**Mapped:** 2026-05-22
**Files analyzed:** 8 new/modified files (excluding pure deletions)
**Analogs found:** 8 / 8

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/auth/subscription-gate.ts` | utility/auth | request-response | `src/lib/auth/authenticate.ts` | role-match |
| `convex/schema.ts` (userProfiles) | model | CRUD | `convex/schema.ts` existing optional fields | exact |
| `convex/userProfiles.ts` (create mutation) | model/mutation | CRUD | `convex/userProfiles.ts` existing create | exact |
| `src/app/api/v1/schedule/route.ts` (add gate) | route | request-response | `src/app/api/v1/drafts/route.ts` | exact |
| `src/app/(admin)/admin/integrations/page.tsx` | page (server) | request-response | `src/app/(admin)/admin/keys/page.tsx` | exact |
| `src/components/admin/integrations-client.tsx` | component (client) | request-response | `src/components/admin/sous-chef-client.tsx` PostingProviderBlock | exact |
| `packages/workspace/src/api.ts` (add fetchUserTemplates) | utility/api | request-response | `packages/workspace/src/api.ts` fetchDrafts / fetchBrands | exact |
| `packages/workspace/src/pages/Home.tsx` (Default/Custom toggle) | component | request-response | `packages/workspace/src/pages/Home.tsx` templates section | exact |
| `src/lib/plans.ts` (collapse) | config | — | `src/lib/plans.ts` current PLANS map | exact |
| `convex/stripe.ts` (collapse) | service/Convex | CRUD | `convex/stripe.ts` current handleSubscriptionChange | exact |

---

## Pattern Assignments

### `src/lib/auth/subscription-gate.ts` (NEW — utility, request-response)

**Analog:** `src/lib/auth/authenticate.ts` (lines 1-20) + `src/app/api/v1/schedule/route.ts` (line 261 usage)

**Import pattern** (from `authenticate.ts` lines 1-2):
```typescript
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
```

**Gate helper structure** — modeled on `authenticate`'s single-responsibility shape. The helper returns `Response | null` so call sites can `return gateFail` or continue:
```typescript
// src/lib/auth/authenticate.ts (lines 8-20) — the peer function this sits beside:
export async function authenticate(
  request: Request
): Promise<{ userId: string } | null> {
  const apiKeyAuth = await validateApiKey(request);
  if (apiKeyAuth) return apiKeyAuth;
  const user = await getSessionUser();
  if (user) return { userId: user._id };
  return null;
}
```

**Call-site pattern** in gated routes (from `src/app/api/v1/schedule/route.ts` lines 260-265):
```typescript
export async function POST(request: Request) {
  const auth = await authenticate(request);
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  // ADD HERE: const gate = await checkSubscriptionGate(auth.userId);
  // ADD HERE: if (gate) return gate;
  // ... rest of handler
}
```

**Gate logic** (derived from RESEARCH.md RQ-5 + `convex/userProfiles.ts` getByUserId):
```typescript
// Gate reads userProfile via convex/userProfiles.ts getByUserId pattern (lines 4-12):
const profile = await fetchQuery(api.userProfiles.getByUserId, { userId });
// Decision: plan === "free" OR (plan === "trial" AND trialEnd < Date.now()) → 402
// Return null when subscribed ("plate") or within active trial window
```

**Error response shape** to use for 402:
```typescript
return Response.json(
  { error: "subscription_required", message: "Trial expired. Subscribe to continue." },
  { status: 402 }
);
```

---

### `convex/schema.ts` userProfiles — add `trialEnd`, remove `creditsRemaining` (MODIFY)

**Analog:** `convex/schema.ts` lines 6-30 — the current `userProfiles` table definition

**Existing field patterns** to model `trialEnd` on (optional number fields in schema):
```typescript
// convex/schema.ts lines 6-30 — current userProfiles table:
userProfiles: defineTable({
  userId: v.string(),
  email: v.optional(v.string()),
  creditsRemaining: v.number(),           // REMOVE (make optional first, then delete)
  plan: v.union(
    v.literal("trial"),
    v.literal("starter"),
    v.literal("pro"),
    v.literal("scale"),
    v.literal("free"),
    v.literal("toast"),
    v.literal("plate"),
    v.literal("buffet")
  ),
  lastDraftsVisitAt: v.optional(v.number()),  // pattern for trialEnd: v.optional(v.number())
  lastBriefingVisitAt: v.optional(v.number()),
  // ...
})
```

**Two-deploy safety sequence** (RESEARCH.md RQ-7, Pitfall 1):
- Deploy 1: change `creditsRemaining: v.number()` → `creditsRemaining: v.optional(v.number())` AND add `trialEnd: v.optional(v.number())`
- Deploy 2: remove `creditsRemaining` from schema after all code references stripped

**plan union collapse** — add `v.literal("plate")` (already present) and keep existing literals until migration runs. Final target: `v.union(v.literal("trial"), v.literal("plate"), v.literal("free"))`.

---

### `convex/userProfiles.ts` `create` mutation — set `trialEnd` (MODIFY)

**Analog:** `convex/userProfiles.ts` lines 45-68 — the existing `create` mutation

**Existing insertion pattern** (lines 61-66):
```typescript
return ctx.db.insert("userProfiles", {
  userId,
  email,
  creditsRemaining: previous ? 0 : 30,  // REMOVE this line
  plan: "trial",
  // ADD: trialEnd: Date.now() + 14 * 24 * 60 * 60 * 1000,
});
```

**Full create handler context** (lines 45-68):
```typescript
export const create = mutation({
  args: { userId: v.string(), email: v.string() },
  handler: async (ctx, { userId, email }) => {
    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (existing) return existing._id;

    const previous = await ctx.db
      .query("userProfiles")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    return ctx.db.insert("userProfiles", {
      userId,
      email,
      creditsRemaining: previous ? 0 : 30,  // strip
      plan: "trial",
      // trialEnd goes here: Date.now() + 14 * 24 * 60 * 60 * 1000
    });
  },
});
```

---

### 402 gate enforcement in `POST /api/v1/schedule`, `POST/PATCH /api/v1/drafts` (MODIFY)

**Analog:** `src/app/api/v1/schedule/route.ts` lines 260-314 and `src/app/api/v1/drafts/route.ts` lines 20-45

**Auth-then-handler structure** in `drafts/route.ts` (lines 20-26) — the insertion point:
```typescript
export async function POST(request: Request) {
  const auth = await resolveAuth(request);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // INSERT gate call here:
  // const gate = await checkSubscriptionGate(auth.userId);
  // if (gate) return gate;

  const rateLimitResponse = await checkRateLimit(auth.userId);
  if (rateLimitResponse) return rateLimitResponse;
  // ...
}
```

**Auth-then-handler structure** in `schedule/route.ts` (lines 260-266):
```typescript
export async function POST(request: Request) {
  const auth = await authenticate(request);
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  // INSERT gate call here — before payload parsing
```

**Gate import to add** at top of each gated route:
```typescript
import { checkSubscriptionGate } from "@/lib/auth/subscription-gate";
```

**Routes to gate** (POST only for write paths):
- `src/app/api/v1/schedule/route.ts` — POST
- `src/app/api/v1/schedule/upload-url/route.ts` — POST
- `src/app/api/v1/drafts/route.ts` — POST only (GET stays ungated)
- `src/app/api/v1/drafts/[id]/route.ts` — PATCH only (GET stays ungated)

---

### `src/app/(admin)/admin/integrations/page.tsx` (NEW — server page)

**Analog:** `src/app/(admin)/admin/keys/page.tsx` (lines 1-20) — simplest auth-guard + client-component pattern

**Full analog** (keys/page.tsx lines 1-20):
```typescript
import { getSessionUser } from "@/lib/auth/get-session-user";
import { redirect } from "next/navigation";
import { PixelCard } from "@/components/admin/pixel-card";
import { KeyManager } from "@/components/admin/key-manager";

export default async function KeysPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-press-start)] text-lg text-brand">
        API Keys
      </h1>
      <PixelCard>
        <KeyManager />
      </PixelCard>
    </div>
  );
}
```

**Copy exactly, replacing:**
- Import `IntegrationsClient` instead of `KeyManager`
- Heading text → `"Integrations"`
- No `PixelCard` wrapper needed at page level — `IntegrationsClient` owns its own cards

---

### `src/components/admin/integrations-client.tsx` (NEW — client component)

**Analog:** `src/components/admin/sous-chef-client.tsx` `PostingProviderBlock` function (lines 161-274)

**PixelCard + connect/disconnect structure** (sous-chef-client.tsx lines 203-274):
```typescript
return (
  <PixelCard>
    <div className="space-y-4">
      {/* Header row: provider name + connected badge + action button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="font-[family-name:var(--font-press-start)] text-sm text-brand">
            {PROVIDER_LABELS[provider]}
          </h2>
          <span
            className={`font-[family-name:var(--font-press-start)] text-[10px] px-2 py-1 border-2 border-brand uppercase tracking-wider ${
              connected ? "bg-gold text-brand" : "bg-surface text-brand/60"
            }`}
          >
            {connected ? "Connected" : "Off"}
          </span>
        </div>
        <div className="flex gap-2">
          {!connected ? (
            <PixelButton onClick={onConnect}>
              Connect {PROVIDER_LABELS[provider]}
            </PixelButton>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <PixelButton variant="danger" disabled={disconnecting}>
                  {disconnecting ? "Disconnecting..." : "Disconnect"}
                </PixelButton>
              </AlertDialogTrigger>
              {/* ... AlertDialogContent with confirm/cancel */}
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="font-[family-name:var(--font-geist-sans)] text-xs text-brand/70">
        {PROVIDER_DESCRIPTIONS[provider]}
      </p>

      {/* Connected details + channel list */}
      {connected && (
        <ChannelList provider={provider} extra={row?.extra ?? null} />
      )}
    </div>
  </PixelCard>
);
```

**Disconnect fetch pattern** (sous-chef-client.tsx lines 177-188):
```typescript
async function disconnect() {
  setDisconnecting(true);
  try {
    const res = await fetch(
      `/api/v1/sous-chef/integrations?provider=${provider}`,
      { method: "DELETE" },
    );
    if (res.ok) onReload();
  } finally {
    setDisconnecting(false);
  }
}
```

**ConnectDialog** is imported from `./integration-forms` (sous-chef-client.tsx line 12-16). That component is NOT in the deletion blast radius — extract and reuse it, or copy the connect form pattern inline.

---

### `packages/workspace/src/api.ts` — add `fetchUserTemplates()` (MODIFY)

**Analog:** `packages/workspace/src/api.ts` `fetchBrands` and `fetchDrafts` functions (lines 27-30, 58-60)

**Exact patterns to copy:**
```typescript
// fetchDrafts — lines 27-30 (envelope unwrap pattern):
export async function fetchDrafts(): Promise<DraftPreview[]> {
  const response = await requestJson<{ drafts: DraftPreview[] }>("/api/v1/drafts");
  return response.drafts;
}

// fetchBrands — lines 58-60 (direct array return):
export async function fetchBrands(): Promise<BrandRecord[]> {
  return requestJson<BrandRecord[]>("/api/v1/brands");
}
```

**`fetchUserTemplates` to add** — check `/api/v1/templates` response shape first (it returns `{ templates: [...] }`), then model on `fetchDrafts` unwrap:
```typescript
export async function fetchUserTemplates(): Promise<UserTemplate[]> {
  const response = await requestJson<{ templates: UserTemplate[] }>("/api/v1/templates");
  return response.templates;
}
```

**`requestJson` helper** (lines 17-21) — already in scope, no new utility needed:
```typescript
async function requestJson<T>(url: `/api/${string}`, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`${url} failed (${response.status})`);
  return (await response.json()) as T;
}
```

**`UserTemplate` type** — add to `packages/workspace/src/types.ts`. Model on the `BrandRecord` or `DraftPreview` types in that file. Minimum shape: `{ id: string; name: string; config: CanvasTemplateConfig }`.

---

### `packages/workspace/src/pages/Home.tsx` — Default/Custom toggle (MODIFY)

**Analog:** `packages/workspace/src/pages/Home.tsx` existing templates section (lines 11-17, 34-36, 141-168)

**Built-in template initialization** (lines 11-17, 34-36):
```typescript
const TEMPLATE_IDS = [
  "standard-browser",
  "standard-mobile",
  "split-browser",
  "split-mobile",
  "hero",
] as const;

// In component:
const templates = useMemo(
  () => TEMPLATE_IDS.map((id) => ({ id, ...CANVAS_DEFAULTS[id] })),
  [],
);
```

**Async fetch pattern** to copy for custom templates (lines 40-58 — the `fetchDrafts` useEffect):
```typescript
useEffect(() => {
  let cancelled = false;
  setLoadingDrafts(true);
  fetchDrafts()
    .then((rows) => {
      if (cancelled) return;
      setDrafts(rows);
      setLoadError(false);
    })
    .catch(() => {
      if (!cancelled) setLoadError(true);
    })
    .finally(() => {
      if (!cancelled) setLoadingDrafts(false);
    });
  return () => { cancelled = true; };
}, []);
```

**Template card structure** to extend (lines 141-167 — the template grid):
```typescript
<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
  {templates.map((template) => (
    <article key={template.id} className="overflow-hidden rounded-[8px] border ...">
      <div className="aspect-video border-b ...">
        <TemplatePreview config={template.config} brand={selectedBrand} format="landscape" />
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-[14px]">{template.name}</h3>
        <button onClick={() => onNewTemplate(template.id, template.config, selectedBrand)}>
          Use template
        </button>
      </div>
    </article>
  ))}
</div>
```

**Toggle state** to add above the grid (new state + button group):
```typescript
const [templateMode, setTemplateMode] = useState<"default" | "custom">("default");
const [userTemplates, setUserTemplates] = useState<UserTemplate[]>([]);
const [loadingUserTemplates, setLoadingUserTemplates] = useState(false);
```

Toggle button group visual: two `<button>` elements styled as PixelButton-like ghost/primary pair. Active arm gets `bg-[var(--workspace-forest)] text-white`; inactive gets outlined ghost style. When `templateMode === "custom"` and `userTemplates.length === 0`, show the empty state copy from UI-SPEC: heading "No custom templates" / body "Build a template in the admin, then it'll appear here."

---

### `src/lib/plans.ts` — single-plan collapse (MODIFY)

**Analog:** `src/lib/plans.ts` lines 1-43 — the full current file

**Current shape** (lines 1-43):
```typescript
export type PlanId = "trial" | "starter" | "pro" | "scale";

export interface PlanConfig {
  id: PlanId;
  name: string;
  price: number;
  credits: number;   // REMOVE — no credits
  label: string;
}

export const PLANS: Record<PlanId, PlanConfig> = {
  trial: { id: "trial", name: "On the House", price: 0, credits: 30, label: "30 free credits" },
  starter: { ... },
  pro: { ... },
  scale: { ... },
};

export const PAID_PLANS: PlanConfig[] = [PLANS.starter, PLANS.pro, PLANS.scale];
export const ALL_PLANS: PlanConfig[] = [PLANS.trial, ...PAID_PLANS];
```

**Target shape** — collapse to:
```typescript
export type PlanId = "trial" | "free" | "plate";

export interface PlanConfig {
  id: PlanId;
  name: string;
  price: number;  // 0 for trial/free, 29 for plate
  label: string;
  // credits field REMOVED
}

export const PLANS: Record<PlanId, PlanConfig> = {
  trial: { id: "trial", name: "On the House", price: 0, label: "14-day free trial" },
  free: { id: "free", name: "Free", price: 0, label: "No active subscription" },
  plate: { id: "plate", name: "Full Plate", price: 29, label: "$29/mo" },
};
```

---

### `convex/stripe.ts` — single-price collapse (MODIFY)

**Analog:** `convex/stripe.ts` lines 1-207 — the full current file

**Key structures to collapse:**

`createCheckoutSession` (lines 37-68) — replace `priceEnvMap` multi-plan lookup with single price:
```typescript
// CURRENT (lines 40-48):
const priceEnvMap: Record<string, string | undefined> = {
  starter: process.env.STRIPE_STARTER_PRICE_ID,
  pro: process.env.STRIPE_PRO_PRICE_ID,
  scale: process.env.STRIPE_SCALE_PRICE_ID,
  toast: process.env.STRIPE_TOAST_PRICE_ID,
  plate: process.env.STRIPE_PLATE_PRICE_ID,
  buffet: process.env.STRIPE_BUFFET_PRICE_ID,
};
const priceId = priceEnvMap[planId];
if (!priceId) throw new Error(`No price ID configured for plan: ${planId}`);

// TARGET: single lookup
const priceId = process.env.STRIPE_PLATE_PRICE_ID;
if (!priceId) throw new Error("STRIPE_PLATE_PRICE_ID not configured");
```

`handleSubscriptionChange` (lines 110-148) — strip multi-plan branching:
```typescript
// TARGET shape:
handler: async (ctx, { userId, priceId, status }) => {
  if (status !== "active" && status !== "trialing") return;
  const profile = await ctx.db.query("userProfiles")
    .withIndex("by_userId", (q) => q.eq("userId", userId)).first();
  if (!profile) return;
  await ctx.db.patch(profile._id, { plan: "plate" }); // no creditsRemaining
},
```

`handleSubscriptionDeleted` (lines 180-207) — strip credit zeroing:
```typescript
// TARGET shape:
handler: async (ctx, { userId }) => {
  const profile = await ctx.db.query("userProfiles")
    .withIndex("by_userId", (q) => q.eq("userId", userId)).first();
  if (!profile) return;
  await ctx.db.patch(profile._id, { plan: "free" });
},
```

Delete entirely: `priceToPlan()`, `priceToTier()`, `PLAN_CREDITS` map, `TIER_CONFIG` import, `handleInvoicePaid` (no-op under no-credits model — can be deleted or kept as no-op).

---

## Shared Patterns

### Session auth guard (all admin pages)
**Source:** `src/app/(admin)/admin/keys/page.tsx` lines 1-9, `src/app/(admin)/admin/brands/page.tsx` lines 11-13
```typescript
import { getSessionUser } from "@/lib/auth/get-session-user";
import { redirect } from "next/navigation";

export default async function SomePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  // ...
}
```

### PixelCard + Press Start 2P heading
**Source:** `src/app/(admin)/admin/keys/page.tsx` lines 12-16, `src/app/(admin)/admin/account/page.tsx` lines 47-50
```typescript
<h1 className="font-[family-name:var(--font-press-start)] text-lg text-brand">
  Page Title
</h1>
<PixelCard>
  {/* content */}
</PixelCard>
```

### AlertDialog for destructive confirmations
**Source:** `src/components/admin/sous-chef-client.tsx` lines 226-253
```typescript
<AlertDialog>
  <AlertDialogTrigger asChild>
    <PixelButton variant="danger" disabled={loading}>
      {loading ? "Disconnecting..." : "Disconnect"}
    </PixelButton>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Disconnect {name}?</AlertDialogTitle>
      <AlertDialogDescription>Consequence note here.</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel asChild>
        <PixelButton variant="ghost">Cancel</PixelButton>
      </AlertDialogCancel>
      <AlertDialogAction asChild>
        <PixelButton variant="danger" onClick={handler}>Disconnect</PixelButton>
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### Convex db.patch mutation pattern
**Source:** `convex/userProfiles.ts` lines 83-97, `convex/stripe.ts` lines 126-133
```typescript
const profile = await ctx.db
  .query("userProfiles")
  .withIndex("by_userId", (q) => q.eq("userId", userId))
  .first();
if (!profile) return;
await ctx.db.patch(profile._id, { plan: "plate" });
```

---

## Deletions (no analog needed)

These files/directories are deleted outright. No pattern mapping required — use the research document's exclusivity verdicts (RQ-1) for deletion ordering.

| Deletion Target | Category | Safe-to-delete verdict |
|-----------------|----------|----------------------|
| `src/app/(admin)/admin/kitchen/` + `src/components/kitchen/*` | UI | Only callers: Kitchen page itself |
| `src/app/(admin)/admin/sous-chef/` (all pages) | UI | Only callers: nav links being removed |
| `src/app/(admin)/admin/briefing/` | UI | Only callers: nav links |
| `src/app/(admin)/admin/drafts/page.tsx` + `drafts-client.tsx` | UI | Only action pushes to Kitchen |
| `src/app/(admin)/admin/report/page.tsx` + `report-client.tsx` | UI | Callers: nav links |
| `src/app/(admin)/admin/routing-defaults-client.tsx` | UI | Workspace owns routing-defaults now |
| `src/components/admin/github-repo-list.tsx` | UI | Only callers: GitHub App UI |
| `src/components/admin/pixel-event-card.tsx` | UI | Only callers: Sous-Chef activity feed |
| `src/app/api/github/webhooks/route.ts` | API | No GitHub App = no webhook |
| `src/app/api/github/configs/route.ts` + `repos/` + `installations/` | API | Only callers: GitHub App UI (being deleted) |
| `src/lib/github/pr-merge.ts` + `retro-pr.ts` | lib | Only callers: webhook route |
| `convex/triggerEvents.ts` | Convex | Only callers: webhook + drafts.ts PR path (strip drafts.ts first) |
| `convex/goals.ts` / `briefings.ts` / `briefingsActions.ts` / `goalEmails.ts` / `triggerDrafting.ts` | Convex | Only callers: Sous-Chef pages |
| `convex/integrations/githubStars.ts` | Convex | Shelved automation; cron reference also removed |
| `convex/planTiers.ts` | Convex | Only callers: stripe.ts (being rewritten) |
| `src/lib/launch-mode.ts` | lib | All 5 consumers collapse to repositioned branch |
| `src/lib/pricing-data.tsx` | lib | Multi-tier UI being deleted |
| `src/lib/plan-tiers.ts` | lib | Only callers: account page, stripe.ts (both modified) |
| `src/lib/accounting/post-allowance.ts` | lib | Credits-based, no longer applies |
| `src/components/admin/history-table.tsx` `SocialCopySection` (lines 79-203) | component section | Gallery is read-only |
| `src/lib/types.ts` `calculateCredits` + credits fields | lib section | Credits teardown D-12 |
| `convex/userProfiles.ts` `getBalance` / `reserve` / `refund` | Convex mutations | Credits teardown; getBalance only caller: cook/[id] route |
| `src/app/(admin)/admin/account/upgrade/page.tsx` multi-tier UI | UI | Replaced by single-price subscribe page |
| Credit check calls in `src/app/api/v1/cook/_shared.ts` + `image/route.ts` + `video/route.ts` + `[id]/route.ts` | API sections | D-12; cook routes themselves stay as stubs |
| Credit logic in `src/lib/pipeline/render.ts` + `render-video.ts` + `convex/videoRender.ts` | pipeline sections | D-12 credits teardown |
| Test files: `credits.test.ts`, `cook-credits.test.ts`, `plan-tiers.test.ts` | test | Corresponding code deleted |

**Critical deletion ordering** (from RESEARCH.md Pitfall 2):
1. Strip `insertTriggerEvent` import + PR-merge functions from `convex/drafts.ts` first → deploy
2. Then delete `convex/triggerEvents.ts`
3. Make `creditsRemaining` optional in schema → deploy → strip code → remove from schema (two deploys)

---

## Metadata

**Analog search scope:** `src/lib/auth/`, `src/app/api/v1/`, `src/app/(admin)/admin/`, `src/components/admin/`, `packages/workspace/src/`, `convex/`
**Files read:** authenticate.ts, plans.ts, schema.ts, userProfiles.ts, stripe.ts, drafts/route.ts, schedule/route.ts, keys/page.tsx, brands/page.tsx, account/page.tsx, sous-chef-client.tsx, Home.tsx, api.ts
**Pattern extraction date:** 2026-05-22
