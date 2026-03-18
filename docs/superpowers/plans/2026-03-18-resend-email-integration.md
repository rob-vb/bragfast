# Resend Email Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Resend email sending for welcome emails on signup and password reset emails for forgot-password flow.

**Architecture:** All email rendering + sending on Next.js side. Convex triggers password reset emails via a protected internal API route. Welcome email sent via server action after signup. New `/reset-password` page completes the forgot-password flow.

**Tech Stack:** Resend, React Email, Better Auth (Convex), Next.js 16 App Router

**Spec:** `docs/superpowers/specs/2026-03-18-resend-email-integration-design.md`

---

### Task 1: Install dependencies + set env vars

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install packages**

```bash
npm install resend @react-email/components @react-email/render
```

- [ ] **Step 2: Add env vars to `.env.local`**

Add to `.env.local` (RESEND_API_KEY already set):

```
RESEND_FROM_EMAIL=noreply@brag.fast
INTERNAL_API_SECRET=<run: openssl rand -base64 32>
```

- [ ] **Step 3: Set INTERNAL_API_SECRET in Convex**

```bash
npx convex env set INTERNAL_API_SECRET <same value as .env.local>
```

- [ ] **Step 4: Verify dev server starts**

```bash
npm run dev
```

Expected: no import errors, app loads.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add resend and react-email dependencies"
```

---

### Task 2: Shared email layout component

**Files:**
- Create: `src/lib/emails/components/layout.tsx`

- [ ] **Step 1: Create the layout component**

```tsx
import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
  Hr,
} from "@react-email/components";
import * as React from "react";

interface EmailLayoutProps {
  preview: string;
  children: React.ReactNode;
}

export function EmailLayout({ preview, children }: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          {/* Logo / brand */}
          <Section style={logoSection}>
            <Text style={logoText}>brag.fast</Text>
          </Section>

          {/* Content */}
          <Section style={content}>{children}</Section>

          {/* Footer */}
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              brag.fast — Ship your wins.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const body: React.CSSProperties = {
  backgroundColor: "#f6f6f6",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  margin: "0",
  padding: "0",
};

const container: React.CSSProperties = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  maxWidth: "560px",
  padding: "0",
};

const logoSection: React.CSSProperties = {
  backgroundColor: "#3E2723",
  padding: "24px 32px",
};

const logoText: React.CSSProperties = {
  color: "#F2C94C",
  fontSize: "20px",
  fontWeight: "700",
  fontFamily: "monospace",
  margin: "0",
  letterSpacing: "1px",
};

const content: React.CSSProperties = {
  padding: "32px",
};

const hr: React.CSSProperties = {
  borderColor: "#e5e5e5",
  margin: "0",
};

const footer: React.CSSProperties = {
  padding: "24px 32px",
};

const footerText: React.CSSProperties = {
  color: "#999999",
  fontSize: "12px",
  margin: "0",
};
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/emails/components/layout.tsx
git commit -m "feat: add shared branded email layout component"
```

---

### Task 3: Welcome email template

**Files:**
- Create: `src/lib/emails/welcome.tsx`

- [ ] **Step 1: Create the welcome email template**

```tsx
import { Button, Text, Section } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/layout";

interface WelcomeEmailProps {
  name: string;
  dashboardUrl: string;
}

export function WelcomeEmail({ name, dashboardUrl }: WelcomeEmailProps) {
  return (
    <EmailLayout preview="Welcome to brag.fast!">
      <Text style={heading}>Welcome to brag.fast!</Text>
      <Text style={paragraph}>
        Hey {name}, you&apos;re in. Start sharing your wins with the world.
      </Text>
      <Section style={buttonContainer}>
        <Button style={button} href={dashboardUrl}>
          Go to dashboard
        </Button>
      </Section>
    </EmailLayout>
  );
}

export default WelcomeEmail;

const heading: React.CSSProperties = {
  color: "#3E2723",
  fontSize: "24px",
  fontWeight: "700",
  margin: "0 0 16px 0",
};

