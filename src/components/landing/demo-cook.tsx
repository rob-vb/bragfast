"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";

type Phase = "idle" | "cooking" | "done" | "error";

const GITHUB_RELEASE_RE =
  /^https:\/\/github\.com\/[^/]+\/[^/]+\/releases\/tag\/.+$/;

export function DemoCook() {
  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [images, setImages] = useState<Record<
    string,
    { slides: string[]; dimensions: string }
  > | null>(null);
  const [cookId, setCookId] = useState("");

  const isValidUrl = GITHUB_RELEASE_RE.test(url.trim());

  const startCook = useCallback(async () => {
    setPhase("cooking");
    setProgress(10);
    setError("");
    setImages(null);

    try {
      const res = await fetch("/api/v1/demo-cook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Cook failed");
      }

      const { cook_id } = await res.json();
      setCookId(cook_id);
      setProgress(30);

      // Poll for completion
      const poll = async () => {
        const maxAttempts = 30; // 60 seconds max
        for (let i = 0; i < maxAttempts; i++) {
          await new Promise((r) => setTimeout(r, 2000));
          try {
            const pollRes = await fetch(`/api/v1/demo-cook/${cook_id}`);
            if (!pollRes.ok) continue;
            const data = await pollRes.json();
            if (data.status === "completed" && data.images) {
              setImages(data.images);
              setProgress(100);
              setPhase("done");
              return;
            }
            if (data.status === "failed") {
              throw new Error("Generation failed. Try a different release.");
            }
            setProgress((p) => Math.min(p + 5, 90));
          } catch (err) {
            if (err instanceof Error && err.message.includes("failed")) throw err;
          }
        }
        throw new Error("Timed out. Try again.");
      };

      await poll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setPhase("error");
    }
  }, [url]);

  const reset = () => {
    setPhase("idle");
    setProgress(0);
    setError("");
    setImages(null);
    setCookId("");
  };

  // Save cook_id to cookie for post-signup linking
  const signupUrl = cookId
    ? `/signup?demo_cook_id=${cookId}`
    : "/signup";

  // Store cook_id in cookie when done (for post-signup claiming)
  useEffect(() => {
    if (phase === "done" && cookId) {
      document.cookie = `demo_cook_id=${cookId};path=/;max-age=3600;SameSite=Lax`;
    }
  }, [phase, cookId]);

  if (phase === "done" && images) {
    return (
      <div className="space-y-6">
        {/* Image previews */}
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(images).map(([format, data]) => (
            <div key={format} className="space-y-2">
              <div className="border-2 border-brand shadow-[3px_3px_0_var(--color-brand)] overflow-hidden bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={data.slides[0]}
                  alt={`${format} preview`}
                  className="w-full h-auto"
                />
              </div>
              <p className="font-[family-name:var(--font-press-start)] text-[8px] text-brand/50 text-center uppercase">
                {format} &middot; {data.dimensions}
              </p>
            </div>
          ))}
        </div>

        {/* Signup CTA */}
        <div className="text-center space-y-3">
          <p className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/70">
            Sign up to download full resolution + all formats
          </p>
          <Link
            href={signupUrl}
            className="inline-block font-[family-name:var(--font-press-start)] text-xs px-6 py-4 text-brand border-2 border-brand bg-gold shadow-[4px_4px_0_var(--color-brand)] hover:shadow-[2px_2px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          >
            Get 10 Free Credits
          </Link>
          <p className="font-[family-name:var(--font-geist-sans)] text-xs text-brand/40">
            No credit card required
          </p>
        </div>

        <button
          onClick={reset}
          className="block mx-auto text-xs text-brand/40 hover:text-brand/60 transition-colors"
        >
          Try another release
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* URL input */}
      <div>
        <label className="block font-[family-name:var(--font-press-start)] text-[10px] text-brand/60 mb-2">
          Paste a GitHub release URL
        </label>
        <div className="flex gap-2">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/owner/repo/releases/tag/v1.0.0"
            disabled={phase === "cooking"}
            className="flex-1 border-2 border-brand p-3 font-[family-name:var(--font-geist-mono)] text-xs bg-white focus:outline-none focus:ring-2 focus:ring-gold disabled:opacity-50"
          />
          <button
            onClick={startCook}
            disabled={!isValidUrl || phase === "cooking"}
            className="font-[family-name:var(--font-press-start)] text-[10px] px-4 py-3 text-brand border-2 border-brand bg-gold shadow-[3px_3px_0_var(--color-brand)] hover:shadow-[1px_1px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-[3px_3px_0_var(--color-brand)] disabled:hover:translate-x-0 disabled:hover:translate-y-0 shrink-0"
          >
            {phase === "cooking" ? "Cooking..." : "Cook"}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {phase === "cooking" && (
        <div className="space-y-2">
          <div className="flex gap-[3px]">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className={`h-4 flex-1 border border-brand/10 transition-colors ${
                  i < Math.round((progress / 100) * 20)
                    ? "bg-gold"
                    : "bg-brand/10"
                }`}
              />
            ))}
          </div>
          <p className="font-[family-name:var(--font-press-start)] text-[10px] text-brand/50 text-center">
            cooking... {progress}%
          </p>
        </div>
      )}

      {/* Error */}
      {(phase === "error" || error) && (
        <div className="border-2 border-red-500 bg-red-50 px-4 py-2">
          <p className="text-xs text-red-700">{error}</p>
          <button
            onClick={reset}
            className="text-xs text-red-500 underline mt-1"
          >
            Try again
          </button>
        </div>
      )}

      {phase === "idle" && (
        <p className="font-[family-name:var(--font-geist-sans)] text-xs text-brand/40">
          See real generated images from your release — no account needed
        </p>
      )}
    </div>
  );
}
