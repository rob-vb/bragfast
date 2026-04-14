"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9 0C4.03 0 0 4.03 0 9c0 3.978 2.579 7.35 6.154 8.54.45.082.616-.195.616-.432 0-.214-.008-.78-.012-1.531-2.503.544-3.032-1.206-3.032-1.206-.41-1.04-1-1.317-1-1.317-.816-.558.062-.546.062-.546.903.063 1.378.927 1.378.927.803 1.375 2.107.978 2.62.748.081-.581.314-.978.571-1.203-1.998-.227-4.1-1-4.1-4.448 0-.983.351-1.786.927-2.416-.093-.228-.402-1.143.088-2.382 0 0 .756-.242 2.475.923A8.631 8.631 0 0 1 9 4.365c.765.004 1.535.103 2.254.303 1.718-1.165 2.472-.923 2.472-.923.492 1.24.183 2.154.09 2.382.577.63.926 1.433.926 2.416 0 3.458-2.105 4.218-4.11 4.44.323.278.611.828.611 1.668 0 1.203-.011 2.175-.011 2.472 0 .24.163.519.62.431C15.424 16.347 18 12.975 18 9c0-4.97-4.03-9-9-9Z"
      />
    </svg>
  );
}

type Provider = "google" | "github";

export function SocialButtons() {
  const [loading, setLoading] = useState<Provider | null>(null);
  const [error, setError] = useState("");

  async function handleSocialLogin(provider: Provider) {
    setError("");
    setLoading(provider);

    const { error } = await authClient.signIn.social({
      provider,
      callbackURL: "/admin",
    });

    setLoading(null);

    if (error) {
      setError(error.message ?? `Failed to sign in with ${provider}`);
    }
  }

  return (
    <div className="space-y-4">
      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-brand/20" />
        <span className="text-xs font-mono uppercase tracking-widest text-brand/40">
          or
        </span>
        <div className="h-px flex-1 bg-brand/20" />
      </div>

      {/* Social buttons */}
      <div className="space-y-3">
        <button
          type="button"
          disabled={loading !== null}
          onClick={() => handleSocialLogin("google")}
          className="flex w-full items-center justify-center gap-3 border-2 border-brand bg-surface px-4 py-2.5 font-mono text-xs uppercase tracking-widest font-bold text-brand shadow-[3px_3px_0_var(--color-brand)] transition-all hover:shadow-[2px_2px_0_var(--color-brand)] hover:translate-x-[1px] hover:translate-y-[1px] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <GoogleIcon />
          {loading === "google" ? "Redirecting..." : "Continue with Google"}
        </button>

        <button
          type="button"
          disabled={loading !== null}
          onClick={() => handleSocialLogin("github")}
          className="flex w-full items-center justify-center gap-3 border-2 border-brand bg-surface px-4 py-2.5 font-mono text-xs uppercase tracking-widest font-bold text-brand shadow-[3px_3px_0_var(--color-brand)] transition-all hover:shadow-[2px_2px_0_var(--color-brand)] hover:translate-x-[1px] hover:translate-y-[1px] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <GitHubIcon />
          {loading === "github" ? "Redirecting..." : "Continue with GitHub"}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
