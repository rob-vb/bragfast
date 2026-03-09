"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PixelButton } from "@/components/dashboard/pixel-button";
import { PixelCard } from "@/components/dashboard/pixel-card";

type BrandData = {
  name: string;
  logo_url?: string;
  website?: string;
  font?: string;
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
  const [form, setForm] = useState<BrandData>(
    initial ?? {
      name: "",
      logo_url: "",
      website: "",
      font: "",
      colors: { background: "#FFF8F0", text: "#1A1A1A", primary: "#F8AF3C" },
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

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Something went wrong");
      return;
    }

    router.push("/dashboard/brands");
    router.refresh();
  }

  const inputClass =
    "w-full border-2 border-[#4A3326] bg-white px-3 py-2 text-sm text-[#4A3326] placeholder:text-[#4A3326]/40 focus:outline-none focus:ring-2 focus:ring-[#F8AF3C]";

  return (
    <PixelCard>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-bold text-[#4A3326]">Name *</label>
          <input
            className={inputClass}
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            required
            placeholder="My Product"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-[#4A3326]">Logo URL</label>
          <input
            className={inputClass}
            value={form.logo_url ?? ""}
            onChange={(e) => update("logo_url", e.target.value)}
            placeholder="https://..."
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-[#4A3326]">Website</label>
          <input
            className={inputClass}
            value={form.website ?? ""}
            onChange={(e) => update("website", e.target.value)}
            placeholder="https://..."
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-[#4A3326]">Font</label>
          <input
            className={inputClass}
            value={form.font ?? ""}
            onChange={(e) => update("font", e.target.value)}
            placeholder="Inter"
          />
        </div>

        {/* Color pickers */}
        <div className="grid grid-cols-3 gap-4">
          {(["background", "text", "primary"] as const).map((key) => (
            <div key={key}>
              <label className="mb-1 block text-xs font-bold text-[#4A3326] capitalize">
                {key}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.colors[key]}
                  onChange={(e) => updateColor(key, e.target.value)}
                  className="h-8 w-8 cursor-pointer border-2 border-[#4A3326]"
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
