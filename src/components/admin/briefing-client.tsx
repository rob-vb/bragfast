"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import posthog from "posthog-js";
import { useUserId } from "@/hooks/use-user-id";
import { PixelBadge } from "@/components/admin/pixel-badge";
import { PixelButton } from "@/components/admin/pixel-button";
import { PixelEmptyState } from "@/components/admin/pixel-empty-state";
import { LazyMount } from "./lazy-mount";
import { DraftPreview } from "./draft-preview";
import { DraftPreviewBoundary } from "./draft-preview-boundary";
import { ApproveDraftModal } from "./approve-draft-modal";
import type { DraftConfig } from "@/lib/drafts/types";
import type { FormatKey } from "@/lib/templates/canvas-types";
import { FORMAT_DIMENSIONS } from "@/lib/templates/canvas-types";

type Decision =
  | "drafted"
  | "auto_skipped"
  | "user_skipped"
  | "approved"
  | "ignored_48h";

type TriggerEventRow = {
  id: string;
  sourceSystem: "github" | "stripe" | "posthog" | "ga4" | "manual" | "cron";
  triggerType: string;
  decision: Decision;
  reason: string | null;
  confidence: number | null;
  sourceReference: string | null;
  draftExternalId: string | null;
  metadata: string | null;
  created_at: string;
};

type Format =
  | "square"
  | "landscape"
  | "portrait"
  | "video-square"
  | "video-landscape"
  | "video-portrait";

const VALID_FORMATS: FormatKey[] = ["landscape", "square", "portrait"];

function parseConfig(raw: string): DraftConfig {
  try {
    return JSON.parse(raw) as DraftConfig;
  } catch {
    return { output: "image" };
  }
}

function primaryFormat(config: DraftConfig): FormatKey {
  const formats = config.formats ?? [];
  if (formats.includes("landscape")) return "landscape";
  const first = formats.find((f): f is FormatKey =>
    VALID_FORMATS.includes(f as FormatKey),
  );
  return first ?? "landscape";
}

// Format YYYY-MM-DD → human "May 3, 2026" in user's locale.
function formatHumanDate(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// User's local-day window in UTC ISO strings. Day boundary is the user's
// local midnight, converted to UTC — so a user in PT viewing "May 3" sees
// trigger events from PT midnight to PT midnight even though the underlying
// data is timestamped in UTC.
function localDayToUtcWindow(ymd: string): { startISO: string; endISO: string } {
  const [y, m, d] = ymd.split("-").map(Number);
  const start = new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
  const end = new Date(y, (m ?? 1) - 1, (d ?? 1) + 1, 0, 0, 0, 0);
  return { startISO: start.toISOString(), endISO: end.toISOString() };
}

function todayLocalYmd(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function shiftYmd(ymd: string, deltaDays: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, (d ?? 1) + deltaDays);
  const ny = date.getFullYear();
  const nm = String(date.getMonth() + 1).padStart(2, "0");
  const nd = String(date.getDate()).padStart(2, "0");
  return `${ny}-${nm}-${nd}`;
}

function parseMetadataReason(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { reason?: unknown };
    if (typeof parsed.reason === "string") return parsed.reason;
  } catch {
    // metadata is sometimes plain text
    return raw;
  }
  return null;
}

const SOURCE_LABEL: Record<TriggerEventRow["sourceSystem"], string> = {
  github: "GitHub",
  stripe: "Stripe",
  posthog: "PostHog",
  ga4: "GA4",
  manual: "Manual",
  cron: "Cron",
};

