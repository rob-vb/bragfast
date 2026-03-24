# Bragfast MCP Server — Implementation Plan

## Context

Bragfast has a stable REST API for generating release images/videos but is invisible to the MCP ecosystem. This plan creates a thin MCP client package that wraps the API, distributed via 3 channels (Desktop Extension, Claude Code plugin marketplace, npx). Design doc: `~/.gstack/projects/rob-vb-bragfast/henk-rob-vb/video-gen-review-design-20260324-132523.md`.

## Eng Review Decisions

These override the design doc where they differ:

1. **All renders are async** — both images AND video return `cook_id` immediately (no sync polling). The `/bragfast` skill auto-calls `get_render_status` so users still get seamless UX. Avoids MCP client timeout issues.
2. **Auth: env var + separate login command** — `npx @bragfast/mcp-server login` opens browser and stores key in `~/.bragfast/credentials.json`. MCP server reads stored key at runtime. No browser auth during MCP server startup. Lazy check on first tool call — returns error with dashboard link if no key found.
3. **No N+1 on list_templates** — `GET /templates` already returns full config with object IDs. Single API call.
4. **New `GET /api/v1/account` route** in main app — returns `{ credits_remaining, plan }` via API key auth.
5. **CI/CD included** — GitHub Actions for test on PR, npm publish + mcpb build on tag.

## Architecture

```
User types in Claude
  ↓
/bragfast skill (Claude Code plugin) OR direct tool call
  ↓
MCP Server (stdio, runs locally via npx)
  ↓ HTTP calls with Bearer API key
Bragfast API (POST /cook, GET /cook/{id}, GET /brands, etc.)
  ↓
Convex backend + R2 storage + Remotion Lambda
```

## Deliverables

### Repo 1: `rob-vb/bragfast-mcp` (npm package)

```
src/
  index.ts                    # MCP server entry, tool registration
  cli.ts                      # CLI entry: "login" and "logout" subcommands
  tools/
    generate-images.ts        # POST /cook → return cook_id immediately
    generate-video.ts         # POST /cook (video=true) → return cook_id immediately
    list-brands.ts            # GET /brands
    list-templates.ts         # GET /templates (single call, full config)
    check-account.ts          # GET /account
    render-status.ts          # GET /cook/{id}
  lib/
    api-client.ts             # HTTP client: auth header, base URL, error mapping
    auth.ts                   # resolveApiKey: env → credentials → error
    credentials.ts            # read/write ~/.bragfast/credentials.json (chmod 600)
    types.ts                  # Subset of bragfast types (ReleaseRequest, etc.)
manifest.json                 # MCPB manifest for Desktop Extension
package.json                  # engines: node>=18, bin: bragfast-mcp
tsconfig.json
.github/workflows/
  ci.yml                      # Test on PR
  release.yml                 # npm publish + mcpb pack on tag
__tests__/
  api-client.test.ts          # Mocked fetch: success, 401, 429, 500, network error
  auth.test.ts                # Env var, stored creds, missing key
  credentials.test.ts         # Read/write/corrupt/missing file
  generate-images.test.ts     # Tool input → API call → response mapping
  generate-video.test.ts      # Video-specific: duration, og rejection
  render-status.test.ts       # Pending, completed, failed, invalid ID
  list-brands.test.ts         # Normal + empty list
  list-templates.test.ts      # Returns config with object IDs
  check-account.test.ts       # Credits + plan info
```

### Repo 2: `rob-vb/bragfast-plugins` (Claude Code marketplace)

```
.claude-plugin/
  marketplace.json            # Marketplace catalog
plugins/
  bragfast-mcp/
    .claude-plugin/
      plugin.json             # Plugin manifest
    skills/
      bragfast/
        SKILL.md              # /bragfast guided workflow
    mcpServers config (references npx @bragfast/mcp-server)
```

### Repo 3: Main bragfast app (1 change)

- **New route**: `src/app/api/v1/account/route.ts` — add `GET` handler
  - Auth: `validateApiKey(request)`
  - Query: `fetchQuery(api.userProfiles.getBalance, { userId })`
  - Response: `{ credits_remaining: number, plan: string }`
  - ~15 lines of code

## 6 Tools (v1)

| Tool | API Call | Behavior |
|------|----------|----------|
| `bragfast_generate_release_images` | POST /cook | Returns cook_id immediately. Skill auto-polls. |
| `bragfast_generate_release_video` | POST /cook (video=true) | Returns cook_id immediately. |
| `bragfast_list_brands` | GET /brands | Returns brand list. |
| `bragfast_list_templates` | GET /templates | Returns templates with full config (object IDs). |
| `bragfast_check_account` | GET /account | Returns credits + plan. |
| `bragfast_get_render_status` | GET /cook/{id} | Returns status + URLs when complete. |

## Auth Flow

```
Tool call arrives
  ↓
Check BRAGFAST_API_KEY env var → found? use it
  ↓ not found
Check ~/.bragfast/credentials.json → found? use it
  ↓ not found
Return error: "Not authenticated. Run: npx @bragfast/mcp-server login
              Or set BRAGFAST_API_KEY env var.
              Create a key at: https://bragfast.com/dashboard/api-keys"
```

**Login command** (`npx @bragfast/mcp-server login`):
1. Start temp HTTP server on random localhost port
2. Open browser to `https://bragfast.com/auth/mcp?callback=http://localhost:{port}/callback`
3. User logs in via Better Auth
4. Backend auto-creates API key, redirects to callback with key
5. Store in `~/.bragfast/credentials.json` (chmod 600)
6. Print "Authenticated! You can now use bragfast in Claude."

