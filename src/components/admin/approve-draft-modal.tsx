"use client";

import { useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { PixelButton } from "./pixel-button";

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
  onClose,
}: ApproveDraftModalProps) {
  const router = useRouter();
  const approveDraftMutation = useMutation(api.draftPushes.approveDraft);

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
  const [postState, setPostState] = useState<"queue" | "draft">("queue");
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
  const [hideUnchecked, setHideUnchecked] = useState(true);
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
      const result = await approveDraftMutation({
        draftId,
        title,
        description,
        copyByPlatform:
          platformsPresent.length > 0 ? copyByPlatform : undefined,
        selections,
        postState,
        clientNonce,
      });

      if (!result.ok) {
        const messages: Record<string, string> = {
          nothing_selected: "Select at least one channel to push to.",
          no_providers_connected: "Connect Buffer or Postiz first.",
          duplicate_approval: "This draft was already approved. Reload to see the status.",
          format_blocked: "Your plan doesn't include this format.",
          video_blocked: "Video posts require Buffet.",
          platform_blocked: "Your plan limits the number of destinations per post.",
          posts_exhausted: "You're out of posts. Upgrade to keep going.",
          posts_pending: "New posts arrive when your subscription syncs (try again in a moment).",
        };
        const upgrade =
          "upgradeTier" in result && result.upgradeTier
            ? ` Upgrade to ${result.upgradeTier}.`
            : "";
        setInlineError((messages[result.error] ?? result.error) + upgrade);
        return;
      }

      if (result.skipped.length > 0) {
        setSkippedWarnings(result.skipped);
      }

      const providerNames = [
        ...new Set(selections.map((s) => PROVIDER_LABELS[s.provider])),
      ].join(" & ");

      toast.success(
        `Pushed ${result.pushIds.length} item(s) to ${providerNames}`,
      );
      onClose();
      router.refresh();
    } catch (err) {
      setInlineError(
        err instanceof Error ? err.message : "Unexpected error. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const noProviders = !bufferConnected && !postizConnected;

  const bufferInSelection = useMemo(() => {
    for (const key of checked) {
      if (key.split("::")[1] === "buffer") return true;
    }
    return false;
  }, [checked]);

  const showBufferDraftNote = postState === "draft" && bufferInSelection;

  return (
    <div className="fixed inset-0 z-50 bg-brand/30 flex items-center justify-center p-4">
      <div className="bg-white border-2 border-brand shadow-[8px_8px_0_var(--color-brand)] p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-[family-name:var(--font-press-start)] text-xs text-brand leading-relaxed">
            Approve &amp; Push
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

        {/* Provider summary */}
        <div className="flex gap-3">
          {(["buffer", "postiz"] as PostingProvider[]).map((prov) => {
            const connected = prov === "buffer" ? bufferConnected : postizConnected;
            return (
              <span
                key={prov}
                className={`font-[family-name:var(--font-press-start)] text-[10px] px-2 py-1 border-2 border-brand ${
                  connected
                    ? "bg-gold text-brand"
                    : "bg-surface text-brand/40 line-through"
                }`}
              >
                {PROVIDER_LABELS[prov]}
              </span>
            );
          })}
        </div>

        {/* Format × Channel grid */}
        {!noProviders && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-[family-name:var(--font-press-start)] text-[10px] text-brand/70 uppercase">
                Channels
              </span>
              <label className="flex items-center gap-2 font-[family-name:var(--font-geist-sans)] text-xs text-brand/60 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hideUnchecked}
                  onChange={(e) => setHideUnchecked(e.target.checked)}
                  className="accent-current"
                />
                Hide unchecked
              </label>
            </div>

            {draftFormats.map((fmt) => {
              const allChannels: FlatChannel[] = [
                ...(bufferConnected ? channelsByProvider.buffer : []),
                ...(postizConnected ? channelsByProvider.postiz : []),
              ];

              const rows = allChannels.filter((ch) => {
                const key = selKey(fmt, ch.provider, ch.channelId);
                return !hideUnchecked || checked.has(key);
              });

              if (rows.length === 0 && hideUnchecked) return null;

              return (
                <div key={fmt} className="border-2 border-brand/30 p-3 space-y-2">
                  <div className="font-[family-name:var(--font-press-start)] text-[10px] text-brand uppercase">
                    {FORMAT_LABELS[fmt]}
                  </div>
                  {allChannels.length === 0 ? (
                    <p className="font-[family-name:var(--font-geist-sans)] text-xs text-brand/50 italic">
                      No channels found
                    </p>
                  ) : (
                    allChannels.map((ch) => {
                      const key = selKey(fmt, ch.provider, ch.channelId);
                      const isChecked = checked.has(key);
                      if (hideUnchecked && !isChecked) return null;
                      return (
                        <label
                          key={key}
                          className="flex items-center gap-2 font-[family-name:var(--font-geist-sans)] text-xs text-brand cursor-pointer select-none"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
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

        {/* Post state */}
        {!noProviders && (
          <div className="space-y-2">
            <span className="font-[family-name:var(--font-press-start)] text-[10px] text-brand/70 uppercase">
              Post as
            </span>
            <div className="flex gap-4">
              {(["queue", "draft"] as const).map((state) => (
                <label
                  key={state}
                  className="flex items-center gap-2 font-[family-name:var(--font-geist-sans)] text-sm text-brand cursor-pointer select-none"
                >
                  <input
                    type="radio"
                    name="postState"
                    value={state}
                    checked={postState === state}
                    onChange={() => setPostState(state)}
                    className="accent-current"
                  />
                  {state === "queue" ? "Add to queue" : "Save as draft"}
                </label>
              ))}
            </div>
            {showBufferDraftNote && (
              <p className="font-[family-name:var(--font-geist-sans)] text-xs text-brand/70 border-2 border-yellow-400 bg-yellow-50 p-2">
                Buffer doesn&apos;t support drafts via API; Buffer pushes will go to queue. Postiz pushes will save as draft.
              </p>
            )}
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
          {!noProviders && (
            <PixelButton
              variant="primary"
              onClick={handleConfirm}
              disabled={submitting || checked.size === 0}
            >
              {submitting ? "Pushing..." : `Confirm (${checked.size})`}
            </PixelButton>
          )}
        </div>
      </div>
    </div>
  );
}
