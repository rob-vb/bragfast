"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import posthog from "posthog-js";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { SocialButtons } from "../components/social-buttons";
import { isLaunchModeRepositioned } from "@/lib/launch-mode";

const POST_SIGNUP_REPOSITIONED = "/welcome/install-warning";
const POST_SIGNUP_LEGACY = "/admin";

export default function SignupPage() {
  const repositioned = isLaunchModeRepositioned();
  const searchParams = useSearchParams();
  const cameFromPreview = searchParams?.get("source") === "preview";
  const callbackURL = repositioned ? POST_SIGNUP_REPOSITIONED : POST_SIGNUP_LEGACY;

  if (repositioned) {
    return (
      <RepositionedSignup
        callbackURL={callbackURL}
        cameFromPreview={cameFromPreview}
      />
    );
  }
  return <LegacySignup callbackURL={callbackURL} />;
}

function RepositionedSignup({
  callbackURL,
  cameFromPreview,
}: {
  callbackURL: string;
  cameFromPreview: boolean;
}) {
  const [showEmail, setShowEmail] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleGitHub() {
    setError("");
    setLoading(true);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(
          "bf_signup_meta",
          JSON.stringify({ signup_source: cameFromPreview ? "preview" : "direct", came_from_preview: cameFromPreview }),
        );
      } catch {
        /* ignore */
      }
    }
    const { error: err } = await authClient.signIn.social({
      provider: "github",
      callbackURL,
    });
    if (err) {
      setError(err.message ?? "GitHub sign-in failed");
      setLoading(false);
    }
  }

  return (
    <>
      <div className="border-[3px] border-brand shadow-[6px_6px_0_var(--color-brand)]">
        <div className="bg-brand text-gold px-4 py-3 font-mono text-xs uppercase tracking-widest">
          ▸ Sign up with GitHub
        </div>
        <div className="p-5 sm:p-6 space-y-5">
          <p className="text-sm text-brand/70 leading-relaxed">
            brag.fast watches your GitHub merges and drafts a post. Sign in with GitHub so the install lands on the same account.
          </p>

          <button
            type="button"
            onClick={handleGitHub}
            disabled={loading}
            className="flex w-full items-center justify-center gap-3 border-2 border-brand bg-gold px-4 py-3 font-mono text-sm uppercase tracking-widest font-bold text-brand shadow-[3px_3px_0_var(--color-brand)] transition-all hover:shadow-[2px_2px_0_var(--color-brand)] hover:translate-x-[1px] hover:translate-y-[1px] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg width="20" height="20" viewBox="0 0 18 18" fill="currentColor" aria-hidden>
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M9 0C4.03 0 0 4.03 0 9c0 3.978 2.579 7.35 6.154 8.54.45.082.616-.195.616-.432 0-.214-.008-.78-.012-1.531-2.503.544-3.032-1.206-3.032-1.206-.41-1.04-1-1.317-1-1.317-.816-.558.062-.546.062-.546.903.063 1.378.927 1.378.927.803 1.375 2.107.978 2.62.748.081-.581.314-.978.571-1.203-1.998-.227-4.1-1-4.1-4.448 0-.983.351-1.786.927-2.416-.093-.228-.402-1.143.088-2.382 0 0 .756-.242 2.475.923A8.631 8.631 0 0 1 9 4.365c.765.004 1.535.103 2.254.303 1.718-1.165 2.472-.923 2.472-.923.492 1.24.183 2.154.09 2.382.577.63.926 1.433.926 2.416 0 3.458-2.105 4.218-4.11 4.44.323.278.611.828.611 1.668 0 1.203-.011 2.175-.011 2.472 0 .24.163.519.62.431C15.424 16.347 18 12.975 18 9c0-4.97-4.03-9-9-9Z"
              />
            </svg>
            {loading ? "Redirecting…" : "Continue with GitHub"}
          </button>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="button"
            onClick={() => setShowEmail((v) => !v)}
            className="text-xs text-brand/50 underline underline-offset-4 hover:text-brand"
          >
            {showEmail ? "Hide email signup" : "Use email instead (advanced)"}
          </button>

          {showEmail && (
            <div className="pt-2">
              <EmailSignupForm
                callbackURL={callbackURL}
                cameFromPreview={cameFromPreview}
              />
            </div>
          )}
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-brand/60">
        Already have an account?{" "}
        <Link href="/login" className="text-brand font-bold hover:underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </>
  );
}