**Note**: The `/auth/mcp` route in the main app is deferred to when we implement the login command. For initial v1, env var is the only auth path. Login command is v1.1.

## /bragfast Skill Flow

```
User: /bragfast
  ↓
Skill: "What do you want to create?"
  ↓
User: "Release images for v2.3.0" or pastes GitHub URL
  ↓
Skill: calls list_brands, list_templates → presents options
  ↓
User: picks brand + template
  ↓
Skill: reads release notes, composes slides (extracts top features,
       writes title/description per slide, maps object IDs from template config)
  ↓
Skill: calls generate_release_images → gets cook_id
  ↓
Skill: calls get_render_status (may need 1-3 calls at 5s intervals)
  ↓
Skill: shows image URLs + credits used
  ↓
Skill: "Want video too? Different formats?"
```

## Implementation Order

1. **Main app change**: Add GET handler to `/api/v1/account` (~15 lines)
2. **MCP package**: Scaffold repo, implement 6 tools + api-client + auth + types
3. **Tests**: Unit tests with mocked fetch for all tools + auth + credentials
4. **CI/CD**: GitHub Actions workflows (ci.yml, release.yml)
5. **Distribution**: manifest.json for .mcpb, package.json bin field for npx
6. **Plugin marketplace**: Scaffold bragfast-plugins repo with marketplace.json + plugin.json + SKILL.md
7. **Publish**: npm publish, mcpb pack, push marketplace repo

## NOT in scope

| Item | Rationale |
|------|-----------|
| CRUD tools (create/update/delete brand/template) | Deferred to v2 — not needed for acquisition wedge |
| MCP Resources | Duplicate list tools, add complexity |
| Browser auth in MCP server startup | Deferred — login command handles it separately |
| Remote Streamable HTTP server | Deferred — npx covers all MCP clients for now |
| `bragfast_create_template` | Too complex for MCP tool input |
| `bragfast_upload_image` | Requires base64 encoding, deferred to v2 |

## What already exists

| Existing code | Reused? |
|---------------|---------|
| `src/lib/types.ts` (ReleaseRequest, ReleaseResult, Brand, etc.) | Types copied to MCP package |
| `src/lib/validation.ts` (hex color, format validation) | Not needed — API validates server-side |
| `POST /api/v1/cook` | Called by generate_images and generate_video tools |
| `GET /api/v1/cook/[id]` | Called by get_render_status tool |
| `GET /api/v1/brands` | Called by list_brands tool |
| `GET /api/v1/templates` | Called by list_templates tool (includes full config) |
| `POST /api/v1/api-keys` | Used by login command to auto-create key |
| Better Auth at `/api/auth/[...all]` | Used by /auth/mcp route for session check |

## Failure Modes

| Failure | Test? | Error handling? | User sees? |
|---------|-------|-----------------|------------|
| API key revoked (401) | Yes | Delete stored creds, return auth error | Clear message + link |
| Rate limited (429) | Yes | Pass through retry-after | "Try again in N seconds" |
| Insufficient credits | Yes | Pass through credit error | Credits needed/remaining + billing link |
| Render fails | Yes | Return error + refund info | "Render failed. Credits refunded." |
| Network error (fetch throws) | Yes | Catch and return connection error | "Cannot reach bragfast API" |
| Invalid cook_id | Yes | Return 404 | "Render not found" |
| credentials.json corrupted | Yes | Fall back to env var or error | Falls through to next auth method |
| Node < 18 | Yes | Check process.version at startup | "Node 18+ required" |

No critical gaps — all failure modes have tests and error handling.

## Verification

1. **Unit tests**: `npm test` in MCP repo — all tools, auth, credentials, api-client
2. **Manual test**: Install via npx, set `BRAGFAST_API_KEY`, call each tool from Claude Code
3. **Skill test**: Run `/bragfast` in Claude Code with the plugin installed, generate images
4. **Distribution test**: `mcpb pack` produces valid .mcpb, `npm publish --dry-run` succeeds
5. **CI test**: Push PR to MCP repo, verify GitHub Actions runs tests

## Completion Summary

- Step 0: Scope Challenge — scope accepted as-is (greenfield package, no existing code to reduce)
- Architecture Review: 3 issues found (auth timing, N+1 templates, CI/CD gap)
- Code Quality Review: 0 issues (greenfield)
- Test Review: diagram produced, 30 gaps identified (all greenfield — tests planned for every path)
- Performance Review: 0 issues
- NOT in scope: written (6 items deferred)
- What already exists: written (8 existing code paths reused)
- TODOS.md updates: 0 items (no existing TODOS.md)
- Failure modes: 0 critical gaps (all 8 failure modes have tests + error handling)
- Outside voice: ran (claude subagent) — found 8 issues, 4 substantive changes adopted
- Lake Score: 7/7 recommendations chose complete option

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | — | — |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | — | — |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 2 | CLEAR (PLAN) | 7 issues, 0 critical gaps |
| Design Review | `/plan-design-review` | UI/UX gaps | 0 | — | — |

- **OUTSIDE VOICE:** Claude subagent found 8 issues. 4 adopted: async images, simplified auth, no N+1, missing account endpoint. 4 acknowledged but not acted on (strategic direction confirmed by user).
- **UNRESOLVED:** 0
- **VERDICT:** ENG CLEARED — ready to implement
