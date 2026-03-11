"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

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
      callbackURL: "/dashboard",
    });

    setLoading(false);

    if (error) {
      setError(error.message ?? "Something went wrong");
      return;
    }

    router.push("/dashboard");
  }

  return (
    <>
      {/* NES Card */}
      <div className="border-[3px] border-brand shadow-[6px_6px_0_var(--color-brand)]">
        {/* Header bar */}
        <div className="bg-brand text-gold px-4 py-3 font-mono text-xs uppercase tracking-widest">
          ▸ Create account
        </div>

        {/* Form body */}
        <div className="p-5 sm:p-6 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="name" className="block text-sm font-bold text-brand">
                Name
              </label>
              <input
                id="name"
                type="text"
                placeholder="Jane Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
                className="w-full border-2 border-brand bg-white px-3 py-2 text-sm text-brand placeholder:text-brand/40 outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-bold text-brand">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full border-2 border-brand bg-white px-3 py-2 text-sm text-brand placeholder:text-brand/40 outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-bold text-brand">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full border-2 border-brand bg-white px-3 py-2 text-sm text-brand placeholder:text-brand/40 outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="confirm-password" className="block text-sm font-bold text-brand">
                Confirm password
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="w-full border-2 border-brand bg-white px-3 py-2 text-sm text-brand placeholder:text-brand/40 outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
              />
            </div>

            <div className="flex items-start gap-3">
              <input
                id="terms"
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 border-2 border-brand appearance-none checked:bg-gold checked:border-brand cursor-pointer relative checked:after:content-['✓'] checked:after:absolute checked:after:inset-0 checked:after:flex checked:after:items-center checked:after:justify-center checked:after:text-brand checked:after:text-xs checked:after:font-bold"
              />
              <label htmlFor="terms" className="text-sm leading-snug text-brand/70">
                I agree to the{" "}
                <Link href="/terms" className="text-brand underline underline-offset-4">Terms of Service</Link>
                {" "}and{" "}
                <Link href="/privacy" className="text-brand underline underline-offset-4">Privacy Policy</Link>
              </label>
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gold text-brand border-2 border-brand px-4 py-2.5 font-mono text-xs uppercase tracking-widest font-bold shadow-[3px_3px_0_var(--color-brand)] transition-all hover:shadow-[2px_2px_0_var(--color-brand)] hover:translate-x-[1px] hover:translate-y-[1px] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
            >
              {loading ? "Creating account..." : "▸ Get started"}
            </button>
          </form>
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-brand/60">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-brand font-bold hover:underline underline-offset-4"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}
