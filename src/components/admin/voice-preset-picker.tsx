"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { toast } from "sonner";

const PRESETS: { id: Preset; label: string; blurb: string }[] = [
  {
    id: "casual_builder",
    label: "Casual builder",
    blurb: "First person, light humor, indie maker tone.",
  },
  {
    id: "dry_technical",
    label: "Dry technical",
    blurb: "Plain change description. No celebration, no exclamation.",
  },
  {
    id: "earnest_milestone",
    label: "Earnest milestone",
    blurb: "Sincere, brief gratitude, no false modesty.",
  },
  {
    id: "deadpan",
    label: "Deadpan",
    blurb: "Minimal, slightly understated, no emojis, no hype.",
  },
];

type Preset =
  | "casual_builder"
  | "dry_technical"
  | "earnest_milestone"
  | "deadpan";

export function VoicePresetPicker({ userId }: { userId: string }) {
  const stored = useQuery(api.userProfiles.getVoicePreset, { userId });
  const setPreset = useMutation(api.userProfiles.setVoicePreset);
  const [selected, setLocal] = useState<Preset | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (stored !== undefined) setLocal((stored as Preset | null) ?? null);
  }, [stored]);

  async function pick(id: Preset) {
    if (selected === id || saving) return;
    const prev = selected;
    setLocal(id);
    setSaving(true);
    try {
      await setPreset({ userId, preset: id });
      toast.success("Voice updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
      setLocal(prev);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-brand/60">
        Shapes how Haiku writes your draft titles and descriptions.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {PRESETS.map((p) => {
          const active = selected === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => pick(p.id)}
              disabled={saving}
              className={`text-left p-3 border-2 transition-all ${
                active
                  ? "border-brand bg-gold shadow-[3px_3px_0_var(--color-brand)]"
                  : "border-brand/30 bg-white hover:border-brand"
              } ${saving ? "opacity-50 cursor-wait" : "cursor-pointer"}`}
            >
              <div className="font-[family-name:var(--font-press-start)] text-[10px] text-brand">
                {p.label}
              </div>
              <div className="mt-1 text-xs text-brand/70">{p.blurb}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
