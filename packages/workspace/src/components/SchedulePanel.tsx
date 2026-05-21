import { useEffect, useMemo, useState } from "react";
import { fetchIntegrations, fetchRoutingDefaults } from "../api";
import type { UseScheduleResult } from "../hooks/useSchedule";
import type { FormatKey, FormatRenderState, IntegrationRecord, RoutingDefault } from "../types";
import {
  BUILT_IN_FORMAT_DEFAULTS,
  channelClassFromBufferService,
} from "../../../../src/lib/integrations/channel-classes";

const FORMAT_KEYS: FormatKey[] = ["landscape", "square", "portrait"];
const FORMAT_LABELS: Record<FormatKey, string> = {
  landscape: "Landscape",
  square: "Square",
  portrait: "Portrait",
};

interface BufferChannel {
  id: string;
  name: string;
  service: string;
  disabled?: boolean;
}

interface SchedulePanelProps {
  schedule: UseScheduleResult;
  formats: Record<FormatKey, FormatRenderState>;
  activeFormat: FormatKey;
}

type TimingMode = "queue" | "custom";
type SelectedChannels = Record<FormatKey, string[]>;

function parseBufferChannels(integrations: IntegrationRecord[]): BufferChannel[] {
  const buffer = integrations.find((integration) => integration.provider === "buffer" && integration.enabled);
  if (!buffer?.extra) return [];

  try {
    const parsed = JSON.parse(buffer.extra) as { channels?: BufferChannel[] } | null;
    return (parsed?.channels ?? []).filter((channel) => channel.id && !channel.disabled);
  } catch {
    return [];
  }
}

function emptySelection(): SelectedChannels {
  return {
    landscape: [],
    square: [],
    portrait: [],
  };
}

function seedSelection(channels: BufferChannel[], defaults: RoutingDefault[]): SelectedChannels {
  const next = emptySelection();

  for (const format of FORMAT_KEYS) {
    const saved = defaults.find((entry) => entry.format === format);
    if (saved) {
      next[format] = saved.channels
        .filter((channel) => channel.provider === "buffer")
        .map((channel) => channel.channelId);
      continue;
    }

    const defaultClasses = BUILT_IN_FORMAT_DEFAULTS[format] ?? [];
    next[format] = channels
      .filter((channel) => defaultClasses.includes(channelClassFromBufferService(channel.service)))
      .map((channel) => channel.id);
  }

  return next;
}

function toggleChannel(
  selected: SelectedChannels,
  format: FormatKey,
  channelId: string,
): SelectedChannels {
  const current = selected[format];
  const nextIds = current.includes(channelId)
    ? current.filter((id) => id !== channelId)
    : [...current, channelId];
  return { ...selected, [format]: nextIds };
}

function progressCopy(phase: UseScheduleResult["phase"]): string | null {
  if (phase === "uploading") return "Uploading to R2…";
  if (phase === "scheduling") return "Scheduling via Buffer…";
  return null;
}

function errorCopy(error: string | null): string | null {
  if (!error) return null;
  const lower = error.toLowerCase();
  if (lower.includes("upload incomplete")) return "Upload incomplete — try rendering again, then reschedule.";
  if (lower.includes("connect buffer")) return "Buffer is not connected. Connect Buffer in Settings.";
  if (lower.includes("auth")) return "Buffer authentication failed. Check your API key in Settings.";
  if (lower.includes("channel")) return "One or more channels are no longer available in Buffer. Update your channel selection.";
  if (lower.includes("rate") || lower.includes("temporarily")) return "Buffer is temporarily unavailable. Try again in a moment.";
  return "Scheduling failed. Check the terminal for details.";
}

function channelNameFor(confirmation: { channelName?: string; channelId: string }): string {
  return confirmation.channelName ?? confirmation.channelId;
}

function confirmationLine(confirmation: UseScheduleResult["confirmation"][number]): string {
  const channelName = channelNameFor(confirmation);
  if (!confirmation.scheduledAt) return `Added to queue on ${channelName}`;

  const date = new Date(confirmation.scheduledAt);
  return `Scheduled for ${date.toLocaleDateString()} at ${date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })} on ${channelName}`;
}

