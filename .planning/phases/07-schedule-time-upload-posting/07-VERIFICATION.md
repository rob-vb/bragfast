---
phase: 07-schedule-time-upload-posting
verified: 2026-05-22T07:05:30Z
status: passed
score: 12/12 must-haves verified
overrides_applied: 0
gaps: []
---

# Phase 7: Schedule-Time Upload + Posting Verification Report

**Phase Goal:** A developer can pick Buffer channels in the Workspace, schedule or queue the rendered Creation, and see a confirmation, with the rendered file uploaded to R2 atomically at schedule-time and the scheduled Creation marked and visible in the Admin gallery.
**Verified:** 2026-05-22T07:05:30Z
**Status:** passed
**Re-verification:** Yes - after gap-closure plan 07-06

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Connected Buffer channels can be shown and selected in the Workspace schedule panel | VERIFIED | `SchedulePanel` fetches integrations/defaults, parses enabled Buffer channels, groups Landscape/Square/Portrait, and renders checkboxes. Existing Phase 7 UI tests still pass. |
| 2 | User can choose next queue slot or exact time and submit | VERIFIED | Queue/custom scheduling remains implemented in `SchedulePanel`; related Workspace schedule hook tests pass. |
| 3 | CLI uploads rendered JPEG bytes to R2 using presigned URLs before backend scheduling | VERIFIED | `packages/cli/src/__tests__/schedule-route.test.ts` still passes and covers local route scheduling orchestration. |
| 4 | Backend HEAD-checks uploaded R2 keys before Buffer push and aborts on missing upload | VERIFIED | `convex/schedulePush.ts:221` calls `headObject` after proof validation and before Buffer credentials/push; `schedulePush.test.ts` upload-missing coverage passes. |
| 5 | Buffer primitive supports queue and exact scheduling fields | VERIFIED | `src/lib/integrations/__tests__/push.test.ts` passes; queue/custom Buffer mapping remains unchanged. |
| 6 | Video formats remain rejected for this phase | VERIFIED | API and Convex validators still allow only `landscape`, `square`, and `portrait` image formats. |
| 7 | Workspace shows a scheduling confirmation with channel/time details | VERIFIED | `packages/workspace/src/hooks/__tests__/useSchedule.test.ts` and existing Workspace UI flow tests pass. |
| 8 | Scheduled Creations are stored for Admin gallery visibility | VERIFIED | `convex/releases.ts:213` marks successful attempts `scheduled`; Admin status support remains from prior Phase 7 plans. |
| 9 | Admin gallery can display a Scheduled badge | VERIFIED | Prior Phase 7 Admin badge implementation remains intact; no Admin files changed in gap closure. |
| 10 | Scheduling backend is trusted and cannot post through another user's Buffer credentials | VERIFIED | `convex/schedulePush.ts:210-211` rejects missing/invalid proof before side effects; direct-call regression at `convex/__tests__/schedulePush.test.ts:194` proves no HEAD, credential, Buffer, or release side effect occurs without proof. |
| 11 | Schedule-time posting is atomic across provider side effects and durable release state | VERIFIED | `convex/schedulePush.ts:251` inserts a pending attempt before provider calls, `convex/schedulePush.ts:293` records each provider post immediately after Buffer success, and `convex/schedulePush.ts:307` marks failure while preserving metadata. Partial-failure and retry tests at `convex/__tests__/schedulePush.test.ts:344` and `:374` pass. |
| 12 | Buffer media URL is proven to correspond to the R2 object that was HEAD-checked | VERIFIED | `src/app/api/v1/schedule/route.ts:201-219` validates selected keys as authenticated `scheduled/{userId}/{draftId}/{format}.jpg` keys and derives URLs with `publicUrlForKey`; tamper and invalid-key tests at `src/app/api/v1/schedule/__tests__/route.test.ts:259` and `:292` pass. |

