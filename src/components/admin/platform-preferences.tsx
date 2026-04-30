"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { toast } from "sonner";

const PLATFORMS: { id: "x" | "linkedin"; label: string }[] = [
  { id: "x", label: "X" },
  { id: "linkedin", label: "LinkedIn" },
];

export function PlatformPreferences({ userId }: { userId: string }) {
  const stored = useQuery(api.userProfiles.getDisabledPlatforms, { userId });
  const setDisabled = useMutation(api.userProfiles.setDisabledPlatforms);
  const [disabled, setLocal] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (stored) setLocal(new Set(stored));
  }, [stored]);

  async function toggle(id: "x" | "linkedin") {
    const next = new Set(disabled);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setLocal(next);
    setSaving(true);
    try {
      await setDisabled({ userId, platforms: [...next] });
      toast.success("Saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
      setLocal(new Set(stored ?? []));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <h2 className="font-[family-name:var(--font-press-start)] text-sm text-brand">
          Sous-Chef platforms
        </h2>
        <p className="mt-1 text-xs text-brand/60">
          Choose which platforms get a copy variant when a draft is generated.
          Disabled platforms skip Haiku entirely.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {PLATFORMS.map((p) => {
          const enabled = !disabled.has(p.id);
          return (
            <label
              key={p.id}
              className="flex items-center gap-3 cursor-pointer select-none"
            >
              <input
                type="checkbox"
                checked={enabled}
                onChange={() => toggle(p.id)}
                disabled={saving}
                className="accent-current h-4 w-4"
              />
              <span className="font-[family-name:var(--font-geist-sans)] text-sm text-brand">
                {p.label}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
