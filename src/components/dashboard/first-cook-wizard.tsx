"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PixelButton } from "@/components/dashboard/pixel-button";

const TEMPLATES = [
  { id: "standard-browser", name: "Standard Browser" },
  { id: "standard-mobile", name: "Standard Mobile" },
  { id: "split-browser", name: "Split Browser" },
  { id: "split-mobile", name: "Split Mobile" },
  { id: "hero", name: "Hero" },
  { id: "changelog", name: "Changelog" },
];

type Step = "source" | "template" | "brand" | "cooking";

export function FirstCookWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("source");
  const [url, setUrl] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [manualDescription, setManualDescription] = useState("");
  const [useManual, setUseManual] = useState(false);
  const [template, setTemplate] = useState("standard-browser");
  const [logoUrl, setLogoUrl] = useState("");
  const [colors, setColors] = useState({
    background: "#FFF8F0",
    text: "#1A1A1A",
    primary: "#F8AF3C",
  });
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [cookId, setCookId] = useState("");
  const [showCelebration, setShowCelebration] = useState(false);

  const stepNumber =
    step === "source" ? 1 : step === "template" ? 2 : step === "brand" ? 3 : 4;

  const canProceedSource = useManual
    ? manualTitle.trim().length > 0
    : url.trim().length > 0;

  const startCooking = useCallback(async () => {
    setStep("cooking");
    setProgress(10);
    setError("");

    const body: Record<string, unknown> = {
      template,
      formats: ["landscape", "square", "portrait"],
    };

    if (useManual) {
      body.title = manualTitle;
      body.description = manualDescription;
    } else {
      body.url = url;
    }

    if (logoUrl) body.logo_url = logoUrl;
    body.colors = colors;

    try {
      setProgress(20);
      const res = await fetch("/api/v1/guided-cook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Cook failed");
      }

      const result = await res.json();
      setCookId(result.cook_id);
      setProgress(40);

      // Poll for completion
      const pollInterval = setInterval(async () => {
        try {
          const pollRes = await fetch(`/api/v1/cook/${result.cook_id}`);
          if (pollRes.ok) {
            const pollData = await pollRes.json();
            if (pollData.status === "completed") {
              clearInterval(pollInterval);
              setProgress(100);
              setShowCelebration(true);
              setTimeout(() => {
                router.push(`/dashboard/history?id=${result.cook_id}`);
                router.refresh();
              }, 2500);
            } else if (pollData.status === "failed") {
              clearInterval(pollInterval);
              setError("Cook failed. Please try again.");
              setStep("source");
            } else {
              setProgress((p) => Math.min(p + 10, 90));
            }
          }
        } catch {
          // Continue polling
        }
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("source");
    }
  }, [template, useManual, manualTitle, manualDescription, url, logoUrl, colors, router]);

  if (showCelebration) {
    return (
      <div className="border-[3px] border-brand bg-white shadow-[6px_6px_0_var(--color-brand)] overflow-hidden">
        <div className="bg-brand text-gold px-4 py-3">
          <h2 className="font-[family-name:var(--font-press-start)] text-xs">
            Order up!
          </h2>
        </div>
        <div className="p-8 text-center">
          <p className="font-[family-name:var(--font-press-start)] text-2xl text-gold mb-4 animate-bounce">
            Order up!
          </p>
          <p className="text-sm text-brand/60">
            Your images are ready. Redirecting...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="border-[3px] border-brand bg-white shadow-[6px_6px_0_var(--color-brand)] overflow-hidden"
      role="group"
      aria-label={`Step ${stepNumber} of 4`}
    >
      {/* Header */}
      <div className="bg-brand text-gold px-4 py-3">
        <h2 className="font-[family-name:var(--font-press-start)] text-xs">
          {step === "source" && "\u25B8 Your First Cook"}
          {step === "template" && "\u25B8 Pick a Recipe"}
          {step === "brand" && "\u25B8 Season to Taste"}
          {step === "cooking" && "\u25B8 Cooking..."}
        </h2>
      </div>

      <div className="p-5">
        {error && (
          <div className="mb-4 border-2 border-red-500 bg-red-50 px-4 py-2 text-xs text-red-700">
            {error}
          </div>
        )}

        {/* Step 1: Source */}
        {step === "source" && (
          <div className="space-y-4">
            {!useManual ? (
              <>
                <label className="block text-xs text-brand/70 mb-1">
                  GitHub release URL
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://github.com/owner/repo/releases/tag/v1.0.0"
                  className="w-full border-2 border-brand p-3 font-mono text-xs bg-white focus:outline-none focus:ring-2 focus:ring-gold"
                />
                <button
                  onClick={() => setUseManual(true)}
                  className="text-xs text-brand/40 hover:text-brand/60 transition-colors"
                >
                  &mdash; or describe your release manually &mdash;
                </button>
              </>
            ) : (
              <>
                <label className="block text-xs text-brand/70 mb-1">
                  Release title
                </label>
                <input
                  type="text"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder="v2.0 - Dark Mode"
                  className="w-full border-2 border-brand p-3 font-mono text-xs bg-white focus:outline-none focus:ring-2 focus:ring-gold"
                />
                <label className="block text-xs text-brand/70 mb-1">
                  Description
                </label>
                <textarea
                  value={manualDescription}
                  onChange={(e) => setManualDescription(e.target.value)}
                  placeholder="What's new in this release?"
                  rows={4}
                  className="w-full border-2 border-brand p-3 font-mono text-xs bg-white resize-none focus:outline-none focus:ring-2 focus:ring-gold"
                />
                <button
                  onClick={() => setUseManual(false)}
                  className="text-xs text-brand/40 hover:text-brand/60 transition-colors"
                >
                  &mdash; or paste a GitHub URL &mdash;
                </button>
              </>
            )}
            <div className="flex justify-end">
              <PixelButton
                onClick={() => setStep("template")}
                disabled={!canProceedSource}
              >
                Next &raquo;
              </PixelButton>
            </div>
          </div>
        )}

        {/* Step 2: Template */}
        {step === "template" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTemplate(t.id)}
                  aria-selected={template === t.id}
                  className={`border-2 p-4 text-left transition-all ${
                    template === t.id
                      ? "border-gold bg-gold/10 shadow-[3px_3px_0_var(--color-brand)]"
                      : "border-brand/20 hover:border-brand/40"
                  }`}
                >
                  <span className="font-[family-name:var(--font-press-start)] text-[10px] text-brand">
                    {t.name}
                  </span>
                </button>
              ))}
            </div>
            <div className="flex justify-between">
              <PixelButton variant="ghost" onClick={() => setStep("source")}>
                &laquo; Back
              </PixelButton>
              <PixelButton onClick={() => setStep("brand")}>
                Next &raquo;
              </PixelButton>
            </div>
          </div>
        )}

        {/* Step 3: Brand (optional) */}
        {step === "brand" && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-brand/70 mb-1">
                Logo URL (optional)
              </label>
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
                className="w-full border-2 border-brand p-3 font-mono text-xs bg-white focus:outline-none focus:ring-2 focus:ring-gold"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              {(
                [
                  ["Background", "background"],
                  ["Text", "text"],
                  ["Accent", "primary"],
                ] as const
              ).map(([label, key]) => (
                <div key={key}>
                  <label className="block text-xs text-brand/70 mb-1">
                    {label}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={colors[key]}
                      onChange={(e) =>
                        setColors((c) => ({ ...c, [key]: e.target.value }))
                      }
                      className="flex-1 border-2 border-brand p-2 font-mono text-xs bg-white focus:outline-none focus:ring-2 focus:ring-gold"
                    />
                    <input
                      type="color"
                      value={colors[key]}
                      onChange={(e) =>
                        setColors((c) => ({ ...c, [key]: e.target.value }))
                      }
                      className="h-8 w-8 border-2 border-brand cursor-pointer"
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between">
              <PixelButton variant="ghost" onClick={() => setStep("template")}>
                &laquo; Back
              </PixelButton>
              <div className="flex gap-2">
                <PixelButton variant="ghost" onClick={startCooking}>
                  Skip
                </PixelButton>
                <PixelButton onClick={startCooking}>
                  Next &raquo;
                </PixelButton>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Cooking */}
        {step === "cooking" && (
          <div className="space-y-4 text-center py-4">
            {/* Progress bar */}
            <div className="flex gap-[3px] mx-auto max-w-md">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-6 flex-1 border border-brand/10 transition-colors ${
                    i < Math.round((progress / 100) * 20)
                      ? "bg-gold"
                      : "bg-brand/10"
                  }`}
                />
              ))}
            </div>
            <p className="font-[family-name:var(--font-press-start)] text-xs text-brand/60">
              cooking... {progress}%
            </p>
            <p className="text-xs text-brand/40">3 formats</p>
          </div>
        )}
      </div>
    </div>
  );
}