const paragraph: React.CSSProperties = {
  color: "#3E2723",
  fontSize: "16px",
  lineHeight: "1.5",
  margin: "0 0 24px 0",
};

const buttonContainer: React.CSSProperties = {
  textAlign: "center" as const,
};

const button: React.CSSProperties = {
  backgroundColor: "#F2C94C",
  borderRadius: "0px",
  border: "2px solid #3E2723",
  color: "#3E2723",
  display: "inline-block",
  fontFamily: "monospace",
  fontSize: "14px",
  fontWeight: "700",
  letterSpacing: "1px",
  padding: "12px 24px",
  textDecoration: "none",
  textTransform: "uppercase" as const,
};
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/emails/welcome.tsx
git commit -m "feat: add welcome email template"
```

---

### Task 4: Reset password email template

**Files:**
- Create: `src/lib/emails/reset-password.tsx`

- [ ] **Step 1: Create the reset password email template**

```tsx
import { Button, Text, Section } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/layout";

interface ResetPasswordEmailProps {
  resetUrl: string;
}

export function ResetPasswordEmail({ resetUrl }: ResetPasswordEmailProps) {
  return (
    <EmailLayout preview="Reset your password">
      <Text style={heading}>Reset your password</Text>
      <Text style={paragraph}>
        Hey, we got a request to reset your password. Click the button below to
        choose a new one.
      </Text>
      <Section style={buttonContainer}>
        <Button style={button} href={resetUrl}>
          Reset password
        </Button>
      </Section>
      <Text style={muted}>
        If you didn&apos;t request this, you can safely ignore this email. The
        link will expire shortly.
      </Text>
    </EmailLayout>
  );
}

export default ResetPasswordEmail;

const heading: React.CSSProperties = {
  color: "#3E2723",
  fontSize: "24px",
  fontWeight: "700",
  margin: "0 0 16px 0",
};

const paragraph: React.CSSProperties = {
  color: "#3E2723",
  fontSize: "16px",
  lineHeight: "1.5",
  margin: "0 0 24px 0",
};

const buttonContainer: React.CSSProperties = {
  textAlign: "center" as const,
};

const button: React.CSSProperties = {
  backgroundColor: "#F2C94C",
  borderRadius: "0px",
  border: "2px solid #3E2723",
  color: "#3E2723",
  display: "inline-block",
  fontFamily: "monospace",
  fontSize: "14px",
  fontWeight: "700",
  letterSpacing: "1px",
  padding: "12px 24px",
  textDecoration: "none",
  textTransform: "uppercase" as const,
};

const muted: React.CSSProperties = {
  color: "#999999",
  fontSize: "13px",
  lineHeight: "1.5",
  margin: "24px 0 0 0",
};
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/emails/reset-password.tsx
git commit -m "feat: add reset password email template"
```

---

### Task 5: Email send utility

**Files:**
- Create: `src/lib/email.ts`

- [ ] **Step 1: Create the email send utility**

```ts
import { Resend } from "resend";
import { render } from "@react-email/render";
import { WelcomeEmail } from "./emails/welcome";
import { ResetPasswordEmail } from "./emails/reset-password";

const resend = new Resend(process.env.RESEND_API_KEY);
const from = process.env.RESEND_FROM_EMAIL ?? "noreply@brag.fast";

export async function sendWelcomeEmail(
  to: string,
  name: string,
): Promise<void> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const html = await render(WelcomeEmail({ name, dashboardUrl: `${siteUrl}/dashboard` }));

  await resend.emails.send({
    from,
    to,
    subject: "Welcome to brag.fast!",
    html,
  });
}