export function BriefingClient() {
  const userId = useUserId();
  const [ymd, setYmd] = useState<string>(() => todayLocalYmd());
  const [approveDraftId, setApproveDraftId] = useState<string | null>(null);

  const { startISO, endISO } = useMemo(() => localDayToUtcWindow(ymd), [ymd]);

  const events = useQuery(api.triggerEvents.listByUserForDay, {
    startISO,
    endISO,
  });
  const integrations = useQuery(api.integrationSecrets.listByUser, { userId });
  const routingRows = useQuery(api.routingDefaults.listByUser, { userId });
  const userStats = useQuery(api.userProfiles.getStats, { userId });
  const markBriefingSeen = useMutation(api.triggerEvents.markBriefingSeen);

  const todayYmd = todayLocalYmd();
  const isToday = ymd === todayYmd;

  const eventsLen = events?.length;

  // Stamp last-visit time once events have arrived. Covers the cleared-badge
  // requirement without thrashing the mutation on every render.
  useEffect(() => {
    if (!userId || events === undefined) return;
    void markBriefingSeen({});
    // eventsLen pin is intentional — we re-stamp when the event count changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, eventsLen, markBriefingSeen]);

  // Fire briefing_page_viewed once per (user, ymd) pair.
  useEffect(() => {
    if (events === undefined) return;
    posthog.capture("briefing_page_viewed", {
      day: ymd,
      event_count: events.length,
      drafted_count: events.filter((e) => e.decision === "drafted").length,
      skipped_count: events.filter((e) => e.decision === "auto_skipped").length,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ymd, eventsLen]);

  const draftedEvents = useMemo(
    () => (events ?? []).filter((e) => e.decision === "drafted"),
    [events],
  );
  const skippedEvents = useMemo(
    () => (events ?? []).filter((e) => e.decision === "auto_skipped"),
    [events],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-[family-name:var(--font-press-start)] text-lg text-brand">
          Briefing
        </h1>
        <div className="flex items-center gap-2">
          <PixelButton
            variant="ghost"
            onClick={() => setYmd(shiftYmd(ymd, -1))}
            aria-label="Previous day"
          >
            ←
          </PixelButton>
          <span className="font-[family-name:var(--font-geist-sans)] text-sm text-brand min-w-44 text-center">
            {formatHumanDate(ymd)}
          </span>
          <PixelButton
            variant="ghost"
            onClick={() => setYmd(shiftYmd(ymd, 1))}
            disabled={isToday}
            aria-label="Next day"
          >
            →
          </PixelButton>
          {!isToday && (
            <PixelButton
              variant="ghost"
              onClick={() => setYmd(todayYmd)}
              aria-label="Today"
            >
              Today
            </PixelButton>
          )}
        </div>
      </div>

      {events === undefined ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-72 border-2 border-dashed border-brand/30 bg-surface animate-pixel-skeleton"
            />
          ))}
        </div>
      ) : events.length === 0 ? (
        <PixelEmptyState
          title="Nothing yet for this day"
          description="When Sous-Chef sees a trigger — a PR merge, a milestone, a goal hit — it lands here."
          noPrimary
          cta={{ label: "", href: "#" }}
        />
      ) : (
        <div className="space-y-8">
          {draftedEvents.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-[family-name:var(--font-press-start)] text-xs uppercase text-brand/70 tracking-wider">
                Drafted ({draftedEvents.length})
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {draftedEvents.map((event) => (
                  <BriefingCard
                    key={event.id}
                    event={event as TriggerEventRow}
                    onSend={(draftId) => setApproveDraftId(draftId)}
                  />
                ))}
              </div>
            </section>
          )}
          {skippedEvents.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-[family-name:var(--font-press-start)] text-xs uppercase text-brand/70 tracking-wider">
                Skipped ({skippedEvents.length})
              </h2>
              <ul className="space-y-2">
                {skippedEvents.map((event) => (
                  <SkippedRow key={event.id} event={event as TriggerEventRow} />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {approveDraftId && (
        <ApproveDraftModalLoader
          draftId={approveDraftId}
          routingRows={routingRows ?? []}
          integrations={integrations ?? []}
          plan={userStats?.plan}
          onClose={() => setApproveDraftId(null)}
        />
      )}
    </div>
  );
}

function BriefingCard({
  event,
  onSend,
}: {
  event: TriggerEventRow;
  onSend: (draftId: string) => void;
}) {
  const draft = useQuery(
    api.drafts.getByExternalIdAuthed,
    event.draftExternalId ? { externalId: event.draftExternalId } : "skip",
  );

  const config = useMemo(
    () => (draft ? parseConfig(draft.config) : null),
    [draft],
  );
  const fmt = config ? primaryFormat(config) : "landscape";
  const dims = FORMAT_DIMENSIONS[fmt];
  const aspectStyle: React.CSSProperties = {
    aspectRatio: `${dims.width} / ${dims.height}`,
  };
  const reason = parseMetadataReason(event.metadata);

  return (
    <article className="border-2 border-brand bg-white p-4 shadow-[4px_4px_0_var(--color-brand)] space-y-3">
      <div className="flex items-center justify-between gap-2">
        <PixelBadge variant="completed" label={SOURCE_LABEL[event.sourceSystem]} />
        <span className="font-[family-name:var(--font-geist-mono)] text-[11px] text-brand/60">
          {new Date(event.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>

      {config ? (
        <DraftPreviewBoundary
          fallback={
            <div
              className="border-2 border-dashed border-brand/30 bg-surface"
              style={aspectStyle}
            />
          }
        >
          <LazyMount
            rootMargin="200px"
            placeholder={
              <div
                className="border-2 border-dashed border-brand/30 bg-surface animate-pixel-skeleton"
                style={aspectStyle}
              />
            }
          >
            <DraftPreview config={config} />
          </LazyMount>
        </DraftPreviewBoundary>
      ) : (
        <div
          className="border-2 border-dashed border-brand/30 bg-surface animate-pixel-skeleton"
          style={aspectStyle}
        />
      )}

      {draft?.name && (
        <h3 className="font-[family-name:var(--font-press-start)] text-xs text-brand leading-relaxed line-clamp-2">
          {draft.name}
        </h3>
      )}

      {reason && (
        <div className="border-l-4 border-gold bg-surface/50 px-3 py-2">
          <div className="font-[family-name:var(--font-press-start)] text-[10px] uppercase text-brand/60 mb-1">
            Why this matters
          </div>
          <p className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/80">
            {reason}
          </p>
        </div>
      )}

      {event.sourceReference && (
        <div className="font-[family-name:var(--font-geist-mono)] text-[11px] text-brand/50 truncate">
          {event.sourceReference}
        </div>
      )}

      <div className="flex gap-2">
        <PixelButton
          onClick={() => {
            if (!event.draftExternalId) return;
            onSend(event.draftExternalId);
          }}
          disabled={!event.draftExternalId || !draft}
        >
          Send…
        </PixelButton>
      </div>
    </article>
  );
}

function SkippedRow({ event }: { event: TriggerEventRow }) {
  return (
    <li className="border-2 border-brand/30 bg-surface px-4 py-3 flex items-start justify-between gap-3">
      <div className="space-y-1 flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <PixelBadge variant="suspended" label={SOURCE_LABEL[event.sourceSystem]} />
          <span className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/80">
            {event.triggerType}
          </span>
          {event.reason && (
            <span className="font-[family-name:var(--font-geist-mono)] text-[11px] text-brand/60">
              · {event.reason}
            </span>
          )}
        </div>
        {event.sourceReference && (
          <div className="font-[family-name:var(--font-geist-mono)] text-[11px] text-brand/50 truncate">
            {event.sourceReference}
          </div>
        )}
      </div>
      <span className="font-[family-name:var(--font-geist-mono)] text-[11px] text-brand/50 shrink-0">
        {new Date(event.created_at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </span>
    </li>
  );
}

// Wrapper that loads the draft + builds ApproveDraftModal props from a
// draftExternalId. Lives inside the briefing page so we don't have to
// hard-route to /admin/kitchen for sending.
function ApproveDraftModalLoader({
  draftId,
  routingRows,
  integrations,
  plan,
  onClose,
}: {
  draftId: string;
  routingRows: Array<{ format: string; channels: Array<{ provider: "buffer" | "postiz"; channelId: string }> }>;
  integrations: Array<{ provider: string; enabled: boolean; extra: string | null }>;
  plan: string | undefined;
  onClose: () => void;
}) {
  const draft = useQuery(api.drafts.getByExternalIdAuthed, { externalId: draftId });
  if (!draft) return null;
  const config = parseConfig(draft.config);
  const objectContent = config.objectContent ?? {};
  const title = objectContent.title?.text ?? draft.name ?? "Untitled";
  const description = objectContent.description?.text ?? "";
  const formats = (config.formats ?? ["landscape"]).filter(
    (f): f is FormatKey => VALID_FORMATS.includes(f as FormatKey),
  );
  const draftFormats: Format[] =
    config.output === "video"
      ? formats.map((f) => `video-${f}` as Format)
      : (formats as Format[]);

  return (
    <ApproveDraftModal
      draftId={draftId}
      initialTitle={title.slice(0, 80)}
      initialDescription={description.slice(0, 220)}
      initialCopyByPlatform={config.copyByPlatform}
      draftFormats={draftFormats}
      routingRows={routingRows}
      integrations={integrations}
      plan={plan}
      approvalSurface="briefing"
      onClose={onClose}
    />
  );
}
