---
phase: 07-schedule-time-upload-posting
verified: 2026-05-22T06:31:53Z
status: gaps_found
score: 9/12 must-haves verified
overrides_applied: 0
gaps:
  - truth: "Scheduling backend is a trusted server-side path and cannot be directly abused to post through another user's Buffer credentials"
    status: failed
    reason: "convex/schedulePush.ts exports a public action and accepts userId as an argument; the action then uses that caller-supplied userId to fetch and unseal Buffer credentials."
    artifacts:
      - path: "convex/schedulePush.ts"
        issue: "Uses action() at line 55 with userId arg at line 57 and passes args.userId to getSealedForScan at lines 87-90."
    missing:
      - "Make schedulePush.run an internalAction called only by the authenticated route, or keep it public but derive identity with ctx.auth.getUserIdentity() and remove userId from args."
      - "Add a regression test proving direct public calls cannot schedule for an arbitrary userId."
  - truth: "Schedule-time upload/posting is atomic enough that partial Buffer posts cannot be left without a scheduled Creation record"
    status: failed
    reason: "schedulePush pushes to Buffer for each selected channel before inserting the scheduled release. If a later push throws, earlier provider posts remain live and no release/providerPostId record is persisted."
    artifacts:
      - path: "convex/schedulePush.ts"
        issue: "pushToBuffer loop runs at lines 99-118; insertScheduled does not happen until lines 136-148."
    missing:
      - "Persist a pending scheduled attempt before external provider side effects."
      - "Record each provider post as it succeeds and mark failed on later failure, or add idempotency/per-selection retry handling to avoid duplicate posts."
      - "Add a test where the second Buffer push fails and verify the first provider post remains durably recorded or skipped on retry."
  - truth: "The URL sent to Buffer is proven to be the public URL for the R2 object that was HEAD-checked"
    status: failed
    reason: "The schedule API validates urls and keys only as image-format string records; it does not enforce that keys are under scheduled/{auth.userId}/{draftId}/... or derive public URLs from those keys before calling schedulePush."
    artifacts:
      - path: "src/app/api/v1/schedule/route.ts"
        issue: "parseSchedulePayload accepts urls at lines 138-139 and keys at lines 141-142, then forwards both unchanged to schedulePush at lines 217-220."
      - path: "convex/schedulePush.ts"
        issue: "HEAD-checks args.keys at lines 78-84 but sends args.urls[selection.format] to Buffer at line 105."
    missing:
      - "Validate key ownership/path for every selected format and derive the public R2 URL server-side from the accepted key, or enforce exact key/publicUrl correspondence."
      - "Add a route test that rejects a valid R2 key paired with a mismatched external media URL."
---

# Phase 7: Schedule-Time Upload + Posting Verification Report

**Phase Goal:** A developer can pick Buffer channels in the Workspace, schedule or queue the rendered Creation, and see a confirmation, with the rendered file uploaded to R2 atomically at schedule-time and the scheduled Creation marked and visible in the Admin gallery.
**Verified:** 2026-05-22T06:31:53Z
**Status:** gaps_found
**Re-verification:** No - initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Connected Buffer channels can be shown and selected in the Workspace schedule panel | VERIFIED | `SchedulePanel` fetches integrations/defaults, parses enabled Buffer channels, groups Landscape/Square/Portrait, and renders checkboxes in `packages/workspace/src/components/SchedulePanel.tsx:138-263`. |
| 2 | User can choose next queue slot or exact time and submit | VERIFIED | Queue/exact controls and `datetime-local` input are implemented in `SchedulePanel.tsx:265-304`; submission sends queue/custom scheduling at `SchedulePanel.tsx:189-198`. |
| 3 | CLI uploads rendered JPEG bytes to R2 using presigned URLs before backend scheduling | VERIFIED | `resolveAndSchedule()` calls `/api/v1/schedule/upload-url`, reads local `brag-output/<draftId>/<format>.jpg`, PUTs bytes, then calls `/api/v1/schedule` in `packages/cli/src/schedule-resolver.ts:151-180`. |
| 4 | Backend HEAD-checks uploaded R2 keys before Buffer push and aborts on missing upload | VERIFIED | `convex/schedulePush.ts:73-85` checks missing keys/URLs and calls `headObject()` before any Buffer push. |
| 5 | Buffer primitive supports queue and exact scheduling fields | VERIFIED | `pushToBuffer()` maps queue to `mode:"addToQueue"` and custom to `mode:"customScheduled"` with `dueAt` in `src/lib/integrations/buffer/push.ts:155-169`. |
| 6 | Video formats remain rejected for this phase | VERIFIED | API and Convex validators only allow `landscape|square|portrait`; `pushToBuffer()` still throws for video formats in `push.ts:134-143`. |
| 7 | Workspace shows a scheduling confirmation with channel/time details | VERIFIED | Success state renders `Scheduled` and per-channel queue/exact lines in `SchedulePanel.tsx:328-339`. |
| 8 | Scheduled Creations are stored for Admin gallery visibility | VERIFIED | `insertScheduled` inserts a `releases` row with `status:"scheduled"` and `output:"image"` in `convex/releases.ts:97-113`. |
| 9 | Admin gallery can display a Scheduled badge | VERIFIED | Schema allows `scheduled`; `PixelBadge` styles it; `HistoryTable` passes release status to `PixelBadge`. |
| 10 | Scheduling backend is trusted and cannot post through another user's Buffer credentials | FAILED | Public `action()` accepts `userId` and uses it for sealed Buffer lookup in `convex/schedulePush.ts:55-90`. |
| 11 | Schedule-time posting is atomic across provider side effects and durable release state | FAILED | Buffer pushes happen at `convex/schedulePush.ts:99-118`; release persistence happens later at `convex/schedulePush.ts:136-148`. |
| 12 | Buffer media URL is proven to correspond to the R2 object that was HEAD-checked | FAILED | Schedule route forwards caller-provided `urls` and `keys` unchanged; Convex checks `keys` but posts `urls`. |

