"use client";

import { useState } from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import { toast } from "sonner";
import {
  parseVoiceProfile,
  DEFAULT_VOICE_PROFILE_MD,
} from "@/lib/drafts/voice-profile";

function formatDate(isoString: string): string {
  if (!isoString) return "Never";
  try {
    return new Date(isoString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "Never";
  }
}

function parseBadgeData(md: string) {
  try {
    const parsed = parseVoiceProfile(md);
    return {
      lastReflected: parsed.frontmatter.last_reflected || "",
      approvalCount: parsed.frontmatter.approval_count,
      skipCount: parsed.frontmatter.skip_count,
    };
  } catch {
    return { lastReflected: "", approvalCount: 0, skipCount: 0 };
  }
}

function downloadMd(content: string) {
  const blob = new Blob([content], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "voice-profile.md";
  a.click();
  URL.revokeObjectURL(url);
}

const buttonBase =
  "border-2 border-brand shadow-[3px_3px_0_var(--color-brand)] px-4 py-2 font-[family-name:var(--font-press-start)] text-[10px] text-brand hover:shadow-[1px_1px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all rounded-none disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none";

export function VoiceProfileEditor({
  userId: _userId,
  initialMd,
}: {
  userId: string;
  initialMd: string | null;
}) {
  const [md, setMd] = useState<string>(initialMd ?? DEFAULT_VOICE_PROFILE_MD);
  const [saving, setSaving] = useState(false);
  const [reflecting, setReflecting] = useState(false);

  const saveMd = useMutation(api.userProfiles.setVoiceProfileMd);
  const triggerReflection = useAction(api.voiceProfileReflection.triggerReflection);

  const badge = parseBadgeData(md);

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
      await saveMd({ md });
      toast.success("Voice profile saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleReflect() {
    if (reflecting) return;
    setReflecting(true);
    try {
      await triggerReflection({});
      toast.success("Reflection scheduled");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reflection failed");
    } finally {
      setReflecting(false);
    }
  }

  function handleDownload() {
    downloadMd(md);
  }

  return (
    <div className="space-y-4">
      {/* Badges */}
      <div className="flex flex-wrap gap-3">
        <span className="border-2 border-brand bg-surface px-3 py-1 font-[family-name:var(--font-press-start)] text-[9px] text-brand">
          Last reflected: {formatDate(badge.lastReflected)}
        </span>
        <span className="border-2 border-brand bg-surface px-3 py-1 font-[family-name:var(--font-press-start)] text-[9px] text-brand">
          Approvals: {badge.approvalCount} · Skips: {badge.skipCount}
        </span>
      </div>

      {/* Editor card */}
      <div className="border-2 border-brand bg-white shadow-[4px_4px_0_var(--color-brand)]">
        <textarea
          value={md}
          onChange={(e) => setMd(e.target.value)}
          rows={30}
          spellCheck={false}
          className="w-full resize-y bg-transparent p-4 font-[family-name:var(--font-geist-mono)] text-xs text-brand outline-none placeholder:text-brand/40"
          placeholder="Your voice profile markdown..."
        />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className={`${buttonBase} bg-gold`}
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={handleReflect}
          disabled={reflecting}
          className={`${buttonBase} bg-white`}
        >
          {reflecting ? "Scheduling..." : "Reflect now"}
        </button>
        <button
          type="button"
          onClick={handleDownload}
          className={`${buttonBase} bg-white`}
        >
          Download .md
        </button>
      </div>
    </div>
  );
}
