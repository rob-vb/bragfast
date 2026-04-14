# Resend Email Integration Design

## Overview

Add Resend as email provider for bragfast. Two emails: welcome email on signup, password reset email for forgot-password flow. Build the missing `/reset-password` page.

## Architecture

All email rendering + sending happens on the Next.js side. Convex triggers emails via a protected internal API route.

```
Signup:
  Client → authClient.signUp.email() → success → server action → Resend (welcome)

Forgot password:
  Client → authClient.requestPasswordReset()
    → Convex Better Auth generates token + calls sendResetPassword
    → sendResetPassword → fetch(/api/internal/send-email) → Resend

Reset password:
  User clicks email link → /reset-password?token=xxx
    → new password form → authClient.resetPassword({ token, newPassword })
```

### Why Convex can't send emails directly

Better Auth runs inside Convex's V8 isolate. React Email templates require Node.js/Next.js to render. So `sendResetPassword` in `convex/auth.ts` calls a Next.js internal API route that handles rendering + sending.

## Dependencies

- `resend` — SDK for sending
- `@react-email/components` — template components (Html, Head, Body, Container, Text, Button, etc.)
- `@react-email/render` — renders React Email components to HTML strings

## Environment Variables

| Var | Where | Value |
|-----|-------|-------|
| `RESEND_API_KEY` | Next.js `.env.local` | Already set |
| `RESEND_FROM_EMAIL` | Next.js `.env.local` | `noreply@brag.fast` |
| `INTERNAL_API_SECRET` | Next.js `.env.local` + Convex env | Random 32-byte base64 string |

## New Files

### `src/lib/emails/components/layout.tsx`

Shared branded email layout wrapping all emails:
- White background, centered container (max 560px)
- brag.fast text logo at top
- Brand colors: brown text, gold accent/buttons
- Footer: "brag.fast — Ship your wins."
- System font stack (email-safe)
- Consistent padding, mobile-friendly

### `src/lib/emails/welcome.tsx`

- Subject: "Welcome to brag.fast!"
- Body: "Hey {name}, you're in." + short one-liner + CTA button → `/admin`
- Short, no onboarding essay

### `src/lib/emails/reset-password.tsx`

- Subject: "Reset your password"
- Body: "Hey, we got a request to reset your password." + CTA button → reset URL with token + "If you didn't request this, ignore this email." + expiry note
- No name personalization (only email available at this point)

### `src/lib/email.ts`

Email render + send utility:

```ts
export async function sendWelcomeEmail(to: string, name: string): Promise<void>
export async function sendResetPasswordEmail(to: string, resetUrl: string): Promise<void>
```

- Creates Resend client with `RESEND_API_KEY`
- Renders React Email template to HTML via `@react-email/render`
- Sends via `resend.emails.send()`
- From: `RESEND_FROM_EMAIL` (`noreply@brag.fast`)

### `src/app/api/internal/send-email/route.ts`

Internal API route for Convex to trigger emails:

```ts
POST /api/internal/send-email
Authorization: Bearer <INTERNAL_API_SECRET>

{
  type: "welcome" | "reset-password",
  to: string,
  data: {
    name?: string,       // welcome
    resetUrl?: string,   // reset-password
  }
}

→ { success: true } | { error: string }
```

- Validates `Authorization` header against `INTERNAL_API_SECRET` using `crypto.timingSafeEqual` (prevents timing attacks)
- Routes to appropriate send function from `src/lib/email.ts`
- Returns JSON response

### `src/lib/actions/send-welcome-email.ts`

Server action:

```ts
"use server"
export async function sendWelcomeEmailAction(): Promise<void>
```

- Verifies the caller is authenticated via session (gets user email + name from session, not from params — prevents abuse as a spam vector)
- Calls `sendWelcomeEmail()` from `src/lib/email.ts`
- Called from signup page after successful `authClient.signUp.email()`

### `src/app/(auth)/reset-password/page.tsx`

New page in `(auth)` route group, same NES card styling:

1. `"use client"` component, reads `token` via `useSearchParams()` (wrap in `Suspense` boundary)
2. No token → "Invalid or expired link" + link to `/forgot-password`
3. Form: new password + confirm password (with match validation)
4. Submit → `authClient.resetPassword({ token, newPassword })`
5. Success → "Password updated" confirmation + "Back to login" link (no auto-redirect)
6. Error → inline error message; expired token error should guide user back to `/forgot-password` to request a new link

## Modified Files

### `convex/auth.ts`

Add `sendResetPassword` to `emailAndPassword` config:

```ts
emailAndPassword: {
  enabled: true,
  requireEmailVerification: false,
  sendResetPassword: async ({ user, url }) => {
    // Note: siteUrl (process.env.SITE_URL) must be the Next.js app origin
    // (e.g. https://bragfast.app), NOT the Convex site URL.
    try {
      const res = await fetch(`${siteUrl}/api/internal/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.INTERNAL_API_SECRET}`,
        },
        body: JSON.stringify({
          type: "reset-password",
          to: user.email,
          data: { resetUrl: url },
        }),
      });
      if (!res.ok) {
        console.error("Failed to send reset email:", res.status, await res.text());
      }
    } catch (err) {
      console.error("Failed to send reset email:", err);
    }
  },
},
```

### `src/app/(auth)/signup/page.tsx`

After successful signup (before `router.push("/admin")`):

```ts
import { sendWelcomeEmailAction } from "@/lib/actions/send-welcome-email";

// After authClient.signUp.email() succeeds:
sendWelcomeEmailAction().catch(() => {}); // fire-and-forget, don't block navigation
router.push("/admin");
```

Fire-and-forget — don't block navigation on email delivery. The server action reads user info from the session (no client params).

## Not in Scope

- Email verification flow (can add later)
- Email preferences / unsubscribe management
- Email preview/dev server (`react-email dev`)
- Retry logic for failed sends
- Email analytics / open tracking
- Email send logging / audit trail
