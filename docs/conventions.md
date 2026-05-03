# Conventions

Codifies PRD §13. Authoritative for analytics naming and wiring. New events
must conform; deviations need a `docs/decisions.md` entry.

## PostHog naming

Non-negotiable:

- **Events**: `snake_case`, past-tense verbs (`signup_completed`, not `completeSignup` or `signup`).
- **Properties**: `snake_case`.
- **Property values**: lowercase strings, no spaces (`buffer`, not `Buffer`).
- **Booleans**: prefix with `is_` / `has_` / `was_` (`was_edited`, `is_first_draft_for_user`, `has_visual_asset`).
- **No PII** in event properties. Banned: emails, raw repo names, PR titles, post content, user-typed copy. Hash org/repo identifiers when needed (`org_name_hash` SHA-256).

## PostHog setup

- Person profiles **enabled**.
- Autocapture **disabled** (`src/components/posthog-provider.tsx`).
- `posthog.identify(userId, properties, propertiesSetOnce)` called on every admin mount (`src/components/admin/posthog-identifier.tsx`). Identify runs before any other capture in the session.
- Person properties (always set): `plan`, `github_app_installed`, `source_count`.
- Person properties (set-once): `signup_date`. Use the `$set_once` arg so existing users don't get backfilled.

## The 14 launch events

Source of truth: PRD §13. Each event lives in code at the boundary it
describes; do not capture from inside libs. List with property contracts:

| Event | Where it fires | Notes |
|-------|----------------|-------|
| `preview_repo_pasted` | preview surface paste handler | `repo_host`, `is_returning_visitor` |
| `preview_render_started` | preview render kickoff | `repo_host` |
| `preview_render_completed` | preview render finalize | `render_duration_ms`, `was_successful`, `failure_reason` |
| `signup_completed` | post-signup callback (email + OAuth) | guarded by `localStorage` so OAuth doesn't double-fire. `signup_source`, `came_from_preview` |
| `github_app_install_started` | install CTA click | no props |
| `github_app_installed` | post-install callback | `install_scope`, `repo_count`, `org_install` |
| `github_app_install_blocked` | install fails org policy | `block_reason`, `org_name_hash` |
| `draft_generated` | webhook → draft persisted | `trigger_type`, `source_type`, `confidence_score`, `was_suppressed`, `is_first_draft_for_user`, `has_visual_asset`, `platforms_targeted`, `formats_to_render`, `video_requested` |
| `post_approved` | approval → handoff | `trigger_type`, `was_edited`, `edit_type`, `time_from_draft_seconds`, `confidence_score`, `is_first_post_for_user`, `approval_surface`, `destination`, `formats_rendered`, `video_rendered`, `total_render_count` |
| `draft_skipped` | user skips a draft | `trigger_type`, `skip_reason`, `confidence_score`, `time_from_draft_seconds` |
| `draft_ignored` | server cron, 48h no action | `trigger_type`, `confidence_score`, `hours_since_draft` |
| `source_connected` | integration save | `source_type`, `is_first_non_github_source`, `total_sources_connected`, `was_prompted_by_goal` |
| `goal_set` | goal create | `goal_category`, `is_first_goal`, `has_connected_source` |
| `goal_hit` | goal threshold trip | `goal_category`, `days_from_goal_set` |
| `briefing_page_viewed` | `/admin/briefing` mount per ymd | `day` (YYYY-MM-DD), `event_count`, `drafted_count`, `skipped_count` |
| `weekly_report_page_viewed` | `/admin/report` mount per iso_week | `iso_week` (YYYY-Www), `event_count`, `has_draft` |

`post_approved` carries `approval_surface ∈ {"kitchen", "briefing", "weekly_report"}` so briefing/report sends are distinguishable without separate events.

## North Star dashboard

Four insights, 2x2 grid in PostHog. PRD §13. Built once after first events
flow in production; ownership = author of the launch checklist sweep.

## Adding new events

1. Confirm fit: does this answer a question the North Star can't already answer?
2. Name per rules above; past-tense verb.
3. Add a row to the table above with the property contract.
4. Capture from the boundary that owns the action — never from a shared lib.
5. PR description must call out the new event.

## Launch mode flag

`NEXT_PUBLIC_LAUNCH_MODE` = `"legacy"` | `"repositioned"`. Helper:
`src/lib/launch-mode.ts`. Defaults to `legacy` when unset. Render output
carries `data-launch-mode` on root layouts so the active mode is observable
in DOM during rollout.
