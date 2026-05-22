---
phase: 07-schedule-time-upload-posting
reviewed: 2026-05-22T06:28:03Z
depth: standard
files_reviewed: 24
files_reviewed_list:
  - convex/__tests__/schedulePush.test.ts
  - convex/_generated/api.d.ts
  - convex/releases.ts
  - convex/schedulePush.ts
  - convex/schema.ts
  - packages/cli/src/__tests__/schedule-route.test.ts
  - packages/cli/src/schedule-resolver.ts
  - packages/cli/src/server.ts
  - packages/workspace/src/__tests__/editor-flow.test.tsx
  - packages/workspace/src/__tests__/schedule-panel.test.tsx
  - packages/workspace/src/api.ts
  - packages/workspace/src/components/SchedulePanel.tsx
  - packages/workspace/src/hooks/__tests__/useSchedule.test.ts
  - packages/workspace/src/hooks/useSchedule.ts
  - packages/workspace/src/pages/Editor.tsx
  - packages/workspace/src/types.ts
  - src/app/api/v1/schedule/__tests__/route.test.ts
  - src/app/api/v1/schedule/route.ts
  - src/app/api/v1/schedule/upload-url/route.ts
  - src/components/admin/history-table.tsx
  - src/components/admin/pixel-badge.tsx
  - src/lib/integrations/__tests__/push.test.ts
  - src/lib/integrations/buffer/push.ts
  - src/lib/types.ts
findings:
  critical: 2
  warning: 1
  info: 0
  total: 3
status: issues_found
---

# Phase 07: Code Review Report

**Reviewed:** 2026-05-22T06:28:03Z
**Depth:** standard
**Files Reviewed:** 24
**Status:** issues_found

## Narrative Findings (AI reviewer)

## Summary

Reviewed the schedule upload/posting path across Workspace UI, CLI local server, Next API routes, Convex action/mutations, schema, Buffer push integration, and related tests. The main risks are backend authorization and non-atomic external posting: the Convex action is publicly callable while trusting a request-body `userId`, and multi-channel pushes can create provider posts without any durable release record if a later channel fails.

## Critical Issues

### CR-01: Public Convex action can post through another user's Buffer credentials

**File:** `convex/schedulePush.ts:55`
**Issue:** `schedulePush.run` is registered with public `action` and accepts `userId` as an argument. It then uses that caller-supplied value to fetch the sealed Buffer secret at lines 87-95. Because public Convex actions are exposed through the generated public API, a caller can invoke `api.schedulePush.run` directly with another user's id and cause the action to decrypt and use that user's Buffer credential. This violates the repo rule that sensitive write paths derive `userId` from server-side auth, never from request bodies.
**Fix:**
```ts
import { internalAction } from "./_generated/server";

export const run = internalAction({
  args: {
    userId: v.string(),
    // existing validated args...
  },
  handler: async (ctx, args) => {
    // only trusted server/internal callers can now supply userId
  },
});
```

Then expose scheduling only through the authenticated Next route, or alternatively keep it public but remove the `userId` arg and derive the identity with `ctx.auth.getUserIdentity()` before looking up secrets.

### CR-02: Partial Buffer success leaves orphaned posts and retries duplicate them

**File:** `convex/schedulePush.ts:99`
**Issue:** The action pushes each selected channel to Buffer before inserting the scheduled release. If one Buffer call succeeds and a later call throws, the action exits before `insertScheduled` at line 136. The already-created Buffer post remains live, the app records no release/providerPostId for it, and a retry creates duplicates for the channels that succeeded in the first attempt.
**Fix:**
```ts
const releaseId = `rel_${crypto.randomUUID().slice(0, 12)}`;
await ctx.runMutation(internal.releases.insertScheduledAttempt, {
  userId: args.userId,
  externalId: releaseId,
  status: "pending",
  // persist draftId, selections, keys, urls, caption
});

for (const selection of args.selections) {
  try {
    const result = await pushToBuffer(/* ... */);
    await ctx.runMutation(internal.releases.recordScheduledProviderPost, {
      externalId: releaseId,
      format: selection.format,
      channelId: selection.channelId,
      providerPostId: result.providerPostId,
    });
  } catch (err) {
    await ctx.runMutation(internal.releases.markFailed, { externalId: releaseId });
    throw err;
  }
}
```

Persist the attempt before external side effects, record each provider post as it succeeds, and add an idempotency key or per-selection state so retries skip already-created posts instead of duplicating them.

## Warnings

### WR-01: Schedule API trusts client-supplied media URLs instead of deriving them from validated upload keys

**File:** `src/app/api/v1/schedule/route.ts:138`
**Issue:** The route validates that `urls` and `keys` are string records, but it does not enforce that each key belongs to `scheduled/${auth.userId}/${draftId}/...` or that each media URL corresponds to the verified R2 object. `schedulePush.run` later verifies only key existence at `convex/schedulePush.ts:78`, but it sends `args.urls[selection.format]` to Buffer at line 105. A caller can pair any existing key with a different media URL, bypassing the intended upload proof and the project's explicit-host validation rule.
**Fix:** Validate ownership and derive the public URL from the accepted key, or enforce a strict R2 public URL prefix and exact path match before calling Convex.
```ts
const expectedPrefix = `scheduled/${auth.userId}/${payload.draftId}/`;
for (const selection of payload.selections) {
  const key = payload.keys[selection.format];
  if (key !== `${expectedPrefix}${selection.format}.jpg`) {
    return Response.json({ error: "upload key does not match draft and user" }, { status: 400 });
  }
  payload.urls[selection.format] = publicUrlForR2Key(key);
}
```

---

_Reviewed: 2026-05-22T06:28:03Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_