function SkeletonRows() {
  return (
    <div className="space-y-2">
      {FORMAT_KEYS.map((format) => (
        <div
          key={format}
          className="min-h-[44px] rounded-[8px] border-2 border-dashed border-[var(--workspace-border)] bg-[var(--workspace-surface)] animate-pulse"
        />
      ))}
    </div>
  );
}

export function SchedulePanel({ schedule, formats, activeFormat }: SchedulePanelProps) {
  const [channels, setChannels] = useState<BufferChannel[]>([]);
  const [selected, setSelected] = useState<SelectedChannels>(() => emptySelection());
  const [loading, setLoading] = useState(true);
  const [timingMode, setTimingMode] = useState<TimingMode>("queue");
  const [scheduledAtLocal, setScheduledAtLocal] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadScheduleData() {
      setLoading(true);
      const [integrations, defaults] = await Promise.all([
        fetchIntegrations(),
        fetchRoutingDefaults(),
      ]);
      if (cancelled) return;

      const bufferChannels = parseBufferChannels(integrations);
      setChannels(bufferChannels);
      setSelected(seedSelection(bufferChannels, defaults));
      setLoading(false);
    }

    void loadScheduleData().catch(() => {
      if (cancelled) return;
      setChannels([]);
      setSelected(emptySelection());
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const readyFormats = useMemo(
    () => FORMAT_KEYS.filter((format) => formats[format].phase === "done"),
    [formats],
  );
  const selections = readyFormats
    .map((format) => ({
      format,
      channelIds: selected[format],
    }))
    .filter((selection) => selection.channelIds.length > 0);
  const selectedCount = selections.reduce((total, selection) => total + selection.channelIds.length, 0);
  const inFlight = schedule.phase === "uploading" || schedule.phase === "scheduling";
  const needsExactTime = timingMode === "custom";
  const canSubmit =
    channels.length > 0 &&
    selectedCount > 0 &&
    readyFormats.length > 0 &&
    !inFlight &&
    (!needsExactTime || scheduledAtLocal.length > 0);
  const progress = progressCopy(schedule.phase);
  const visibleError = errorCopy(schedule.error);

  async function handleSubmit() {
    if (!canSubmit) return;

    await schedule.trigger({
      selections,
      scheduling:
        timingMode === "queue"
          ? { mode: "queue" }
          : { mode: "custom", scheduledAt: new Date(scheduledAtLocal).toISOString() },
    });
  }

  return (
    <div
      aria-live="polite"
      className="rounded-[8px] border border-[var(--workspace-border)] bg-[var(--workspace-bg)] p-4"
    >
      <h2 className="text-[16px] font-semibold text-[var(--workspace-forest)]">Schedule post</h2>

      {loading ? (
        <div className="mt-4">
          <SkeletonRows />
        </div>
      ) : channels.length === 0 ? (
        <p className="mt-3 text-[12px] leading-5 text-[var(--workspace-muted)]">
          Buffer not connected. Connect Buffer in Settings to schedule posts.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          {FORMAT_KEYS.map((format) => {
            const formatReady = formats[format].phase === "done";
            const headingId = `schedule-${format}-heading`;
            return (
              <fieldset
                key={format}
                aria-labelledby={headingId}
                className="rounded-[8px] border border-[var(--workspace-border)] bg-[var(--workspace-surface)] p-3"
              >
                <h3
                  id={headingId}
                  className="text-[12px] font-semibold text-[var(--workspace-forest)]"
                >
                  {FORMAT_LABELS[format]}
                </h3>
                <div className="mt-2 divide-y divide-[var(--workspace-border)]">
                  {channels.map((channel) => (
                    <label
                      key={`${format}-${channel.id}`}
                      className="flex min-h-[44px] items-center gap-3 py-2 text-[12px] text-[var(--workspace-ink)]"
                    >
                      <input
                        aria-label={channel.name}
                        type="checkbox"
                        checked={selected[format].includes(channel.id)}
                        disabled={!formatReady}
                        onChange={() => setSelected((current) => toggleChannel(current, format, channel.id))}
                        className="h-4 w-4 accent-[var(--workspace-forest)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--workspace-lime)]"
                      />
                      <span className={formatReady ? "" : "text-[var(--workspace-muted)]"}>
                        {channel.name}
                      </span>
                      <span className="ml-auto rounded border border-[var(--workspace-border)] px-2 py-1 text-[10px] font-semibold uppercase text-[var(--workspace-muted)]">
                        {channel.service}
                      </span>
                    </label>
                  ))}
                </div>
                {!formatReady ? (
                  <p className="mt-2 text-[12px] text-[var(--workspace-muted)]">
                    Render {FORMAT_LABELS[format].toLowerCase()} before scheduling.
                  </p>
                ) : null}
              </fieldset>
            );
          })}

          <div
            role="tablist"
            aria-label="Schedule timing"
            className="grid grid-cols-2 rounded-[8px] border border-[var(--workspace-border)] bg-[var(--workspace-surface)] p-1"
          >
            {([
              ["queue", "Next queue slot"],
              ["custom", "Exact time"],
            ] as const).map(([mode, label]) => {
              const active = timingMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setTimingMode(mode)}
                  className={[
                    "relative min-h-[44px] min-w-0 rounded-[6px] px-2 text-[12px] font-semibold transition-colors",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--workspace-lime)]",
                    active
                      ? "bg-[var(--workspace-lime)] text-[var(--workspace-forest)]"
                      : "text-[var(--workspace-muted)] hover:text-[var(--workspace-forest)]",
                  ].join(" ")}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {needsExactTime ? (
            <label className="block text-[12px] font-semibold text-[var(--workspace-forest)]">
              <span>Post at</span>
              <input
                type="datetime-local"
                value={scheduledAtLocal}
                onChange={(event) => setScheduledAtLocal(event.target.value)}
                className="mt-2 min-h-[44px] w-full rounded-[8px] border border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-3 text-[12px] text-[var(--workspace-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--workspace-lime)]"
              />
            </label>
          ) : null}

          {progress ? (
            <div className="flex min-h-[44px] items-center justify-center gap-2 rounded-[8px] border border-[var(--workspace-border)] bg-[var(--workspace-surface)]">
              <span
                role="status"
                aria-label={progress}
                className="h-4 w-4 rounded-full border-2 border-[var(--workspace-border)] border-t-[var(--workspace-forest)] animate-spin"
              />
              <span className="text-[12px] font-semibold text-[var(--workspace-ink)]">{progress}</span>
            </div>
          ) : (
            <button
              type="button"
              disabled={!canSubmit}
              aria-disabled={!canSubmit}
              onClick={() => void handleSubmit()}
              className="min-h-[44px] w-full rounded-[8px] bg-[var(--workspace-lime)] px-4 text-[14px] font-semibold text-[var(--workspace-forest)] hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--workspace-lime)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Schedule post
            </button>
          )}

          {schedule.phase === "done" && schedule.confirmation.length > 0 ? (
            <div className="rounded-[8px] border border-[var(--workspace-border)] bg-[rgba(135,255,92,0.18)] p-3">
              <h3 className="text-[12px] font-semibold text-[var(--workspace-forest)]">Scheduled</h3>
              <div className="mt-2 space-y-1">
                {schedule.confirmation.map((confirmation) => (
                  <p
                    key={`${confirmation.format}-${confirmation.channelId}-${confirmation.externalId ?? confirmation.status}`}
                    className="text-[12px] text-[var(--workspace-ink)]"
                  >
                    {confirmationLine(confirmation)}
                  </p>
                ))}
              </div>
            </div>
          ) : null}

          {visibleError ? <p className="text-[12px] text-red-600">{visibleError}</p> : null}

          {readyFormats.length === 0 ? (
            <p className="text-[12px] text-[var(--workspace-muted)]">
              Render images before scheduling.
            </p>
          ) : null}
          {activeFormat && formats[activeFormat].phase !== "done" && readyFormats.length > 0 ? (
            <p className="text-[12px] text-[var(--workspace-muted)]">
              The active format is not rendered yet.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
