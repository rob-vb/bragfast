"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { PixelCard } from "./pixel-card";
import { PixelEmptyState } from "./pixel-empty-state";
import {
  channelClassFromBufferService,
  channelClassFromPostizIdentifier,
  BUILT_IN_FORMAT_DEFAULTS,
  CHANNEL_CLASS_ICONS,
  type ChannelClass,
} from "@/lib/integrations/channel-classes";

// ── Types ─────────────────────────────────────────────────────────────────────

type PostingProvider = "buffer" | "postiz";

interface ChannelEntry {
  provider: PostingProvider;
  channelId: string;
}

interface RoutingRow {
  format: string;
  channels: ChannelEntry[];
  updated_at: string;
}

interface IntegrationRow {
  provider: string;
  enabled: boolean;
  extra: string | null;
  lastScanAt: string | null;
  lastScanOkAt: string | null;
  lastScanError: string | null;
  lastSnapshotJson: string | null;
}

interface FlatChannel {
  provider: PostingProvider;
  channelId: string;
  displayName: string;
  channelClass: ChannelClass;
  isDisconnected?: boolean;
}

interface Props {
  userId: string;
  routingRows: RoutingRow[];
  integrations: IntegrationRow[];
}

// ── Extra JSON shapes ─────────────────────────────────────────────────────────

interface BufferChannel {
  id: string;
  service: string;
  displayName: string;
  isDisconnected?: boolean;
}

interface PostizChannel {
  id: string;
  identifier?: string;
  name?: string;
  profile?: string;
  disabled?: boolean;
}

function parseExtra(extra: string | null): unknown {
  if (!extra) return null;
  try {
    return JSON.parse(extra);
  } catch {
    return null;
  }
}

// ── Channel extraction ────────────────────────────────────────────────────────

function extractChannels(integrations: IntegrationRow[]): FlatChannel[] {
  const channels: FlatChannel[] = [];

  for (const integration of integrations) {
    const parsed = parseExtra(integration.extra);

    if (integration.provider === "buffer") {
      const data = parsed as { channels?: BufferChannel[] } | null;
      for (const ch of data?.channels ?? []) {
        channels.push({
          provider: "buffer",
          channelId: ch.id,
          displayName: ch.displayName,
          channelClass: channelClassFromBufferService(ch.service ?? ""),
          isDisconnected: ch.isDisconnected,
        });
      }
    } else if (integration.provider === "postiz") {
      const data = parsed as { channels?: PostizChannel[] } | null;
      for (const ch of data?.channels ?? []) {
        const label = ch.name ?? ch.identifier ?? ch.id;
        channels.push({
          provider: "postiz",
          channelId: ch.id,
          displayName: label,
          channelClass: channelClassFromPostizIdentifier(ch.identifier ?? ""),
          isDisconnected: ch.disabled,
        });
      }
    }
  }

  return channels;
}

// ── Formats ───────────────────────────────────────────────────────────────────

const FORMAT_LABELS: Record<string, string> = {
  square: "Square",
  landscape: "Landscape",
  portrait: "Portrait",
  "video-square": "Video — Square",
  "video-landscape": "Video — Landscape",
  "video-portrait": "Video — Portrait",
};

const ALL_FORMATS = [
  "square",
  "landscape",
  "portrait",
  "video-square",
  "video-landscape",
  "video-portrait",
] as const;

type Format = (typeof ALL_FORMATS)[number];

// ── Effective channel helper ──────────────────────────────────────────────────

/**
 * Compute the effective checked channels for a format.
 *
 * - If a persisted row exists → use its channels (exact set).
 * - Otherwise → use built-in defaults intersected with connected channels.
 */
function effectiveChannels(
  format: Format,
  persistedRows: RoutingRow[],
  allChannels: FlatChannel[],
): Set<string> {
  const persisted = persistedRows.find((r) => r.format === format);
  if (persisted) {
    return new Set(persisted.channels.map((c) => `${c.provider}:${c.channelId}`));
  }

  // Built-in defaults: select channels whose class matches the format's defaults.
  const defaultClasses = new Set<ChannelClass>(
    BUILT_IN_FORMAT_DEFAULTS[format] ?? [],
  );
  return new Set(
    allChannels
      .filter((ch) => defaultClasses.has(ch.channelClass))
      .map((ch) => `${ch.provider}:${ch.channelId}`),
  );
}

// ── Cell key helper ───────────────────────────────────────────────────────────

function cellKey(provider: PostingProvider, channelId: string): string {
  return `${provider}:${channelId}`;
}

// ── Main component ────────────────────────────────────────────────────────────

export function RoutingDefaultsClient({
  userId,
  routingRows: initialRows,
  integrations,
}: Props) {
  const [rows, setRows] = useState<RoutingRow[]>(initialRows);
  const [pending, setPending] = useState<Set<string>>(new Set());

  const allChannels = extractChannels(integrations);
  const hasConnectedProviders = integrations.length > 0;

  // ── Empty state ─────────────────────────────────────────────────────────────

  if (!hasConnectedProviders) {
    return (
      <div className="space-y-6">
        <h1 className="font-[family-name:var(--font-press-start)] text-sm text-brand">
          Routing Defaults
        </h1>
        <PixelEmptyState
          title="No providers connected"
          description="Connect Buffer or Postiz to set per-format routing defaults for your approved drafts."
          cta={{ label: "Go to Sous-Chef", href: "/admin/sous-chef" }}
        />
      </div>
    );
  }

  return (
    <RoutingTable
      userId={userId}
      allChannels={allChannels}
      rows={rows}
      setRows={setRows}
      pending={pending}
      setPending={setPending}
    />
  );
}

