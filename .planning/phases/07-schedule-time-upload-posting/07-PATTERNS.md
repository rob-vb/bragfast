---
phase: 07-schedule-time-upload-posting
created: 2026-05-21
status: ready
---

# Phase 07 Pattern Map

## Route Handler Patterns

| New file | Closest analog | Pattern to reuse |
|----------|----------------|------------------|
| `src/app/api/v1/schedule/upload-url/route.ts` | `src/app/api/v1/routing-defaults/route.ts` | `authenticate(request)` first, JSON parse guard, explicit body validation, `Response.json(...)` errors |
| `src/app/api/v1/schedule/route.ts` | `src/app/api/v1/sous-chef/integrations/route.ts` | Route authenticates, then calls `ConvexHttpClient` action with trusted `userId`; no secret leaves backend |

## Buffer Push Patterns

| File | Existing behavior | Required extension |
|------|-------------------|--------------------|
| `src/lib/integrations/buffer/push.ts` | `pushToBuffer()` builds `CreatePostInput` with `schedulingType: "automatic"` and `mode: "addToQueue"` | Add optional `scheduling` param: queue keeps `mode:"addToQueue"`; exact time sends `mode:"customScheduled"` and UTC ISO `dueAt` |
| `src/lib/integrations/__tests__/push.test.ts` | Mocks `bufferGraphQL` and inspects mutation variables | Add tests for `addToQueue` and `customScheduled` + `dueAt` |

## Convex Patterns

| New/modified file | Closest analog | Pattern to reuse |
|-------------------|----------------|------------------|
| `convex/schedulePush.ts` | `convex/pushFanout.ts` | `"use node"` action imports Node-only helpers, unseals provider key via internal query, classifies provider errors |
| `convex/releases.ts` | `createAndScheduleVideo()` | Transactional release insertion via mutation; add scheduled-specific insertion rather than patching unrelated status paths |
| `convex/__tests__/schedulePush.test.ts` | `convex/__tests__/pushFanout.test.ts` | `convex-test` with mocked `secret-box`, R2 `headObject`, and Buffer `pushToBuffer` |

## CLI Patterns

| New/modified file | Closest analog | Pattern to reuse |
|-------------------|----------------|------------------|
| `packages/cli/src/schedule-resolver.ts` | `packages/cli/src/render-resolver.ts` | Use `credentials.api_key`, `BRAG_API_BASE`, `outputDir`, stdout progress lines, explicit local file paths |
| `packages/cli/src/server.ts` | `localRenderRoute()` / `localRevealRoute()` | Register local-only `/api/local/*` before the catch-all backend proxy; validate unsafe IDs before reading output paths |
| `packages/cli/src/__tests__/schedule-route.test.ts` | `video-render-route.test.ts` | Supertest route coverage with mocked resolver; assert local route returns progress/status and rejects traversal |

## Workspace Patterns

| New/modified file | Closest analog | Pattern to reuse |
|-------------------|----------------|------------------|
| `packages/workspace/src/hooks/useSchedule.ts` | `packages/workspace/src/hooks/useRender.ts`, `useVideoRender.ts` | Flush before submit, guarded in-flight trigger, terminal success/error state |
| `packages/workspace/src/components/SchedulePanel.tsx` | `RenderPanel.tsx`, `FormatSwitcher.tsx` | `rounded-[8px]` panel, `min-h-[44px]` controls, lime CTA/focus ring, 12px labels |
| `packages/workspace/src/pages/Editor.tsx` | Current render panel wiring | Mount schedule panel near RenderPanel, pass caption/active format/render job state, keep relative API URLs only |

## Admin Patterns

| File | Current pattern | Required extension |
|------|-----------------|--------------------|
| `src/components/admin/pixel-badge.tsx` | `statusStyles` map + union props | Add `scheduled: "bg-blue-400 text-white"` and `status: "scheduled"` union member |
| `src/components/admin/history-table.tsx` | `Release.status` union drives `PixelBadge` | Add `scheduled`; existing download guard `status !== "completed"` keeps scheduled rows non-downloadable |
