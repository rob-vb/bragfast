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
        <h1 className="font-[family-name:var(--font-press-start)] text-2xl leading-relaxed text-brand">Check your email</h1>
        <p className="mt-3 text-sm text-brand/60 leading-relaxed">
          If an account exists for <strong className="text-brand">{email}</strong>,
          we&apos;ve sent a password reset link.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm text-brand font-medium hover:underline underline-offset-4"
        >
          &larr; Back to login
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 className="font-[family-name:var(--font-press-start)] text-2xl leading-relaxed text-brand">
        Reset your password
      </h1>
      <p className="mt-2 text-sm text-brand/60">
        Enter your email and we&apos;ll send you a reset link
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-brand">
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
            className="border-brand/20 bg-white text-brand placeholder:text-brand/40 focus-visible:ring-gold"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-gold text-brand font-semibold hover:bg-gold/90 focus-visible:ring-gold"
        >
          {loading ? "Sending..." : "Send reset link"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-brand/60">
        <Link
          href="/login"
          className="text-brand font-medium hover:underline underline-offset-4"
        >
          &larr; Back to login
        </Link>
      </p>
    </>
  );
}
