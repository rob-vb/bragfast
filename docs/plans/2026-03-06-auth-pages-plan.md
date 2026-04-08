# Auth Pages Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build login, signup, and forgot-password pages with split-screen layout and brag.fast brand styling.

**Architecture:** Next.js App Router `(auth)` route group with shared split-screen layout. Custom forms call better-auth client SDK directly. shadcn/ui for form primitives.

**Tech Stack:** Next.js 16 App Router, better-auth/react client, shadcn/ui (button, input, label, checkbox), Tailwind CSS v4

---

### Task 1: Install shadcn components

**Files:**
- Create: `src/components/ui/button.tsx` (auto-generated)
- Create: `src/components/ui/input.tsx` (auto-generated)
- Create: `src/components/ui/label.tsx` (auto-generated)
- Create: `src/components/ui/checkbox.tsx` (auto-generated)

**Step 1: Install shadcn components**

Run:
```bash
npx shadcn@latest add button input label checkbox -y
```

Expected: Components created in `src/components/ui/`

**Step 2: Verify installation**

Run:
```bash
ls src/components/ui/
```

Expected: `button.tsx checkbox.tsx input.tsx label.tsx`

**Step 3: Commit**

```bash
git add src/components/ui/ src/lib/utils.ts
git commit -m "chore: install shadcn button, input, label, checkbox components"
```

---

### Task 2: Save logo SVG + create auth client

**Files:**
- Create: `public/logo-icon.svg`
- Create: `src/lib/auth-client.ts`

**Step 1: Save the brag.fast icon logo SVG**

Save the icon-only SVG (provided by user) to `public/logo-icon.svg`. This is the smaller SVG (451x467 viewBox).

**Step 2: Create the better-auth client**

Create `src/lib/auth-client.ts`:

```typescript
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
});
```

Note: `createAuthClient` from `better-auth/react` provides `signIn.email()`, `signUp.email()`, `forgetPassword()`, and reactive hooks like `useSession()`. The `baseURL` tells the client where the auth API routes live. Adjust the env var name if the project uses a different convention.

**Step 3: Verify it compiles**

Run:
```bash
npx tsc --noEmit src/lib/auth-client.ts 2>&1 | head -20
```

If there's a module resolution issue, just verify the import path is correct for better-auth v1.4.

**Step 4: Commit**

```bash
git add public/logo-icon.svg src/lib/auth-client.ts
git commit -m "feat: add logo SVG and better-auth client"
```

---

### Task 3: Auth layout (split-screen shell)

**Files:**
- Create: `src/app/(auth)/layout.tsx`

**Step 1: Create the split-screen layout**

Create `src/app/(auth)/layout.tsx`:

```tsx
import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Branded panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center bg-[#F8AF3C]">
        <Image
          src="/logo-icon.svg"
          alt="brag.fast"
          width={160}
          height={166}
          priority
        />
      </div>

      {/* Form panel */}
      <div className="flex w-full lg:w-1/2 items-center justify-center bg-[#F9F6ED] px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-8 flex justify-center lg:hidden">
            <Image
              src="/logo-icon.svg"
              alt="brag.fast"
              width={64}
              height={66}
              priority
            />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
```

Key details:
- `lg:w-1/2` splits at the `lg` breakpoint (1024px)
- Branded panel uses `hidden lg:flex` — completely hidden on mobile
- Mobile gets a small logo above the form instead
- Form panel is centered with `max-w-md` container
- `bg-[#F8AF3C]` for amber panel, `bg-[#F9F6ED]` for cream form panel

**Step 2: Verify the layout renders**

Run:
```bash
npm run dev
```

Visit `http://localhost:3000` — the root page still works (it uses the root layout, not the auth layout). The auth layout will be used once we add pages inside `(auth)/`.

**Step 3: Commit**

```bash
git add src/app/\(auth\)/layout.tsx
git commit -m "feat: add split-screen auth layout"
```

---

### Task 4: Login page

**Files:**
- Create: `src/app/(auth)/login/page.tsx`

**Step 1: Create the login page**

