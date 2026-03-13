"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { PixelButton } from "@/components/dashboard/pixel-button";
import { PixelCard } from "@/components/dashboard/pixel-card";
import { CopyButton } from "@/components/dashboard/copy-button";
import { FONT_CATALOG } from "@/lib/font-catalog";

type BrandData = {
  name: string;
  logo_url?: string;
  website?: string;
  font_family?: string;
  colors: { background: string; text: string; primary: string };
};

export function BrandForm({
  initial,
  brandId,
  action,
}: {
  initial?: BrandData;
  brandId?: string;
  action: "create" | "edit";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [form, setForm] = useState<BrandData>(
    initial ?? {
      name: "",
      logo_url: "",
      website: "",
      font_family: "",
      colors: { background: "var(--color-surface)", text: "#1A1A1A", primary: "var(--color-gold)" },
    }
  );

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateColor(field: string, value: string) {
    setForm((prev) => ({
      ...prev,
      colors: { ...prev.colors, [field]: value },
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const url =
      action === "create"
        ? "/api/v1/brands"
        : `/api/v1/brands/${brandId}`;
    const method = action === "create" ? "POST" : "PATCH";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setLoading(false);

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data.error || "Something went wrong");
      return;
    }

    if (action === "create" && data.id) {
      setCreatedId(data.id);
      return;
    }

    router.push("/dashboard/brands");
    router.refresh();
  }

  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleLogoUpload(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      setError("Logo must be under 5MB");
      return;
    }
    if (!["image/png", "image/jpeg", "image/webp", "image/svg+xml"].includes(file.type)) {
      setError("Logo must be PNG, JPEG, WebP, or SVG");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/v1/upload", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Upload failed");
        return;
      }
      update("logo_url", data.url);
    } catch {
      setError("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const inputClass =
    "w-full border-2 border-brand bg-white px-3 py-2 text-sm text-brand placeholder:text-brand/40 focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]";

  if (createdId) {
    return (
      <PixelCard className="border-[var(--color-gold)] bg-gold/10">
        <p className="font-[family-name:var(--font-press-start)] text-xs text-brand mb-2">
          Brand created!
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-white border-2 border-brand px-3 py-2 font-mono text-xs break-all">
            {createdId}
          </code>
          <PixelButton
            variant="ghost"
            onClick={() => navigator.clipboard.writeText(createdId)}
          >
            Copy
          </PixelButton>
        </div>
        <p className="mt-2 text-xs text-brand/60">
          Use this ID in your API calls to reference this brand.
        </p>
        <div className="mt-4 flex gap-3">
          <PixelButton onClick={() => router.push("/dashboard/brands")}>
            Back to Brands
          </PixelButton>
          <PixelButton
            variant="ghost"
            onClick={() => router.push(`/dashboard/brands/${createdId}`)}
          >
            Edit Brand
          </PixelButton>
        </div>
      </PixelCard>
    );
  }

  return (
    <PixelCard>
      {brandId && (
        <div className="mb-4 flex items-center gap-2 text-[11px] font-mono text-brand/80">
          <span>ID: {brandId}</span>
          <CopyButton text={brandId} />
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-bold text-brand">Name *</label>
          <input
            className={inputClass}
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            required
            placeholder="My Product"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-brand">Logo</label>
          <div
            className="mb-2 flex items-center gap-3 border-2 border-dashed border-brand/30 bg-white p-3 cursor-pointer hover:border-brand/60 transition-colors"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const file = e.dataTransfer.files[0];
              if (file) handleLogoUpload(file);
            }}
          >
            {form.logo_url ? (
              <img
                src={form.logo_url}
                alt="Logo preview"
                className="h-10 w-10 object-contain border border-brand/10"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center border-2 border-brand/20 text-brand/30 text-lg">
                +
              </div>
            )}
            <div className="flex-1 text-xs text-brand/60">
              {uploading ? "Uploading..." : "Click or drag to upload (PNG, JPEG, WebP, SVG, max 5MB)"}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleLogoUpload(file);
                e.target.value = "";
              }}
            />
          </div>
          <input
            className={inputClass}
            value={form.logo_url ?? ""}
            onChange={(e) => update("logo_url", e.target.value)}
            placeholder="https://... or upload above"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-brand">Website</label>
          <input
            className={inputClass}
            value={form.website ?? ""}
            onChange={(e) => update("website", e.target.value)}
            placeholder="https://..."
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-brand">Font</label>
          <select
            className={inputClass}
            value={form.font_family ?? ""}
            onChange={(e) => update("font_family", e.target.value)}
          >
            <option value="">Default</option>
            {Object.entries(FONT_CATALOG).map(([category, fonts]) => (
              <optgroup key={category} label={category}>
                {fonts.map((font) => (
                  <option key={font} value={font}>
                    {font}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Color pickers */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(["background", "text", "primary"] as const).map((key) => (
            <div key={key}>
              <label className="mb-1 block text-xs font-bold text-brand capitalize">
                {key}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.colors[key]}
                  onChange={(e) => updateColor(key, e.target.value)}
                  className="h-8 w-8 cursor-pointer border-2 border-brand"
                />
                <input
                  className={`${inputClass} font-mono text-xs`}
                  value={form.colors[key]}
                  onChange={(e) => updateColor(key, e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <PixelButton type="submit" disabled={loading}>
            {loading ? "Saving..." : action === "create" ? "Create" : "Save"}
          </PixelButton>
          <PixelButton
            type="button"
            variant="ghost"
            onClick={() => router.push("/dashboard/brands")}
          >
            Cancel
          </PixelButton>
        </div>
      </form>
    </PixelCard>
  );
}
