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
