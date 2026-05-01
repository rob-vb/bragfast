"use client";

import { useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import posthog from "posthog-js";
import { PixelButton } from "./pixel-button";
import {
  tierFor,
  capsFor,
  nextTierFor,
  type Plan,
  type Format as TierFormat,
} from "@/lib/plan-tiers";

// ── Types ──────────────────────────────────────────────────────────────────────

type PostingProvider = "buffer" | "postiz";

type Format =
  | "square"
  | "landscape"
  | "portrait"
  | "video-square"
  | "video-landscape"
  | "video-portrait";

interface ChannelEntry {
  provider: PostingProvider;
  channelId: string;
}

interface RoutingRow {
  format: string;
  channels: ChannelEntry[];
}

interface BufferChannel {
  id: string;
  service?: string;
  displayName?: string;
  isDisconnected?: boolean;
}

interface PostizChannel {
  id: string;
  identifier?: string;
  name?: string;
  disabled?: boolean;
}

interface FlatChannel {
  provider: PostingProvider;
  channelId: string;
  displayName: string;
}

interface IntegrationRow {
  provider: string;
  enabled: boolean;
  extra: string | null;
}

// ── ApproveDraftModal props ────────────────────────────────────────────────────

type Platform = "x" | "linkedin";

const PLATFORM_LABELS: Record<Platform, string> = {
  x: "X",
  linkedin: "LinkedIn",
};

export interface ApproveDraftModalProps {
  draftId: string;
  /** Pre-filled title from composed copy. User-editable. Used as fallback when no per-platform copy exists. */
  initialTitle: string;
  /** Pre-filled description from composed copy. User-editable. Used as fallback. */
  initialDescription: string;
  /** Per-platform copy from Sous-Chef (X + LinkedIn variants). When present, the modal renders one editable group per platform. */
  initialCopyByPlatform?: Partial<
    Record<Platform, { title: string; description: string }>
  >;
  /** Formats present on this draft (from config.formats). */
  draftFormats: Format[];
  /** Current routing defaults for this user. */
  routingRows: RoutingRow[];
  /** Connected integrations for this user. */
  integrations: IntegrationRow[];
  /** User's current plan; drives tier-based pre-disable. Optional — when absent, no UI gating (server still enforces). */
  plan?: string;
  onClose: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const FORMAT_LABELS: Record<Format, string> = {
  square: "Square",
  landscape: "Landscape",
  portrait: "Portrait",
  "video-square": "Video — Square",
  "video-landscape": "Video — Landscape",
  "video-portrait": "Video — Portrait",
};

const PROVIDER_LABELS: Record<PostingProvider, string> = {
  buffer: "Buffer",
  postiz: "Postiz",
};

function parseExtra<T>(extra: string | null): T | null {
  if (!extra) return null;
  try {
    return JSON.parse(extra) as T;
  } catch {
    return null;
  }
}

function extractFlatChannels(
  integrations: IntegrationRow[],
): Record<PostingProvider, FlatChannel[]> {
  const result: Record<PostingProvider, FlatChannel[]> = {
    buffer: [],
    postiz: [],
  };

  for (const integration of integrations) {
    if (!integration.enabled) continue;

    if (integration.provider === "buffer") {
      const data = parseExtra<{ channels?: BufferChannel[] }>(integration.extra);
      for (const ch of data?.channels ?? []) {
        if (!ch.isDisconnected) {
          result.buffer.push({
            provider: "buffer",
            channelId: ch.id,
            displayName: ch.displayName ?? ch.service ?? ch.id,
          });
        }
      }
    } else if (integration.provider === "postiz") {
      const data = parseExtra<{ channels?: PostizChannel[] }>(integration.extra);
      for (const ch of data?.channels ?? []) {
        if (!ch.disabled) {
          result.postiz.push({
            provider: "postiz",
            channelId: ch.id,
            displayName: ch.name ?? ch.identifier ?? ch.id,
          });
        }
      }
    }
  }

  return result;
}

function isProviderConnected(
  integrations: IntegrationRow[],
  provider: PostingProvider,
): boolean {
  return integrations.some((r) => r.provider === provider && r.enabled);
}

/** Selection key for a (format, provider, channelId) triple. */
function selKey(format: Format, provider: PostingProvider, channelId: string): string {
  return `${format}::${provider}::${channelId}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ApproveDraftModal({
  draftId,
  initialTitle,
  initialDescription,
  initialCopyByPlatform,
  draftFormats,
  routingRows,
  integrations,
  plan,
  onClose,
}: ApproveDraftModalProps) {
  // S7.3: tier-driven pre-disable. Legacy plans (tierFor → null) skip gating;
  // server enforcement is still source of truth.
  const tier = plan ? tierFor(plan as Plan) : null;
  const caps = tier ? capsFor(tier) : null;
  function formatLockedReason(fmt: Format): { locked: boolean; upgrade: string | null } {
    if (!caps) return { locked: false, upgrade: null };
    const isVideo = fmt.startsWith("video-");
    const baseFmt = (isVideo ? fmt.slice("video-".length) : fmt) as TierFormat;
    const formatOk = caps.formats.includes(baseFmt);
    const videoOk = !isVideo || caps.video;
    if (formatOk && videoOk) return { locked: false, upgrade: null };
    const next = nextTierFor({
      needsFormat: baseFmt,
      needsVideo: isVideo,
    });
    return { locked: true, upgrade: next };
  }
  const router = useRouter();

  // Stable nonce generated once on modal mount.
  const clientNonce = useRef(crypto.randomUUID()).current;

  const bufferConnected = isProviderConnected(integrations, "buffer");
  const postizConnected = isProviderConnected(integrations, "postiz");

  const channelsByProvider = useMemo(
    () => extractFlatChannels(integrations),
    [integrations],
  );

  // Build the initial selection set: formats from draft × routing defaults × connected channels.
  const initialChecked = useMemo((): Set<string> => {
    const set = new Set<string>();
    for (const fmt of draftFormats) {
      const routingRow = routingRows.find((r) => r.format === fmt);
      const routingChannels = routingRow?.channels ?? [];
      for (const ch of routingChannels) {
        if (ch.provider === "buffer" && bufferConnected) {
          set.add(selKey(fmt, "buffer", ch.channelId));
        }
        if (ch.provider === "postiz" && postizConnected) {
          set.add(selKey(fmt, "postiz", ch.channelId));
        }
      }
    }
    return set;
  }, [draftFormats, routingRows, bufferConnected, postizConnected]);

  const [checked, setChecked] = useState<Set<string>>(initialChecked);
  // Buffer ignores draft mode and Postiz-only drafting added confusion; the
  // modal always pushes to queue. Keep the value as a constant for telemetry.
  const postState = "queue" as const;
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);

  // Per-platform copy state. When the draft was created with platform variants,
  // each platform has its own editable title+description; otherwise these stay
  // empty and the top-level title/description applies to all channels.
  const platformsPresent: Platform[] = useMemo(() => {
    const out: Platform[] = [];
    if (initialCopyByPlatform?.x) out.push("x");
    if (initialCopyByPlatform?.linkedin) out.push("linkedin");
    return out;
  }, [initialCopyByPlatform]);

  const [copyByPlatform, setCopyByPlatform] = useState<
    Partial<Record<Platform, { title: string; description: string }>>
  >(() => {
    const seed: Partial<Record<Platform, { title: string; description: string }>> = {};
    if (initialCopyByPlatform?.x) seed.x = { ...initialCopyByPlatform.x };
    if (initialCopyByPlatform?.linkedin)
      seed.linkedin = { ...initialCopyByPlatform.linkedin };
    return seed;
  });

  function updatePlatformCopy(
    platform: Platform,
    field: "title" | "description",
    value: string,
  ) {
    setCopyByPlatform((prev) => ({
      ...prev,
      [platform]: {
        title: prev[platform]?.title ?? "",
        description: prev[platform]?.description ?? "",
        [field]: value,
      },
    }));
  }
  const [submitting, setSubmitting] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [skippedWarnings, setSkippedWarnings] = useState<
    Array<{ format: string; provider: string; channelId: string; reason: string }>
  >([]);

  function toggleChecked(key: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  async function handleConfirm() {
    setInlineError(null);
    setSkippedWarnings([]);

    // Build selections from checked set.
    const selections: Array<{
      format: Format;
      provider: PostingProvider;
      channelId: string;
    }> = [];
    for (const key of checked) {
      const [fmt, prov, channelId] = key.split("::");
      selections.push({
        format: fmt as Format,
        provider: prov as PostingProvider,
        channelId,
      });
    }

    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/v1/drafts/${encodeURIComponent(draftId)}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            description,
            copyByPlatform:
              platformsPresent.length > 0 ? copyByPlatform : undefined,
            selections,
            postState,
            clientNonce,
          }),
        },
      );

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setInlineError(data.error ?? "Push failed. Try again.");
        return;
      }

      const result = (await res.json()) as {
        ok: boolean;
        error?: string;
        upgradeTier?: string;
        pushIds?: string[];
        skipped?: Array<{
          format: string;
          provider: string;
          channelId: string;
          reason: string;
        }>;
        meta?: {
          wasEdited?: boolean;
          editType?: string | null;
          triggerType?: string;
          confidence?: number | null;
          draftCreatedAt?: string | null;
          isFirstPostForUser?: boolean;
        };
      };

      if (!result.ok) {
        const messages: Record<string, string> = {
          nothing_selected: "Select at least one channel to push to.",
          no_providers_connected: "Connect Buffer or Postiz first.",
          duplicate_approval: "This draft was already approved. Reload to see the status.",
          format_blocked: "Your plan doesn't include this format.",
          video_blocked: "Video posts require Buffet.",
          platform_blocked: "Your plan limits the number of destinations per post.",
        };
        const upgrade = result.upgradeTier ? ` Upgrade to ${result.upgradeTier}.` : "";
        setInlineError((messages[result.error ?? ""] ?? result.error ?? "Push failed.") + upgrade);
        return;
      }

      if (result.skipped && result.skipped.length > 0) {
        setSkippedWarnings(result.skipped);
      }

      // S8.1 + S10.1: post_approved telemetry with edit-delta from server.
      const meta = result.meta;
      const destinations = [
        ...new Set(selections.map((s) => s.provider)),
      ];
      const formatsTouched = [...new Set(selections.map((s) => s.format))];
      const videoRendered = formatsTouched.some((f) => f.startsWith("video-"));
      const timeFromDraftSeconds = meta?.draftCreatedAt
        ? Math.max(
            0,
            Math.round(
              (Date.now() - new Date(meta.draftCreatedAt).getTime()) / 1000,
            ),
          )
        : null;
      posthog.capture("post_approved", {
        trigger_type: meta?.triggerType ?? "manual",
        was_edited: meta?.wasEdited ?? false,
        edit_type: meta?.editType ?? null,
        time_from_draft_seconds: timeFromDraftSeconds,
        confidence_score: meta?.confidence ?? null,
        is_first_post_for_user: meta?.isFirstPostForUser ?? false,
        approval_surface: "kitchen",
        destination: destinations.length === 1 ? destinations[0] : "multiple",
        formats_rendered: formatsTouched,
        video_rendered: videoRendered,
        total_render_count: result.pushIds?.length ?? 0,
      });

      const providerNames = [
        ...new Set(selections.map((s) => PROVIDER_LABELS[s.provider])),
      ].join(" & ");

      toast.success(
        `Pushed ${result.pushIds?.length ?? 0} item(s) to ${providerNames}`,
      );
      onClose();
      router.push("/admin/history");
    } catch (err) {
      setInlineError(
        err instanceof Error ? err.message : "Unexpected error. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const noProviders = !bufferConnected && !postizConnected;

  const distinctChannelCount = useMemo(() => {
    const set = new Set<string>();
    for (const key of checked) {
      const [, prov, channelId] = key.split("::");
      set.add(`${prov}:${channelId}`);
    }
    return set.size;
  }, [checked]);

  const platformCapWarning =
    caps && distinctChannelCount > caps.platforms
      ? {
          allowed: caps.platforms,
          actual: distinctChannelCount,
          upgrade: nextTierFor({ needsPlatforms: distinctChannelCount }),
        }
      : null;

  return (
    <div className="fixed inset-0 z-50 bg-brand/30 flex items-center justify-center p-4">
      <div className="bg-white border-2 border-brand shadow-[8px_8px_0_var(--color-brand)] p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-[family-name:var(--font-press-start)] text-xs text-brand leading-relaxed">
            {(() => {
              const connected = (["buffer", "postiz"] as PostingProvider[]).filter(
                (p) => (p === "buffer" ? bufferConnected : postizConnected),
              );
              if (connected.length === 0) return "Send";
              const names = connected.map((p) => PROVIDER_LABELS[p]).join(" & ");
              return `Send to ${names}`;
            })()}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="font-[family-name:var(--font-press-start)] text-xs text-brand/60 hover:text-brand shrink-0"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {noProviders && (
          <p className="font-[family-name:var(--font-geist-sans)] text-sm text-red-600 border-2 border-red-300 bg-red-50 p-3">
            No posting providers connected. Connect Buffer or Postiz in Sous-Chef settings first.
          </p>
        )}

        {/* Format × Channel grid */}
        {!noProviders && (
          <div className="space-y-3">
            <span className="font-[family-name:var(--font-press-start)] text-[10px] text-brand/70 uppercase">
              Channels
            </span>

            {draftFormats.map((fmt) => {
              const allChannels: FlatChannel[] = [
                ...(bufferConnected ? channelsByProvider.buffer : []),
                ...(postizConnected ? channelsByProvider.postiz : []),
              ];

              const lock = formatLockedReason(fmt);

              return (
                <div
                  key={fmt}
                  className={`border-2 border-brand/30 p-3 space-y-2 ${
                    lock.locked ? "opacity-50" : ""
                  }`}
                >
                  <div className="font-[family-name:var(--font-press-start)] text-[10px] text-brand uppercase flex items-center justify-between gap-2">
                    <span>{FORMAT_LABELS[fmt]}</span>
                    {lock.locked && (
                      <span
                        className="text-[9px] text-brand/70 normal-case"
                        title={`Your plan doesn't include this format. Upgrade to ${lock.upgrade ?? "a higher tier"}.`}
                      >
                        🔒 {lock.upgrade ? `Upgrade → ${lock.upgrade}` : "Locked"}
                      </span>
                    )}
                  </div>
                  {allChannels.length === 0 ? (
                    <p className="font-[family-name:var(--font-geist-sans)] text-xs text-brand/50 italic">
                      No channels found
                    </p>
                  ) : (
                    allChannels.map((ch) => {
                      const key = selKey(fmt, ch.provider, ch.channelId);
                      const isChecked = checked.has(key);
                      return (
                        <label
                          key={key}
                          className="flex items-center gap-2 font-[family-name:var(--font-geist-sans)] text-xs text-brand cursor-pointer select-none"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={lock.locked}
                            onChange={() => toggleChecked(key)}
                            className="accent-current"
                          />
                          <span className="font-[family-name:var(--font-press-start)] text-[9px] text-brand/50 px-1 border border-brand/30">
                            {PROVIDER_LABELS[ch.provider]}
                          </span>
                          {ch.displayName}
                        </label>
                      );
                    })
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Title + description (per-platform when copyByPlatform was generated) */}
        {!noProviders && platformsPresent.length === 0 && (
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="font-[family-name:var(--font-press-start)] text-[10px] text-brand/70 uppercase block">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={80}
                className="w-full border-2 border-brand/50 bg-surface font-[family-name:var(--font-geist-sans)] text-sm text-brand px-3 py-2 focus:outline-none focus:border-brand"
              />
            </div>
            <div className="space-y-1">
              <label className="font-[family-name:var(--font-press-start)] text-[10px] text-brand/70 uppercase block">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={220}
                rows={3}
                className="w-full border-2 border-brand/50 bg-surface font-[family-name:var(--font-geist-sans)] text-sm text-brand px-3 py-2 focus:outline-none focus:border-brand resize-none"
              />
            </div>
          </div>
        )}

        {!noProviders && platformsPresent.length > 0 && (
          <div className="space-y-4">
            {platformsPresent.map((p) => (
              <div
                key={p}
                className="space-y-2 border-2 border-brand/30 p-3"
                data-testid={`platform-copy-${p}`}
              >
                <div className="font-[family-name:var(--font-press-start)] text-[10px] text-brand uppercase">
                  {PLATFORM_LABELS[p]} copy
                </div>
                <div className="space-y-1">
                  <label className="font-[family-name:var(--font-press-start)] text-[10px] text-brand/70 uppercase block">
                    Title
                  </label>
                  <input
                    type="text"
                    value={copyByPlatform[p]?.title ?? ""}
                    onChange={(e) => updatePlatformCopy(p, "title", e.target.value)}
                    maxLength={80}
                    className="w-full border-2 border-brand/50 bg-surface font-[family-name:var(--font-geist-sans)] text-sm text-brand px-3 py-2 focus:outline-none focus:border-brand"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-[family-name:var(--font-press-start)] text-[10px] text-brand/70 uppercase block">
                    Description
                  </label>
                  <textarea
                    value={copyByPlatform[p]?.description ?? ""}
                    onChange={(e) =>
                      updatePlatformCopy(p, "description", e.target.value)
                    }
                    maxLength={220}
                    rows={3}
                    className="w-full border-2 border-brand/50 bg-surface font-[family-name:var(--font-geist-sans)] text-sm text-brand px-3 py-2 focus:outline-none focus:border-brand resize-none"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Platform cap warning */}
        {platformCapWarning && (
          <p className="font-[family-name:var(--font-geist-sans)] text-xs text-brand border-2 border-yellow-400 bg-yellow-50 p-2">
            Your plan allows {platformCapWarning.allowed} destination
            {platformCapWarning.allowed === 1 ? "" : "s"} per post; you have {platformCapWarning.actual} selected.
            {platformCapWarning.upgrade
              ? ` Upgrade to ${platformCapWarning.upgrade}.`
              : ""}
          </p>
        )}

        {/* Inline error */}
        {inlineError && (
          <p className="font-[family-name:var(--font-geist-sans)] text-xs text-red-600 border-2 border-red-300 bg-red-50 p-2">
            {inlineError}
          </p>
        )}

        {/* Skipped warnings */}
        {skippedWarnings.length > 0 && (
          <div className="border-2 border-yellow-400 bg-yellow-50 p-3 space-y-1">
            <p className="font-[family-name:var(--font-press-start)] text-[10px] text-brand">
              Some channels were skipped:
            </p>
            {skippedWarnings.map((s, i) => (
              <p
                key={i}
                className="font-[family-name:var(--font-geist-sans)] text-xs text-brand/70"
              >
                {s.format} / {s.provider} / {s.channelId} — {s.reason}
              </p>
            ))}
          </div>
        )}

        {/* Footer actions */}
        <div className="flex gap-3 justify-end pt-2">
          <PixelButton variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </PixelButton>
          {!noProviders && (() => {
            const selectedProviders = new Set<PostingProvider>();
            for (const key of checked) {
              const [, prov] = key.split("::");
              selectedProviders.add(prov as PostingProvider);
            }
            const providerLabel =
              selectedProviders.size === 0
                ? bufferConnected
                  ? PROVIDER_LABELS.buffer
                  : PROVIDER_LABELS.postiz
                : [...selectedProviders].map((p) => PROVIDER_LABELS[p]).join(" & ");
            return (
              <PixelButton
                variant="primary"
                onClick={handleConfirm}
                disabled={submitting || checked.size === 0}
              >
                {submitting
                  ? "Sending..."
                  : `Send to ${providerLabel} (${checked.size})`}
              </PixelButton>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