**Score:** 9/12 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `src/lib/integrations/buffer/push.ts` | Buffer queue/custom scheduling primitive | VERIFIED | Substantive implementation and targeted tests pass. |
| `convex/schedulePush.ts` | Trusted schedule action and release insertion | FAILED | Substantive and wired, but public userId trust and provider-before-release ordering break the trusted/atomic contract. |
| `convex/releases.ts` | Scheduled release insertion | VERIFIED | Internal mutation inserts scheduled image releases. |
| `src/app/api/v1/schedule/upload-url/route.ts` | Authenticated presigned upload URL endpoint | VERIFIED | Authenticates, validates safe draftId/image formats, generates scoped keys. |
| `src/app/api/v1/schedule/route.ts` | Authenticated schedule endpoint | FAILED | Authenticates and validates image shape, but does not prove URL/key correspondence before dispatch. |
| `packages/cli/src/schedule-resolver.ts` | Local file upload and schedule orchestration | VERIFIED | Reads local output, uploads via presigned PUT, then schedules. |
| `packages/workspace/src/hooks/useSchedule.ts` | Workspace schedule state machine | VERIFIED | Flushes draft, saves routing defaults, guards in-flight submission, stores confirmation/error. |
| `packages/workspace/src/components/SchedulePanel.tsx` | Workspace scheduling UI | VERIFIED | Channel grouping, defaults, queue/exact controls, disabled states, progress, error and success UI exist. |
| `packages/workspace/src/pages/Editor.tsx` | SchedulePanel wiring | VERIFIED | `useSchedule` and `SchedulePanel` are mounted for image output. |
| `src/components/admin/pixel-badge.tsx` / `history-table.tsx` | Scheduled badge visibility | VERIFIED | Scheduled status is typed and rendered. |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| Workspace UI | local CLI route | `schedulePost()` posts `/api/local/schedule` | VERIFIED | `packages/workspace/src/api.ts` exports the local schedule helper and `useSchedule` calls it. |
| CLI route | CLI resolver | `localScheduleRoute()` calls `resolveAndSchedule()` | VERIFIED | Route is registered before backend proxy in `packages/cli/src/server.ts:460-471`. |
| CLI resolver | Backend upload-url route | Bearer `POST /api/v1/schedule/upload-url` | VERIFIED | `schedule-resolver.ts:151-156`. |
| CLI resolver | R2 upload | `fetch(upload.uploadUrl, { method:"PUT" })` | VERIFIED | `schedule-resolver.ts:127-138`. |
| CLI resolver | Backend schedule route | Bearer `POST /api/v1/schedule` after PUTs | VERIFIED | `schedule-resolver.ts:172-180`. |
| Backend schedule route | Convex schedule action | `convex.action(api.schedulePush.run, { userId: auth.userId, ...payload })` | WARNING | Wired, but target action is public and trusts userId if called directly. |
| Convex schedule action | Buffer | `pushToBuffer()` | FAILED | Wired, but external posts happen before durable release attempt, allowing orphaned provider posts. |
| Convex schedule action | Admin gallery release | `internal.releases.insertScheduled` | VERIFIED | Inserts scheduled release on full success only. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---|---|---|---|---|
| `SchedulePanel.tsx` | `channels`, `selected`, `confirmation` | `fetchIntegrations()`, `fetchRoutingDefaults()`, `useSchedule.confirmation` | Yes | FLOWING |
| `useSchedule.ts` | `confirmation`, `error`, `phase` | `schedulePost()` response/errors | Yes | FLOWING |
| `schedule-resolver.ts` | `urls`, `keys`, `confirmation` | Backend presign response, R2 PUT success, backend schedule response | Yes for normal CLI flow | FLOWING |
| `src/app/api/v1/schedule/route.ts` | `urls`, `keys` | Request body | Not proven trustworthy | HOLLOW - URL/key relationship is not derived or enforced |
| `convex/schedulePush.ts` | `apiKey`, `providerPosts`, `releaseId` | sealed credential query, Buffer response, release insert | Partial | HOLLOW - direct public userId trust and failed fanout can disconnect provider posts from release state |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Phase 7 targeted tests | `rtk proxy npx vitest run src/lib/integrations/__tests__/push.test.ts convex/__tests__/schedulePush.test.ts src/app/api/v1/schedule/__tests__/route.test.ts packages/cli/src/__tests__/schedule-route.test.ts packages/workspace/src/hooks/__tests__/useSchedule.test.ts packages/workspace/src/__tests__/schedule-panel.test.tsx packages/workspace/src/__tests__/editor-flow.test.tsx` | 7 files passed, 47 tests passed | PASS |
| Probe discovery | `rg`/`find` probe scan | No Phase 7 probe scripts found; only a human checkpoint in `07-05-PLAN.md` | SKIP |