**Score:** 12/12 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `src/lib/integrations/buffer/push.ts` | Buffer queue/custom scheduling primitive | VERIFIED | Unchanged and targeted tests pass. |
| `convex/schedulePush.ts` | Trusted, durable, idempotent schedule action | VERIFIED | Proof gate, HEAD preflight, pending attempt, provider post recording, failure marking, and retry skipping are implemented. |
| `convex/releases.ts` | Scheduled release attempt lifecycle mutations | VERIFIED | `insertScheduledAttempt`, `recordScheduledProviderPost`, `markScheduledSuccess`, and `markScheduledFailure` are internal mutations with validators. |
| `src/app/api/v1/schedule/upload-url/route.ts` | Authenticated presigned upload URL endpoint | VERIFIED | Prior upload-url route behavior remains covered by route tests. |
| `src/app/api/v1/schedule/route.ts` | Authenticated schedule endpoint | VERIFIED | Authenticates, validates selected key scope, derives URLs, creates server proof, and dispatches Convex. |
| `packages/cli/src/schedule-resolver.ts` | Local file upload and schedule orchestration | VERIFIED | Regression suite for CLI schedule route passes. |
| `packages/workspace/src/hooks/useSchedule.ts` | Workspace schedule state machine | VERIFIED | Hook regression suite passes. |
| `packages/workspace/src/components/SchedulePanel.tsx` | Workspace scheduling UI | VERIFIED | Existing Phase 7 UI flow remains unchanged by gap closure. |
| `packages/workspace/src/pages/Editor.tsx` | SchedulePanel wiring | VERIFIED | Existing editor flow regression tests pass. |
| `src/components/admin/pixel-badge.tsx` / `history-table.tsx` | Scheduled badge visibility | VERIFIED | Prior implementation remains unchanged and review found no current issues. |

### Behavioral Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Schedule gap-closure tests | `npx vitest run convex/__tests__/schedulePush.test.ts src/app/api/v1/schedule/__tests__/route.test.ts` | 2 files passed, 15 tests passed | PASS |
| Related Phase 7 regressions | `npx vitest run src/lib/integrations/__tests__/push.test.ts packages/cli/src/__tests__/schedule-route.test.ts packages/workspace/src/hooks/__tests__/useSchedule.test.ts` | 3 files passed, 27 tests passed | PASS |
| Prior phase regression gate | `npx vitest run packages/cli packages/cli/src/__tests__/server.test.ts packages/workspace/src/__tests__/editor-flow.test.tsx packages/workspace/src/__tests__/useAutoSave.test.tsx` | 11 files passed, 61 tests passed | PASS |
| Production build | `npm run build` | Render core, Workspace, CLI, Convex codegen, and Next build passed | PASS |

### Gap Closure Confirmation

| Previous Gap | Status | Evidence |
|---|---|---|
| Public Convex action could post through another user's Buffer credentials | RESOLVED | Missing proof returns `{ ok:false, error:"unauthorized" }` before `headObject`, secret lookup, Buffer push, or release insert. |
| Partial Buffer success could leave orphaned posts and duplicate retries | RESOLVED | Pending release row exists before provider side effects; every providerPostId is recorded immediately; retry skips recorded provider posts for the stable request id. |
| Schedule route trusted caller media URLs independently from R2 keys | RESOLVED | Route derives `urls` from exact authenticated R2 keys and ignores caller-provided media URLs. |

### Requirements Coverage

| Requirement | Status | Evidence |
|---|---|---|
| SCHED-01 | SATISFIED | Existing Buffer connection/channel discovery path remains intact. |
| SCHED-02 | SATISFIED | Workspace channel selection remains intact. |
| SCHED-03 | SATISFIED | Queue and exact-time scheduling remain intact through UI, CLI, API, and Buffer primitive. |
| SCHED-04 | SATISFIED | Schedule-time upload now proves selected R2 key/public URL correspondence and HEAD-checks keys before Buffer push. |
| SCHED-05 | SATISFIED | Success confirmation behavior remains intact. |
| SCHED-06 | SATISFIED | Scheduled releases are marked `scheduled` after all provider posts are recorded and remain visible to Admin gallery. |

### Human Verification

Phase 7 still benefits from live Buffer UAT with real credentials and R2 objects, but no code-level blocker remains. The previous blocking verification gaps are closed by automated regression coverage and build verification.

---
_Verified: 2026-05-22T07:05:30Z_
_Verifier: inline execute-phase verifier_
