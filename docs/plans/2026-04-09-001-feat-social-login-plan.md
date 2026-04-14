---
title: "feat: Add Google and GitHub social login"
type: feat
status: active
date: 2026-04-09
---

# feat: Add Google and GitHub social login

## Overview

Add Google and GitHub OAuth as sign-in options alongside existing email/password auth. Layout inspired by Convex's login page: email/password form on top, "OR" divider, social buttons below. Auto-link accounts when the OAuth email matches an existing user.

## Problem Frame

Email/password is the only auth method. Indie hackers (bragfast's ICP) overwhelmingly use GitHub and Google daily. Social login reduces signup friction and eliminates password fatigue.

## Requirements Trace

- R1. Users can sign in / sign up with Google OAuth
- R2. Users can sign in / sign up with GitHub OAuth
- R3. Social buttons appear on both login and signup pages
- R4. Layout: email/password form, then "OR" divider, then social buttons (Convex-style)
- R5. Accounts auto-link when OAuth email matches existing email/password account
- R6. Maintain existing NES/retro design language (hard shadows, brand colors, mono font)
- R7. Social login redirects to `/admin` on success (same as email flow)

## Scope Boundaries

- No Apple, Twitter, or other providers
- No "link account" UI in settings (just auto-link on login)
- No changes to API key auth or the public API
- No email verification changes

## Context & Research

### Relevant Code and Patterns

- `convex/auth.ts` — `betterAuth()` config, currently email/password only
- `convex/http.ts` — already registers auth routes via `authComponent.registerRoutes(http, createAuth)`
- `src/app/api/auth/[...all]/route.ts` — Next.js catch-all proxy, already handles `/api/auth/callback/*`
- `src/lib/auth-client.ts` — `createAuthClient()`, social sign-in built into base client
- `src/app/(auth)/login/page.tsx` — NES card with email/password form
- `src/app/(auth)/signup/page.tsx` — NES card with name/email/password form
- `src/app/(auth)/layout.tsx` — split layout (gold panel + form panel)

### External References

- better-auth social providers: top-level `socialProviders` key in `betterAuth()` config
- Client API: `authClient.signIn.social({ provider: "google", callbackURL: "/admin" })`
- Account linking: `account.accountLinking.enabled: true` with `trustedProviders` array
- OAuth callback URLs auto-handled: `{SITE_URL}/api/auth/callback/{provider}`

## Key Technical Decisions

- **`socialProviders` (not plugin)**: better-auth v1.4 uses a top-level `socialProviders` key, not a separate plugin
- **Auto-link with trusted providers**: Google and GitHub both verify emails, safe to auto-link. Config: `account.accountLinking.enabled: true, trustedProviders: ["email-password", "google", "github"]`
- **Shared `SocialButtons` component**: Extract social buttons into a shared component used by both login and signup pages to avoid duplication
- **NES-styled social buttons**: Match existing button style (border-brand, hard shadow, mono font) but use provider brand colors for the icons only
- **No changes to auth-client.ts**: `signIn.social()` is built into the base `createAuthClient()` — no plugins needed client-side

## Open Questions

### Resolved During Planning

- **Account linking strategy**: Auto-link via trusted providers (user confirmed)
- **Which pages get social buttons**: Both login and signup (user confirmed)
- **Callback URL routing**: Already handled — Next.js catch-all at `/api/auth/[...all]` proxies to Convex, no new routes needed

### Deferred to Implementation

- **Google/GitHub OAuth app credentials**: User must create OAuth apps in Google Cloud Console and GitHub Developer Settings and add env vars to Convex
- **Provider icon rendering**: SVG inline vs image — decide during implementation based on what looks cleanest in the NES style

## Implementation Units

- [ ] **Unit 1: Add social providers to Convex auth config**

  **Goal:** Enable Google and GitHub OAuth on the server side with account linking

  **Requirements:** R1, R2, R5

  **Dependencies:** None (but env vars must be set before testing)

  **Files:**
  - Modify: `convex/auth.ts`

  **Approach:**
  - Add `socialProviders.google` and `socialProviders.github` with `clientId`/`clientSecret` from env vars
  - Add `account.accountLinking` config with `enabled: true` and `trustedProviders: ["email-password", "google", "github"]`
  - No changes needed to `convex/http.ts`, `convex/auth.config.ts`, or the Next.js catch-all route

  **Patterns to follow:**
  - Existing `emailAndPassword` config shape in `convex/auth.ts`

  **Test scenarios:**
  - Happy path: Server starts without errors when social provider env vars are set
  - Error path: Graceful behavior when env vars are missing (better-auth should warn, not crash)

  **Verification:**
  - `npx convex dev` runs without errors
  - OAuth callback routes are registered (visible in better-auth logs)

- [ ] **Unit 2: Create shared SocialButtons component**

  **Goal:** Reusable component with Google and GitHub buttons in NES style

  **Requirements:** R4, R6

  **Dependencies:** Unit 1

  **Files:**
  - Create: `src/app/(auth)/components/social-buttons.tsx`

  **Approach:**
  - "OR" divider: horizontal rule with centered "OR" text, matching brand colors
  - Two buttons: "Continue with Google" and "Continue with GitHub" with provider icons (inline SVG)
  - Each button calls `authClient.signIn.social({ provider, callbackURL: "/admin" })`
  - Loading state per button (disable both while one is in-flight)
  - Error state for OAuth failures
  - NES button styling: border-brand, hard shadow, mono font — but outlined/ghost variant to visually distinguish from the primary submit button
  - Provider icons: small Google "G" and GitHub octocat SVGs, provider brand colors

  **Patterns to follow:**
  - Button styling from `login/page.tsx` lines 97-103 (but ghost/outlined variant)
  - `authClient.signIn.email()` pattern for the social equivalent

  **Test scenarios:**
  - Happy path: Clicking Google button calls `authClient.signIn.social({ provider: "google", callbackURL: "/admin" })`
  - Happy path: Clicking GitHub button calls `authClient.signIn.social({ provider: "github", callbackURL: "/admin" })`
  - Edge case: Both buttons disabled while OAuth redirect is in progress
  - Error path: OAuth error displays inline error message

  **Verification:**
  - Component renders in both login and signup pages
  - Buttons visually match NES design language
  - Clicking triggers OAuth redirect to provider

- [ ] **Unit 3: Add social login to login page**

  **Goal:** Login page shows email/password form, "OR" divider, then social buttons

  **Requirements:** R3, R4, R7

  **Dependencies:** Unit 2

  **Files:**
  - Modify: `src/app/(auth)/login/page.tsx`

  **Approach:**
  - Import `SocialButtons` component
  - Place it after the email/password form's submit button, inside the NES card
  - Layout: form → social buttons (component includes the "OR" divider)

  **Patterns to follow:**
  - Existing form structure in `login/page.tsx`

  **Test scenarios:**
  - Happy path: Login page renders email form + divider + social buttons
  - Happy path: Email login still works as before
  - Integration: Social button triggers OAuth flow and redirects to `/admin` on success

  **Verification:**
  - Visual inspection matches Convex-style layout
  - Email/password login unaffected
  - Social login redirects correctly

- [ ] **Unit 4: Add social login to signup page**

  **Goal:** Signup page shows social buttons below the form

  **Requirements:** R3, R4, R7

  **Dependencies:** Unit 2

  **Files:**
  - Modify: `src/app/(auth)/signup/page.tsx`

  **Approach:**
  - Import `SocialButtons` component
  - Place it after the form's submit button, inside the NES card
  - Same layout as login: form → social buttons

  **Patterns to follow:**
  - Login page integration from Unit 3

  **Test scenarios:**
  - Happy path: Signup page renders form + divider + social buttons
  - Happy path: Email signup still works as before
  - Integration: Social button triggers OAuth flow, creates account, redirects to `/admin`

  **Verification:**
  - Visual inspection matches login page's social section
  - Email/password signup unaffected

## System-Wide Impact

- **Interaction graph:** OAuth callback hits existing `/api/auth/[...all]` catch-all → Convex `betterAuth` handler → creates/links account → creates session → redirects to `/admin`
- **Error propagation:** OAuth errors surface via better-auth's error handling, displayed inline on the auth page
- **State lifecycle risks:** Account linking — if Google/GitHub email doesn't match, a new `userProfiles` record is needed. The existing signup flow already handles this via Convex triggers/hooks
- **API surface parity:** No API changes — social login is browser-only, API keys remain the programmatic auth method
- **Unchanged invariants:** API key auth, session auth for admin pages, rate limiting — all unchanged

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Env vars not set in Convex | Document required vars; better-auth warns on missing provider config |
| GitHub doesn't always verify email | GitHub is in `trustedProviders` — acceptable risk for indie hacker audience. Can restrict later if needed |
| OAuth app misconfiguration (wrong callback URL) | Document exact callback URLs: `{SITE_URL}/api/auth/callback/google` and `/github` |

## Setup Notes

Before testing, the user must:
1. Create a Google OAuth app in Google Cloud Console (authorized redirect: `{SITE_URL}/api/auth/callback/google`)
2. Create a GitHub OAuth app in GitHub Developer Settings (callback URL: `{SITE_URL}/api/auth/callback/github`)
3. Add env vars to Convex: `AUTH_GOOGLE_CLIENT_ID`, `AUTH_GOOGLE_CLIENT_SECRET`, `AUTH_GITHUB_CLIENT_ID`, `AUTH_GITHUB_CLIENT_SECRET`
