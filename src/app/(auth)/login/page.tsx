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
      callbackURL: "/dashboard",
    });

    setLoading(false);

    if (error) {
      setError(error.message ?? "Invalid email or password");
      return;
    }

    router.push("/dashboard");
  }

  return (
    <>
      <h1 className="font-[family-name:var(--font-press-start)] text-2xl leading-relaxed text-[#4A3326]">Welcome back</h1>
      <p className="mt-2 text-sm text-[#4A3326]/60">
        Sign in to your Bragfast account
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
