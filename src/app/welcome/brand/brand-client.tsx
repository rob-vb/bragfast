"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const NEXT_PATH = "/welcome/goal";

export function BrandKitClient() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [primary, setPrimary] = useState("#1a1a2e");
  const [logoUrl, setLogoUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError("Name required (or hit Skip)");
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          logo_url: logoUrl.trim() || undefined,
          colors: {
            background: "#ffffff",
            text: "#1a1a2e",
            primary,
          },
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Failed: ${res.status}`);
      }
      router.push(NEXT_PATH);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
      setSubmitting(false);
    }
  }

  function onSkip() {
    router.push(NEXT_PATH);
  }

  return (
    <form onSubmit={onSave} className="space-y-5">
      <Field label="Brand name">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="acme"
          className="w-full border-2 border-brand bg-white px-3 py-2 font-mono text-sm"
        />
      </Field>
      <Field label="Primary color">
        <div className="flex gap-3 items-center">
          <input
            type="color"
            value={primary}
            onChange={(e) => setPrimary(e.target.value)}
            className="h-10 w-14 border-2 border-brand bg-white"
            aria-label="Primary color picker"
          />
          <input
            type="text"
            value={primary}
            onChange={(e) => setPrimary(e.target.value)}
            placeholder="#1a1a2e"
            className="flex-1 border-2 border-brand bg-white px-3 py-2 font-mono text-sm"
          />
        </div>
      </Field>
      <Field label="Logo URL (optional)">
        <input
          type="url"
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          placeholder="https://your-domain.com/logo.png"
          className="w-full border-2 border-brand bg-white px-3 py-2 font-mono text-sm"
        />
      </Field>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 bg-gold text-brand border-2 border-brand px-4 py-3 font-mono text-xs uppercase tracking-widest font-bold shadow-[3px_3px_0_var(--color-brand)] transition-all hover:shadow-[2px_2px_0_var(--color-brand)] hover:translate-x-[1px] hover:translate-y-[1px] disabled:opacity-50"
        >
          {submitting ? "Saving…" : "▸ Save & continue"}
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="bg-white text-brand border-2 border-brand px-4 py-3 font-mono text-xs uppercase tracking-widest font-bold shadow-[3px_3px_0_var(--color-brand)]"
        >
          Skip
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-brand">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
