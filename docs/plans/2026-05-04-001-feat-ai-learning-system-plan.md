# GBrain-style learning for the draft AI

## Context

The Haiku-driven draft composer in `src/lib/drafts/compose-copy.ts` already
has a primitive learning loop: each agent draft freezes its `originalConfig`,
and on approval/skip the system can pull the last 3 (original→edited) pairs
back into the prompt as few-shot examples (`examplesBlock`, line 148).

That's stateless retrieval — the model never sees a *distilled* picture of
the user's voice, the user can't read or edit what the AI thinks of them,
and signal from skips is captured (`triggerEvents.decision = "user_skipped"`)
but never reaches Haiku.

This change adds a per-user **voice profile markdown** the user can read,
edit, download, and that the model reads on every draft. It mirrors GBrain's
"compiled truth + append-only timeline" structure: every approval/skip
appends a timeline entry; periodically Haiku rewrites the compiled-truth
section into 5-10 actionable bullets ("prefers active voice", "skips refactor
announcements"). The compiled-truth bullets ride into the system prompt;
the timeline never does (cost + signal-to-noise).

Out of scope for v1: per-brand profiles, vector search, GitHub-repo commit
of the .md, MCP tools (defer to v1.1).

## Markdown shape

```
---
last_updated: 2026-05-04T12:00:00Z
last_reflected: 2026-05-01T09:00:00Z
approval_count: 14
skip_count: 6
---

## Compiled Truth

- (empty until first reflection — composer ignores empty section)

## Timeline

### 2026-05-04 — pr_merged approved (edited)
- Original: Add learning system — Drafts now learn from edits
- Final: Bragfast learns your voice — Each approval teaches the AI
- Edit type: both
```

Two H2 sections only. Frontmatter parsed with a small regex (flat scalars,
no yaml dep).

## Files

### New

- **`src/lib/drafts/voice-profile.ts`** — pure helpers:
  - `parseVoiceProfile(md)` / `serializeVoiceProfile(parts)` — split/recompose.
  - `voiceProfileBlock(md): string` — read-side prompt renderer. Returns `""`
    when md or compiled-truth section is empty/whitespace, so callers can
    concat unconditionally (same pattern as `examplesBlock`).
  - `appendTimelineEntry(md, { dateIso, triggerType, action, wasEdited, original?, final?, editType?, reason? })` —
    prepends a `### …` block under `## Timeline`, bumps approval/skip count,
    refreshes `last_updated`.
  - `trimTimeline(md, maxEntries=50)` — drops oldest past cap.
  - `DEFAULT_VOICE_PROFILE_MD` constant.

- **`convex/voiceProfileReflection.ts`** — `runReflectionForUser`
  (internalAction): reads profile, calls `callHaikuText` with system prompt
  *"Distill voice from this timeline. Output 5-10 specific actionable
  bullets. Don't invent rules."*, replaces `## Compiled Truth`, calls
  `trimTimeline`, persists, stamps `voiceProfileReflectedAt`. The current
  Compiled Truth is included in the prompt as "current rules — only add or
  remove with strong evidence" so user-edited bullets aren't clobbered.

- **`src/app/(admin)/admin/voice/page.tsx`** + sibling
  **`VoiceProfileEditor.tsx`** — monospace `<textarea>` (~30 rows), Save,
  "Reflect now", "Download .md" (client-side Blob), badges for
  `Last reflected`, `Approvals: N · Skips: M`. Sidebar nav entry next to
  `/admin/sous-chef`.

- Tests: `src/lib/drafts/__tests__/voice-profile.test.ts` (parse/serialize
  round-trip, append, trim, empty `voiceProfileBlock`).

### Modified

- **`convex/schema.ts`** — extend `userProfiles` (lines 6-30) with:
  - `voiceProfileMd: v.optional(v.string())`
  - `voiceProfileReflectedAt: v.optional(v.number())`
  - `voiceProfileApprovalCount: v.optional(v.number())`

- **`convex/userProfiles.ts`** — add four exports (mirror
  `getVoicePreset`/`setVoicePreset`):
  - `getVoiceProfileMd` (query, `userId`).
  - `getVoiceProfileMdInternal` (internalQuery).
  - `setVoiceProfileMd` (authed mutation, ~32 KB hard cap).
  - `appendTimelineInternal` (internalMutation, `userId`, `entry`) — calls
    `appendTimelineEntry`, persists, schedules reflection when
    `approvalCount % 10 === 0` or `skipCount % 10 === 0`.

- **`src/lib/drafts/compose-copy.ts`** — add `voiceProfileMd?: string | null`
  to `PlatformOpt` (lines 30-34); inject `${voiceProfileBlock(input.voiceProfileMd)}`
  one line above `${examplesBlock(input.examples)}` in all 7 composers
  (`composePrMerged` 247, `composeMrr` 281, `composeFirstSale` 308,
  `composeVisitors` 334, `composeStar` 407, `composeTotalRevenue` 361,
  `composeSubscribers` 384) and `composeImageCopy` (493). Both blocks
  return `""` when empty so concat is safe; compiled-truth renders first,
  examples second.

- **`convex/draftPushes.ts`** — `approveDraft`: after the `editDelta` block
  (lines 435-438), `ctx.scheduler.runAfter(0, internal.userProfiles.appendTimelineInternal, …)`
  with `action: "approved"`, original/final pulled from `originalConfig` +
  the user-finalized title/description, `editType` from the existing delta.
  Scheduler-fired so a profile-side failure can't fail the approval.

- **`convex/drafts.ts`** — `remove` mutation (lines 477-510), inside
  `if (row.source === "agent")`: same scheduler pattern with
  `action: "skipped"`, `reason`, original parsed from `row.originalConfig`.

- **Read-path wiring** — wherever `getRecentApprovedEdits` is called today,
  `Promise.all` it with `getVoiceProfileMd` and pass through:
  - `convex/integrations/stripe.ts:265`
  - `convex/integrations/posthog.ts:234`
  - `convex/integrations/ga4.ts:252`
  - `convex/integrations/githubStars.ts:230`
  - `src/app/api/github/webhooks/route.ts:203`
  - `src/lib/github/retro-pr.ts:122`

## Reuse

- `computeEditDelta()` (`convex/draftPushes.ts:106-167`) — already classifies
  edits into `title|description|both|platform_copy|multiple`. Use its
  `editType` directly in timeline entries.
- `callHaikuText` in `src/lib/haiku-call.ts` — for reflection (text, not JSON).
- `requireAuthedUser` (`convex/auth.ts`) — for the user-facing mutation.
- `triggerEvents` already records `decision: "approved"|"user_skipped"` —
  no change there; the timeline is a separate, prompt-shaped projection.
- `examplesBlock` stays unchanged — runs in parallel with `voiceProfileBlock`
  so first-time users (empty profile) get today's behavior.

## Tradeoffs / risks

- **Voice preset vs voice profile** — preset (S8.2) is a coarse tone hint;
  profile is specific bullets. Both inject. Add a code comment in
  `compose-copy.ts` calling out the layering.
- **Reflection drift** — mitigated by feeding existing Compiled Truth into
  the reflection prompt as preserved-by-default rules.
- **Append race** — Convex mutation serialization makes
  `appendTimelineInternal` safe as long as the read happens inside the
  mutation, not in a stale closure.
- **Cost** — 32 KB md cap is generous but Timeline never reaches Haiku
  (only Compiled Truth does), so per-call cost is bounded.

## Verification

1. Approve a draft with edits → confirm a `### … approved (edited)` entry
   shows up in `/admin/voice`.
2. Skip an agent draft with reason → confirm skip entry.
3. After 10 approvals → confirm `## Compiled Truth` populates with bullets;
   timeline still intact (only trims past 50).
4. Manually edit `## Compiled Truth` in `/admin/voice` → trigger a draft
   (replay a PR webhook in dev) → confirm Haiku output reflects the bullets.
5. "Reflect now" button works mid-cycle.
6. First-time user (empty profile) → drafts behave identically to today.
7. `npx vitest run src/lib/drafts/__tests__/voice-profile.test.ts`
8. `npx vitest run src/lib/drafts/__tests__/compose-copy.test.ts` (extend
   with a case asserting `voiceProfileBlock` content reaches the user
   prompt for `pr_merged`).
9. `npm run lint && npm run build`.
