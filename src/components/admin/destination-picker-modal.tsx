"use client";

import { useMemo, useState } from "react";
import posthog from "posthog-js";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { DraftConfig } from "@/lib/drafts/types";

type Props = {
  draftId: string;
  config: DraftConfig;
  /** Best-guess plain title from the draft (used when copyByPlatform is missing). */
  fallbackTitle: string;
  open: boolean;
  onClose: () => void;
  onApproved: () => void;
};

function pickXCopy(config: DraftConfig, fallbackTitle: string): string {
  const x = config.copyByPlatform?.x;
  if (x) {
    const merged = [x.title, x.description].filter(Boolean).join("\n\n").trim();
    if (merged) return merged;
  }
  const obj = config.objectContent;
  if (obj) {
    const parts = Object.values(obj)
      .map((c) => c?.text?.trim())
      .filter((t): t is string => !!t);
    const merged = parts.join("\n\n").trim();
    if (merged) return merged;
  }
  return fallbackTitle;
}

function buildXIntentUrl(text: string): string {
  const params = new URLSearchParams({ text });
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

export function DestinationPickerModal({
  draftId,
  config,
  fallbackTitle,
  open,
  onClose,
  onApproved,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const approveClipboard = useMutation(api.draftPushes.approveDraftClipboard);

  const xText = useMemo(
    () => pickXCopy(config, fallbackTitle),
    [config, fallbackTitle],
  );

  if (!open) return null;

  async function recordClipboardApproval(
    destination: "clipboard" | "x_intent",
  ): Promise<boolean> {
    try {
      const res = await approveClipboard({ draftId, destination });
      if (!res.ok) {
        const msg =
          res.error === "posts_exhausted"
            ? "Posts/month limit reached. Upgrade to keep posting."
            : res.error === "posts_pending"
              ? "Plan refresh in flight — try again in a moment."
              : "Approval failed. Try again.";
        setError(msg);
        return false;
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approval failed");
      return false;
    }
  }

  function captureApproved(destination: "buffer" | "postiz" | "clipboard" | "x_intent") {
    posthog.capture("post_approved", {
      trigger_type: "pr_merged",
      was_edited: false,
      edit_type: null,
      time_from_draft_seconds: null,
      confidence_score: null,
      is_first_post_for_user: true,
      approval_surface: "dashboard_hero",
      destination,
      formats_rendered: [],
      video_rendered: false,
      total_render_count: 0,
    });
  }

  async function onCopy() {
    setError(null);
    try {
      await navigator.clipboard.writeText(xText);
    } catch {
      setError("Clipboard write failed. Copy manually from the kitchen.");
      return;
    }
    setCopied(true);
    const approved = await recordClipboardApproval("clipboard");
    if (!approved) return;
    captureApproved("clipboard");
    onApproved();
  }

  async function onXIntent() {
    setError(null);
    const approved = await recordClipboardApproval("x_intent");
    if (!approved) return;
    const url = buildXIntentUrl(xText);
    window.open(url, "_blank", "noopener,noreferrer");
    captureApproved("x_intent");
    onApproved();
  }

  function onProvider(provider: "buffer" | "postiz") {
    captureApproved(provider);
    window.location.href = `/admin/kitchen?draft=${encodeURIComponent(draftId)}&approve=1&provider=${provider}`;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md border-[3px] border-brand bg-white shadow-[6px_6px_0_var(--color-brand)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-brand text-gold px-5 py-3 font-mono text-xs uppercase tracking-widest flex items-center justify-between">
          <span>▸ Where should this go?</span>
          <button
            type="button"
            onClick={onClose}
            className="text-gold hover:text-white px-2"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-sm text-brand/70 leading-relaxed">
            Pick a destination. Nothing posts without your final say on the provider.
          </p>

          <div className="grid grid-cols-1 gap-3">
            <DestButton
              label="Buffer"
              hint="Queue across your Buffer channels"
              onClick={() => onProvider("buffer")}
            />
            <DestButton
              label="Postiz"
              hint="Send to your Postiz instance"
              onClick={() => onProvider("postiz")}
            />
            <DestButton
              label={copied ? "Copied!" : "Copy to clipboard"}
              hint="Paste anywhere — Slack, email, your own scheduler"
              onClick={onCopy}
              variant="gold"
            />
            <DestButton
              label="Open X compose"
              hint="Opens twitter.com/intent/tweet with your text pre-filled"
              onClick={onXIntent}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}

function DestButton({
  label,
  hint,
  onClick,
  variant = "white",
}: {
  label: string;
  hint: string;
  onClick: () => void;
  variant?: "white" | "gold";
}) {
  const bg = variant === "gold" ? "bg-gold" : "bg-white";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left ${bg} text-brand border-2 border-brand px-4 py-3 shadow-[3px_3px_0_var(--color-brand)] transition-all hover:shadow-[1px_1px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px]`}
    >
      <div className="font-mono text-xs uppercase tracking-widest font-bold">
        {label}
      </div>
      <div className="text-xs text-brand/60 mt-0.5">{hint}</div>
    </button>
  );
}