function EmailSignupForm({
  callbackURL,
  cameFromPreview,
}: {
  callbackURL: string;
  cameFromPreview: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) return setError("Passwords do not match");
    if (!agreed) return setError("You must agree to the Terms of Service and Privacy Policy");
    setLoading(true);
    const { error: err } = await authClient.signUp.email({
      name,
      email,
      password,
      callbackURL,
    });
    setLoading(false);
    if (err) return setError(err.message ?? "Something went wrong");
    posthog.capture("signup_completed", {
      signup_source: cameFromPreview ? "preview" : "direct",
      came_from_preview: cameFromPreview,
    });
    router.push(callbackURL);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FieldRow label="Name" id="name">
        <Input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
      </FieldRow>
      <FieldRow label="Email" id="email">
        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
      </FieldRow>
      <FieldRow label="Password" id="password">
        <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
      </FieldRow>
      <FieldRow label="Confirm password" id="confirm-password">
        <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required autoComplete="new-password" />
      </FieldRow>
      <div className="flex items-start gap-3">
        <Checkbox id="terms" checked={agreed} onCheckedChange={(c) => setAgreed(c === true)} className="mt-0.5" />
        <label htmlFor="terms" className="text-sm leading-snug text-brand/70">
          I agree to the{" "}
          <Link href="/terms" className="text-brand underline underline-offset-4">Terms</Link>{" "}and{" "}
          <Link href="/privacy" className="text-brand underline underline-offset-4">Privacy</Link>
        </label>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-white text-brand border-2 border-brand px-4 py-2.5 font-mono text-xs uppercase tracking-widest font-bold shadow-[3px_3px_0_var(--color-brand)] transition-all hover:shadow-[2px_2px_0_var(--color-brand)] hover:translate-x-[1px] hover:translate-y-[1px] disabled:opacity-50"
      >
        {loading ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}

function FieldRow({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-bold text-brand">
        {label}
      </label>
      {children}
    </div>
  );
}

function LegacySignup({ callbackURL }: { callbackURL: string }) {
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
    if (password !== confirmPassword) return setError("Passwords do not match");
    if (!agreed) return setError("You must agree to the Terms of Service and Privacy Policy");
    setLoading(true);
    const { error: err } = await authClient.signUp.email({ name, email, password, callbackURL });
    setLoading(false);
    if (err) return setError(err.message ?? "Something went wrong");
    posthog.capture("signup_completed", { signup_source: "direct", came_from_preview: false });
    router.push(callbackURL);
  }

  return (
    <>
      <div className="border-[3px] border-brand shadow-[6px_6px_0_var(--color-brand)]">
        <div className="bg-brand text-gold px-4 py-3 font-mono text-xs uppercase tracking-widest">
          ▸ Create account
        </div>
        <div className="p-5 sm:p-6 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-5">
            <FieldRow label="Name" id="name">
              <Input id="name" type="text" placeholder="Jane Smith" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
            </FieldRow>
            <FieldRow label="Email" id="email">
              <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </FieldRow>
            <FieldRow label="Password" id="password">
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
            </FieldRow>
            <FieldRow label="Confirm password" id="confirm-password">
              <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required autoComplete="new-password" />
            </FieldRow>
            <div className="flex items-start gap-3">
              <Checkbox id="terms" checked={agreed} onCheckedChange={(c) => setAgreed(c === true)} className="mt-0.5" />
              <label htmlFor="terms" className="text-sm leading-snug text-brand/70">
                I agree to the{" "}
                <Link href="/terms" className="text-brand underline underline-offset-4">Terms of Service</Link>{" "}and{" "}
                <Link href="/privacy" className="text-brand underline underline-offset-4">Privacy Policy</Link>
              </label>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gold text-brand border-2 border-brand px-4 py-2.5 font-mono text-xs uppercase tracking-widest font-bold shadow-[3px_3px_0_var(--color-brand)] transition-all hover:shadow-[2px_2px_0_var(--color-brand)] hover:translate-x-[1px] hover:translate-y-[1px] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
            >
              {loading ? "Creating account..." : "▸ Get started"}
            </button>
          </form>
          <SocialButtons />
        </div>
      </div>
      <p className="mt-6 text-center text-sm text-brand/60">
        Already have an account?{" "}
        <Link href="/login" className="text-brand font-bold hover:underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </>
  );
}