Create `src/app/(auth)/login/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await authClient.signIn.email({
      email,
      password,
      callbackURL: "/admin",
    });

    setLoading(false);

    if (error) {
      setError(error.message ?? "Invalid email or password");
      return;
    }

    router.push("/admin");
  }

  return (
    <>
      <h1 className="text-3xl font-bold text-[#4A3326]">Welcome back</h1>
      <p className="mt-2 text-sm text-[#4A3326]/60">
        Sign in to your brag.fast account
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-[#4A3326]">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="border-[#4A3326]/20 bg-white text-[#4A3326] placeholder:text-[#4A3326]/40 focus-visible:ring-[#F8AF3C]"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-[#4A3326]">
              Password
            </Label>
            <Link
              href="/forgot-password"
              className="text-sm text-[#4A3326]/60 hover:text-[#4A3326] underline-offset-4 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="border-[#4A3326]/20 bg-white text-[#4A3326] placeholder:text-[#4A3326]/40 focus-visible:ring-[#F8AF3C]"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-[#F8AF3C] text-[#4A3326] font-semibold hover:bg-[#F8AF3C]/90 focus-visible:ring-[#F8AF3C]"
        >
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[#4A3326]/60">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="text-[#4A3326] font-medium hover:underline underline-offset-4"
        >
          Create an account
        </Link>
      </p>
    </>
  );
}
```

**Step 2: Verify it renders**

Run dev server, visit `http://localhost:3000/login`. Should see split-screen with amber left panel and login form on the right. On mobile viewport, the left panel should be hidden and a small logo appears above the form.

**Step 3: Commit**

```bash
git add src/app/\(auth\)/login/page.tsx
git commit -m "feat: add login page"
```

---

### Task 5: Signup page

**Files:**
- Create: `src/app/(auth)/signup/page.tsx`

**Step 1: Create the signup page**

Create `src/app/(auth)/signup/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!agreed) {
      setError("You must agree to the Terms of Service and Privacy Policy");
      return;
    }

    setLoading(true);

    const { error } = await authClient.signUp.email({
      name,
      email,
      password,
      callbackURL: "/admin",
    });

    setLoading(false);

    if (error) {
      setError(error.message ?? "Something went wrong");
      return;
    }

    router.push("/admin");
  }

  return (
    <>
      <h1 className="text-3xl font-bold text-[#4A3326]">
        Create your account
      </h1>
      <p className="mt-2 text-sm text-[#4A3326]/60">
        Start generating branded images in minutes
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-[#4A3326]">
            Name
          </Label>
          <Input
            id="name"
            type="text"
            placeholder="Jane Smith"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
            className="border-[#4A3326]/20 bg-white text-[#4A3326] placeholder:text-[#4A3326]/40 focus-visible:ring-[#F8AF3C]"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-[#4A3326]">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="border-[#4A3326]/20 bg-white text-[#4A3326] placeholder:text-[#4A3326]/40 focus-visible:ring-[#F8AF3C]"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-[#4A3326]">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            className="border-[#4A3326]/20 bg-white text-[#4A3326] placeholder:text-[#4A3326]/40 focus-visible:ring-[#F8AF3C]"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password" className="text-[#4A3326]">
            Confirm password
          </Label>
          <Input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
            className="border-[#4A3326]/20 bg-white text-[#4A3326] placeholder:text-[#4A3326]/40 focus-visible:ring-[#F8AF3C]"
          />
        </div>

        <div className="flex items-start gap-3">
          <Checkbox
            id="terms"
            checked={agreed}
            onCheckedChange={(checked) => setAgreed(checked === true)}
            className="mt-0.5 border-[#4A3326]/30 data-[state=checked]:bg-[#F8AF3C] data-[state=checked]:border-[#F8AF3C] data-[state=checked]:text-[#4A3326]"
          />
          <Label
            htmlFor="terms"
            className="text-sm leading-snug text-[#4A3326]/70 font-normal"
          >
            I agree to the{" "}
            <Link
              href="/terms"
              className="text-[#4A3326] underline underline-offset-4"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              className="text-[#4A3326] underline underline-offset-4"
            >
              Privacy Policy
            </Link>
          </Label>
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-[#F8AF3C] text-[#4A3326] font-semibold hover:bg-[#F8AF3C]/90 focus-visible:ring-[#F8AF3C]"
        >
          {loading ? "Creating account..." : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[#4A3326]/60">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-[#4A3326] font-medium hover:underline underline-offset-4"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}
```

**Step 2: Verify it renders**

Visit `http://localhost:3000/signup`. Check form renders with all fields, checkbox, and links.