### Probe Execution

| Probe | Command | Result | Status |
|---|---|---|---|
| None discovered for Phase 7 | N/A | Step 7c skipped | SKIP |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| SCHED-01 | 07-05 | User can connect Buffer via OAuth in the admin | WARNING | Existing integration fetch path lets connected Buffer channels appear; real OAuth connection remains external/manual UAT. |
| SCHED-02 | 07-03, 07-04, 07-05 | User can pick which Buffer channels a creation posts to, in the Workspace | SATISFIED | `SchedulePanel` renders selectable Buffer channel rows by format. |
| SCHED-03 | 07-01, 07-03, 07-04, 07-05 | User can schedule exact date/time or next queue slot | SATISFIED | Queue/custom scheduling is implemented through UI, CLI, API, and Buffer primitive. |
| SCHED-04 | 07-01, 07-02, 07-03, 07-04, 07-05 | On schedule, rendered file uploads to R2 and public URL is sent to Buffer | BLOCKED | Normal CLI path uploads first, but backend does not prove URL/key correspondence and provider fanout is not durable/atomic on partial failure. |
| SCHED-05 | 07-02, 07-03, 07-04, 07-05 | User sees confirmation when scheduling succeeds | SATISFIED | `SchedulePanel` renders success confirmation rows. |
| SCHED-06 | 07-02, 07-05 | Scheduled creations are marked as scheduled and visible in admin gallery | SATISFIED | Schema/release insertion/admin badge support `scheduled`. |

No orphaned Phase 7 requirement IDs were found in `.planning/REQUIREMENTS.md`; SCHED-01 through SCHED-06 are all claimed by Phase 7 plans and accounted for above.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---:|---|---|---|
| `convex/schedulePush.ts` | 55 | Public `action()` for sensitive provider write path | BLOCKER | Violates project security rule to keep sensitive write paths internal or derive user identity server-side. |
| `convex/schedulePush.ts` | 99 | External provider side effect before durable scheduled release attempt | BLOCKER | Allows orphaned Buffer posts and duplicate posts on retry. |
| `src/app/api/v1/schedule/route.ts` | 138 | Caller-supplied media URL accepted independently from R2 key | BLOCKER | HEAD-check can prove one object while Buffer receives a different URL. |

Debt-marker scan found no unreferenced `TBD`, `FIXME`, or `XXX` blockers in the Phase 7 modified files.

### Human Verification Required

The plan contains a manual Buffer UAT checkpoint for connecting Buffer, rendering images, queue scheduling, exact-time scheduling, Admin badge visibility, and missing-file failure behavior. Because blocking code gaps exist, human UAT should be rerun after the gaps are fixed rather than used to override them.

### Gaps Summary

Phase 7 has a real implementation of the Workspace panel, CLI upload orchestration, R2 presign path, Buffer scheduling fields, confirmation UI, and Admin scheduled badge. The goal is still not achieved because the backend scheduling boundary is not trustworthy or atomic enough for the stated schedule-time upload/posting contract.

The advisory code review findings CR-01 and CR-02 are confirmed against the current code. WR-01 is also confirmed and affects SCHED-04 because the URL sent to Buffer is not proven to be the public URL for the HEAD-checked R2 object.

---

_Verified: 2026-05-22T06:31:53Z_
_Verifier: the agent (gsd-verifier)_
