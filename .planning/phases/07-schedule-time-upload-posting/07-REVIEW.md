---
phase: 07-schedule-time-upload-posting
reviewed: 2026-05-22T07:04:23Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - convex/__tests__/schedulePush.test.ts
  - convex/releases.ts
  - convex/schedulePush.ts
  - src/app/api/v1/schedule/__tests__/route.test.ts
  - src/app/api/v1/schedule/route.ts
  - src/lib/storage/r2.ts
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
status: clean
---

# Phase 07: Code Review Report

**Reviewed:** 2026-05-22T07:04:23Z
**Depth:** standard
**Files Reviewed:** 6
**Status:** clean

## Summary

Reviewed the Phase 7 gap-closure changes for schedule-time posting:

- `schedulePush.run` now rejects missing or invalid route-generated HMAC proof before R2 HEAD checks, Buffer credential reads, or provider side effects.
- `/api/v1/schedule` validates selected keys against `scheduled/{auth.userId}/{draftId}/{format}.jpg`, derives Buffer media URLs via `publicUrlForKey`, and ignores caller-supplied media URLs.
- Scheduled release attempts are created before Buffer pushes, provider posts are recorded immediately after success, failures preserve recorded posts, and retries skip already-recorded `{format, provider, channelId}` posts.
- Regression tests cover the prior critical and warning findings: direct public action abuse, URL tampering, invalid schedule keys, partial Buffer failure durability, and retry idempotency.

## Findings

No issues found.

## Previous Findings Resolved

- **CR-01:** Public Convex action trust boundary now requires short-lived `INTERNAL_API_SECRET` HMAC proof and rejects unauthorized direct calls before side effects.
- **CR-02:** Partial Buffer success is now durable because release attempts are pending before provider calls and each providerPostId is recorded immediately.
- **WR-01:** Schedule route no longer trusts client-provided media URLs; it derives canonical R2 public URLs from authenticated keys.

## Verification Evidence

- `npx vitest run convex/__tests__/schedulePush.test.ts src/app/api/v1/schedule/__tests__/route.test.ts` - passed.
- `npx vitest run src/lib/integrations/__tests__/push.test.ts packages/cli/src/__tests__/schedule-route.test.ts packages/workspace/src/hooks/__tests__/useSchedule.test.ts` - passed.
- `npm run build` - passed.