export async function sendResetPasswordEmail(
  to: string,
  resetUrl: string,
): Promise<void> {
  const html = await render(ResetPasswordEmail({ resetUrl }));

  await resend.emails.send({
    from,
    to,
    subject: "Reset your password",
    html,
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/email.ts
git commit -m "feat: add email send utility with Resend"
```

---

### Task 6: Internal email API route

**Files:**
- Create: `src/app/api/internal/send-email/route.ts`

- [ ] **Step 1: Create the internal API route**

```ts
import { NextRequest, NextResponse } from "next/server";
import { sendWelcomeEmail, sendResetPasswordEmail } from "@/lib/email";
import crypto from "crypto";

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const expectedToken = process.env.INTERNAL_API_SECRET;

  if (!expectedToken || !authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.replace("Bearer ", "");
  if (!timingSafeEqual(token, expectedToken)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { type, to, data } = body;

  try {
    switch (type) {
      case "welcome":
        await sendWelcomeEmail(to, data.name);
        break;
      case "reset-password":
        await sendResetPasswordEmail(to, data.resetUrl);
        break;
      default:
        return NextResponse.json(
          { error: `Unknown email type: ${type}` },
          { status: 400 },
        );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to send email:", err);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/internal/send-email/route.ts
git commit -m "feat: add internal email API route with timing-safe auth"
```

---

### Task 7: Welcome email server action + wire into signup

**Files:**
- Create: `src/lib/actions/send-welcome-email.ts`
- Modify: `src/app/(auth)/signup/page.tsx`

Reference: `src/lib/auth/get-session-user.ts` — uses `convexBetterAuthNextJs` to get session user.

- [ ] **Step 1: Create the server action**

```ts
"use server";

import { getSessionUser } from "@/lib/auth/get-session-user";
import { sendWelcomeEmail } from "@/lib/email";

export async function sendWelcomeEmailAction(): Promise<void> {
  const user = await getSessionUser();
  if (!user) return;

  try {
    await sendWelcomeEmail(user.email, user.name ?? "there");
  } catch (err) {
    console.error("Failed to send welcome email:", err);
  }
}
```

- [ ] **Step 2: Wire into signup page**

In `src/app/(auth)/signup/page.tsx`, add import at top:

```ts
import { sendWelcomeEmailAction } from "@/lib/actions/send-welcome-email";
```

Replace the success block (after `if (error) { ... return; }`):

```ts
// Fire-and-forget welcome email — don't block navigation
sendWelcomeEmailAction().catch(() => {});
router.push("/dashboard");
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/actions/send-welcome-email.ts src/app/\(auth\)/signup/page.tsx
git commit -m "feat: send welcome email on signup via server action"
```

---

### Task 8: Wire sendResetPassword in Convex auth

**Files:**
- Modify: `convex/auth.ts`

- [ ] **Step 1: Add sendResetPassword callback**

In `convex/auth.ts`, replace the `emailAndPassword` block:

```ts
emailAndPassword: {
  enabled: true,
  requireEmailVerification: false,
  sendResetPassword: async ({ user, url }) => {
    // siteUrl is process.env.SITE_URL — must be the Next.js app origin
    try {
      const res = await fetch(`${siteUrl}/api/internal/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.INTERNAL_API_SECRET}`,
        },
        body: JSON.stringify({
          type: "reset-password",
          to: user.email,
          data: { resetUrl: url },
        }),
      });
      if (!res.ok) {
        console.error(
          "Failed to send reset email:",
          res.status,
          await res.text(),
        );
      }
    } catch (err) {
      console.error("Failed to send reset email:", err);
    }
  },
},
```

- [ ] **Step 2: Verify Convex deploys**

```bash
npx convex dev
```

Expected: no errors, function deploys.

- [ ] **Step 3: Commit**

```bash
git add convex/auth.ts
git commit -m "feat: wire sendResetPassword to internal email API"
```

---

### Task 9: Reset password page

**Files:**
- Create: `src/app/(auth)/reset-password/page.tsx`

Reference: `src/app/(auth)/forgot-password/page.tsx` — match the NES card styling exactly.

- [ ] **Step 1: Create the reset password page**

```tsx
"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Input } from "@/components/ui/input";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <>
        <div className="border-[3px] border-brand shadow-[6px_6px_0_var(--color-brand)]">
          <div className="bg-brand text-gold px-4 py-3 font-mono text-xs uppercase tracking-widest">
            ▸ Invalid link
          </div>
          <div className="p-5 sm:p-6">
            <p className="text-sm text-brand/70 leading-relaxed">
              This password reset link is invalid or has expired.
            </p>
          </div>
        </div>
        <p className="mt-6 text-center text-sm text-brand/60">
          <Link
            href="/forgot-password"
            className="text-brand font-bold hover:underline underline-offset-4"
          >
            ← Request a new link
          </Link>
        </p>
      </>
    );
  }

  if (success) {
    return (
      <>
        <div className="border-[3px] border-brand shadow-[6px_6px_0_var(--color-brand)]">
          <div className="bg-brand text-gold px-4 py-3 font-mono text-xs uppercase tracking-widest">
            ▸ Password updated
          </div>
          <div className="p-5 sm:p-6">
            <p className="text-sm text-brand/70 leading-relaxed">
              Your password has been reset successfully.
            </p>
          </div>
        </div>
        <p className="mt-6 text-center text-sm text-brand/60">
          <Link
            href="/login"
            className="text-brand font-bold hover:underline underline-offset-4"
          >
            ← Back to login
          </Link>
        </p>
      </>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    const { error } = await authClient.resetPassword({
      newPassword: password,
      token: token!,
    });

    setLoading(false);

    if (error) {
      if (
        error.message?.toLowerCase().includes("expired") ||
        error.message?.toLowerCase().includes("invalid")
      ) {
        setError(
          "This link has expired. Please request a new one from the forgot password page.",
        );
      } else {
        setError(error.message ?? "Something went wrong");
      }
      return;
    }

    setSuccess(true);
  }

  return (
    <>
      <div className="border-[3px] border-brand shadow-[6px_6px_0_var(--color-brand)]">
        <div className="bg-brand text-gold px-4 py-3 font-mono text-xs uppercase tracking-widest">
          ▸ Set new password
        </div>
        <div className="p-5 sm:p-6 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-sm font-bold text-brand"
              >
                New password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="confirm-password"
                className="block text-sm font-bold text-brand"
              >
                Confirm password
              </label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gold text-brand border-2 border-brand px-4 py-2.5 font-mono text-xs uppercase tracking-widest font-bold shadow-[3px_3px_0_var(--color-brand)] transition-all hover:shadow-[2px_2px_0_var(--color-brand)] hover:translate-x-[1px] hover:translate-y-[1px] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
            >
              {loading ? "Updating..." : "▸ Set new password"}
            </button>
          </form>
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-brand/60">
        <Link
          href="/login"
          className="text-brand font-bold hover:underline underline-offset-4"
        >
          ← Back to login
        </Link>
      </p>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
```

- [ ] **Step 2: Verify page renders**

Visit `http://localhost:3000/reset-password` — should show "Invalid link" state (no token).
Visit `http://localhost:3000/reset-password?token=test` — should show the new password form.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(auth\)/reset-password/page.tsx
git commit -m "feat: add reset password page"
```

---

### Task 10: End-to-end manual test

- [ ] **Step 1: Test welcome email**

1. Sign up with a new account at `/signup`
2. Check Resend dashboard or inbox — "Welcome to brag.fast!" email should arrive
3. Verify you land on `/dashboard`

- [ ] **Step 2: Test forgot + reset password flow**

1. Go to `/forgot-password`, enter the email
2. Check inbox — "Reset your password" email should arrive
3. Click the reset link — should land on `/reset-password?token=...`
4. Enter new password + confirm, submit
5. Should see "Password updated" confirmation
6. Click "Back to login", log in with new password

- [ ] **Step 3: Test error states**

1. Visit `/reset-password` with no token — should show "Invalid link"
2. Visit `/reset-password?token=garbage` and submit — should show expired/invalid error guiding to `/forgot-password`

- [ ] **Step 4: Final commit if any adjustments needed**

```bash
git add -A
git commit -m "fix: adjustments from manual testing"
```
