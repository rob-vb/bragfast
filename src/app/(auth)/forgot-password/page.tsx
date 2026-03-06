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
        <h1 className="font-[family-name:var(--font-press-start)] text-2xl leading-relaxed text-[#4A3326]">Check your email</h1>
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
      <h1 className="font-[family-name:var(--font-press-start)] text-2xl leading-relaxed text-[#4A3326]">
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