// ── Table ─────────────────────────────────────────────────────────────────────

function RoutingTable({
  userId,
  allChannels,
  rows,
  setRows,
  pending,
  setPending,
}: {
  userId: string;
  allChannels: FlatChannel[];
  rows: RoutingRow[];
  setRows: React.Dispatch<React.SetStateAction<RoutingRow[]>>;
  pending: Set<string>;
  setPending: React.Dispatch<React.SetStateAction<Set<string>>>;
}) {
  const handleToggle = useCallback(
    async (format: Format, channel: FlatChannel, currentChecked: boolean) => {
      const key = `${format}:${cellKey(channel.provider, channel.channelId)}`;
      if (pending.has(key)) return;

      // Compute new full channel list for this format.
      const currentEffective = effectiveChannels(format, rows, allChannels);
      const ck = cellKey(channel.provider, channel.channelId);
      if (currentChecked) {
        currentEffective.delete(ck);
      } else {
        currentEffective.add(ck);
      }

      const newChannels: ChannelEntry[] = [...currentEffective].map((k) => {
        const [provider, ...rest] = k.split(":");
        return { provider: provider as PostingProvider, channelId: rest.join(":") };
      });

      // Optimistic update.
      const now = new Date().toISOString();
      setRows((prev) => {
        const existing = prev.find((r) => r.format === format);
        if (existing) {
          return prev.map((r) =>
            r.format === format ? { ...r, channels: newChannels, updated_at: now } : r,
          );
        }
        return [...prev, { format, channels: newChannels, updated_at: now }];
      });

      // Mark cell as pending.
      setPending((prev) => new Set(prev).add(key));

      try {
        const res = await fetch("/api/v1/routing-defaults", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ format, channels: newChannels }),
        });
        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          throw new Error(data.error ?? "Failed to save");
        }
        toast.success("Routing updated");
      } catch (err) {
        // Roll back optimistic update.
        setRows((prev) => {
          const rolledBack = prev.map((r) => {
            if (r.format !== format) return r;
            // Restore previous channels for this format.
            const previousEffective = effectiveChannels(format, rows, allChannels);
            const restoredChannels: ChannelEntry[] = [...previousEffective].map((k) => {
              const [provider, ...rest] = k.split(":");
              return { provider: provider as PostingProvider, channelId: rest.join(":") };
            });
            return { ...r, channels: restoredChannels };
          });
          return rolledBack;
        });
        toast.error(err instanceof Error ? err.message : "Failed to save routing");
      } finally {
        setPending((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [userId, rows, allChannels, pending, setRows, setPending],
  );

  if (allChannels.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="font-[family-name:var(--font-press-start)] text-sm text-brand">
          Routing Defaults
        </h1>
        <PixelCard>
          <p className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/60">
            Provider connected but no channels found.{" "}
            <Link href="/admin/sous-chef" className="underline hover:text-brand">
              Connect channels in Buffer or Postiz first.
            </Link>
          </p>
        </PixelCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-press-start)] text-sm text-brand">
        Routing Defaults
      </h1>

      <PixelCard>
        <p className="font-[family-name:var(--font-geist-sans)] text-xs text-brand/60">
          Smart defaults pre-checked. Toggles save automatically.
        </p>
      </PixelCard>

      {/* Overflow wrapper — table may be wide with many channels */}
      <div className="overflow-x-auto border-2 border-brand bg-white shadow-[4px_4px_0_var(--color-brand)]">
        <table className="w-full text-left text-sm text-brand">
          <thead>
            <tr className="border-b-2 border-brand bg-gold/20">
              <th className="px-4 py-3 font-[family-name:var(--font-press-start)] text-[10px] uppercase whitespace-nowrap">
                Format
              </th>
              {allChannels.map((ch) => (
                <th
                  key={cellKey(ch.provider, ch.channelId)}
                  className="px-4 py-3 font-[family-name:var(--font-press-start)] text-[9px] uppercase whitespace-nowrap"
                  title={`${ch.displayName} — ${ch.provider}`}
                >
                  <span className="block">
                    {CHANNEL_CLASS_ICONS[ch.channelClass]} {ch.displayName}
                  </span>
                  <span
                    className={`inline-block mt-1 px-1.5 py-0.5 text-[8px] border border-current ${
                      ch.provider === "buffer"
                        ? "text-blue-600 border-blue-300"
                        : "text-purple-600 border-purple-300"
                    }`}
                  >
                    {ch.provider}
                  </span>
                  {ch.isDisconnected && (
                    <span className="block mt-1 text-[8px] text-red-500">
                      disconnected
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-brand/10">
            {ALL_FORMATS.map((format) => {
              const effective = effectiveChannels(format, rows, allChannels);
              return (
                <tr key={format} className="hover:bg-gold/5 transition-colors">
                  <td className="px-4 py-3 font-[family-name:var(--font-press-start)] text-[10px] whitespace-nowrap">
                    {FORMAT_LABELS[format]}
                  </td>
                  {allChannels.map((ch) => {
                    const ck = cellKey(ch.provider, ch.channelId);
                    const checked = effective.has(ck);
                    const pendingKey = `${format}:${ck}`;
                    const isBusy = pending.has(pendingKey);
                    return (
                      <td
                        key={ck}
                        className="px-4 py-3 text-center"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={isBusy}
                          onChange={() => handleToggle(format, ch, checked)}
                          className="h-4 w-4 cursor-pointer accent-gold border-brand disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label={`${FORMAT_LABELS[format]} — ${ch.displayName} (${ch.provider})`}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
