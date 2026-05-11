"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import posthog from "posthog-js";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { SocialButtons } from "../components/social-buttons";

const POST_SIGNUP = "/admin";

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupPageInner />
    </Suspense>
  );
}

function SignupPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cameFromPreview = searchParams?.get("source") === "preview";
  const { data: session, isPending } = authClient.useSession();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isPending && session) {
      router.replace(POST_SIGNUP);
    }
  }, [isPending, session, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) return setError("Passwords do not match");
    if (!agreed) return setError("You must agree to the Terms of Service and Privacy Policy");
    setLoading(true);
    const { error: err } = await authClient.signUp.email({
      name,
      email,
      password,
      callbackURL: POST_SIGNUP,
    });
    setLoading(false);
    if (err) return setError(err.message ?? "Something went wrong");
    posthog.capture("signup_completed", {
      signup_source: cameFromPreview ? "preview" : "direct",
      came_from_preview: cameFromPreview,
    });
    router.push(POST_SIGNUP);
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
