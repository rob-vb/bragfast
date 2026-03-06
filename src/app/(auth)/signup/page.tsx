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
      <h1 className="font-[family-name:var(--font-press-start)] text-2xl leading-relaxed text-[#4A3326]">
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