**Step 3: Commit**

```bash
git add src/app/\(auth\)/signup/page.tsx
git commit -m "feat: add signup page"
```

---

### Task 6: Forgot password page

**Files:**
- Create: `src/app/(auth)/forgot-password/page.tsx`

**Step 1: Create the forgot password page**

Create `src/app/(auth)/forgot-password/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await authClient.forgetPassword({
      email,
      redirectTo: "/reset-password",
    });

    setLoading(false);

    if (error) {
      setError(error.message ?? "Something went wrong");
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <>
        <h1 className="text-3xl font-bold text-[#4A3326]">Check your email</h1>
        <p className="mt-3 text-sm text-[#4A3326]/60 leading-relaxed">
          If an account exists for <strong className="text-[#4A3326]">{email}</strong>,
          we&apos;ve sent a password reset link.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm text-[#4A3326] font-medium hover:underline underline-offset-4"
        >
          &larr; Back to login
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 className="text-3xl font-bold text-[#4A3326]">
        Reset your password
      </h1>
      <p className="mt-2 text-sm text-[#4A3326]/60">
        Enter your email and we&apos;ll send you a reset link
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-[#4A3326]">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="border-[#4A3326]/20 bg-white text-[#4A3326] placeholder:text-[#4A3326]/40 focus-visible:ring-[#F8AF3C]"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-[#F8AF3C] text-[#4A3326] font-semibold hover:bg-[#F8AF3C]/90 focus-visible:ring-[#F8AF3C]"
        >
          {loading ? "Sending..." : "Send reset link"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[#4A3326]/60">
        <Link
          href="/login"
          className="text-[#4A3326] font-medium hover:underline underline-offset-4"
        >
          &larr; Back to login
        </Link>
      </p>
    </>
  );
}
```

Note: `authClient.forgetPassword()` requires the server-side better-auth config to have a `sendResetPassword` email handler. The UI will work — the backend email sending is a separate task.

**Step 2: Verify it renders**

Visit `http://localhost:3000/forgot-password`. Form should render. Submitting will likely fail until server email is configured, but the UI flow (including success state) should be testable by temporarily setting `setSent(true)`.

**Step 3: Commit**

```bash
git add src/app/\(auth\)/forgot-password/page.tsx
git commit -m "feat: add forgot password page"
```

---

### Task 7: Visual polish + verify all pages

**Files:**
- Review: all `(auth)` pages

**Step 1: Run dev server and test all three pages**

Run:
```bash
npm run dev
```

Check each page at:
- `http://localhost:3000/login`
- `http://localhost:3000/signup`
- `http://localhost:3000/forgot-password`

Verify:
- Split-screen renders (branded amber panel left, cream form right)
- Mobile breakpoint hides left panel, shows small logo
- All links navigate between pages correctly
- Form fields have correct styling (white bg, brown border, amber focus ring)
- Buttons are amber with brown text
- Error states display correctly

**Step 2: Test form validation**

On signup:
- Leave fields empty, submit — browser validation fires
- Mismatched passwords — shows "Passwords do not match"
- Unchecked terms — shows agreement error

On login:
- Leave fields empty — browser validation fires

**Step 3: Take screenshots for review**

Use the browser at different viewport widths:
- Desktop (1440px+)
- Tablet (~768px — branded panel should still be hidden, shows at lg/1024px)
- Mobile (~375px)

**Step 4: Commit any adjustments**

```bash
git add -A
git commit -m "feat: polish auth pages"
```

---

### Summary

| Task | Description | Files |
|------|------------|-------|
| 1 | Install shadcn components | `src/components/ui/*` |
| 2 | Logo SVG + auth client | `public/logo-icon.svg`, `src/lib/auth-client.ts` |
| 3 | Split-screen auth layout | `src/app/(auth)/layout.tsx` |
| 4 | Login page | `src/app/(auth)/login/page.tsx` |
| 5 | Signup page | `src/app/(auth)/signup/page.tsx` |
| 6 | Forgot password page | `src/app/(auth)/forgot-password/page.tsx` |
| 7 | Visual polish + verify | All auth files |

### Known follow-ups (not in scope)
- Server-side email sending for password reset
- `/reset-password` page (token-based, after user clicks email link)
- `/terms` and `/privacy` pages (linked from signup checkbox)
- Post-login `/admin` page
