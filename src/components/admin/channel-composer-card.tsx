"use client";

import type { ChannelClass } from "@/lib/integrations/channel-classes";

type PostingProvider = "buffer" | "postiz";

export interface ChannelComposerCardProps {
  provider: PostingProvider;
  channelId: string;
  displayName: string;
  channelClass: ChannelClass;
  title: string;
  description: string;
  /** Greyed out when the channel is no longer checked. Inputs become read-only. */
  disabled?: boolean;
  generationCount: number;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onRegenerate: () => void;
  regenerateDisabled?: boolean;
  regenerateDisabledReason?: string;
  error?: string | null;
  loading?: boolean;
}

const PROVIDER_LABELS: Record<PostingProvider, string> = {
  buffer: "Buffer",
  postiz: "Postiz",
};

const CLASS_LABELS: Record<ChannelClass, string> = {
  x: "X",
  linkedin: "LinkedIn",
  instagram: "Instagram",
  tiktok: "TikTok",
  threads: "Threads",
  facebook: "Facebook",
  youtube: "YouTube",
  other: "Other",
};

export function ChannelComposerCard({
  provider,
  channelId,
  displayName,
  channelClass,
  title,
  description,
  disabled = false,
  generationCount,
  onTitleChange,
  onDescriptionChange,
  onRegenerate,
  regenerateDisabled = false,
  regenerateDisabledReason,
  error,
  loading = false,
}: ChannelComposerCardProps) {
  const cap = 3;
  const capped = generationCount >= cap;
  const buttonDisabled = disabled || regenerateDisabled || capped || loading;
  const buttonLabel = loading
    ? "Rewriting…"
    : generationCount === 0
      ? `Customize for ${CLASS_LABELS[channelClass]}`
      : capped
        ? "Edit manually"
        : `Regenerate for ${CLASS_LABELS[channelClass]}`;
  const buttonTitle = capped
    ? "Per-channel rewrite cap reached for this session"
    : (regenerateDisabledReason ?? undefined);

  const channelKey = `${provider}::${channelId}`;

  return (
    <div
      className={`space-y-2 border-2 border-brand/30 p-3 ${
        disabled ? "opacity-50" : ""
      }`}
      data-testid={`channel-card-${channelKey}`}
      aria-disabled={disabled}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="font-[family-name:var(--font-press-start)] text-[10px] text-brand uppercase flex items-center gap-2">
          <span className="text-brand/50 px-1 border border-brand/30">
            {PROVIDER_LABELS[provider]}
          </span>
          <span>{displayName}</span>
        </div>
        <button
          type="button"
          data-testid={`channel-regenerate-${channelKey}`}
          onClick={onRegenerate}
          disabled={buttonDisabled}
          title={buttonTitle}
          className="font-[family-name:var(--font-press-start)] text-[9px] text-brand border-2 border-brand/50 px-2 py-1 hover:bg-brand/10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {buttonLabel}
        </button>
      </div>
      <div className="space-y-1">
        <label className="font-[family-name:var(--font-press-start)] text-[10px] text-brand/70 uppercase block">
          Title
        </label>
        <input
          type="text"
          data-testid={`channel-title-${channelKey}`}
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          maxLength={80}
          disabled={disabled}
          className="w-full border-2 border-brand/50 bg-surface font-[family-name:var(--font-geist-sans)] text-sm text-brand px-3 py-2 focus:outline-none focus:border-brand disabled:opacity-60"
        />
      </div>
      <div className="space-y-1">
        <label className="font-[family-name:var(--font-press-start)] text-[10px] text-brand/70 uppercase block">
          Description
        </label>
        <textarea
          data-testid={`channel-description-${channelKey}`}
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          maxLength={220}
          rows={3}
          disabled={disabled}
          className="w-full border-2 border-brand/50 bg-surface font-[family-name:var(--font-geist-sans)] text-sm text-brand px-3 py-2 focus:outline-none focus:border-brand disabled:opacity-60 resize-none"
        />
      </div>
      {error && (
        <p
          className="font-[family-name:var(--font-geist-sans)] text-xs text-red-600"
          data-testid={`channel-error-${channelKey}`}
        >
          {error}
        </p>
      )}
    </div>
  );
}
