"use client";

import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await authClient.requestPasswordReset({
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
        {/* NES Card */}
        <div className="border-[3px] border-brand shadow-[6px_6px_0_var(--color-brand)]">
          {/* Header bar */}
          <div className="bg-brand text-gold px-4 py-3 font-mono text-xs uppercase tracking-widest">
            ▸ Check your email
          </div>

          {/* Body */}
          <div className="p-5 sm:p-6">
            <p className="text-sm text-brand/70 leading-relaxed">
              If an account exists for <strong className="text-brand">{email}</strong>,
              we&apos;ve sent a password reset link.
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

  return (
    <>
      {/* NES Card */}
      <div className="border-[3px] border-brand shadow-[6px_6px_0_var(--color-brand)]">
        {/* Header bar */}
        <div className="bg-brand text-gold px-4 py-3 font-mono text-xs uppercase tracking-widest">
          ▸ Reset password
        </div>

        {/* Form body */}
        <div className="p-5 sm:p-6 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-bold text-brand">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gold text-brand border-2 border-brand px-4 py-2.5 font-mono text-xs uppercase tracking-widest font-bold shadow-[3px_3px_0_var(--color-brand)] transition-all hover:shadow-[2px_2px_0_var(--color-brand)] hover:translate-x-[1px] hover:translate-y-[1px] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
            >
              {loading ? "Sending..." : "▸ Send reset link"}
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
