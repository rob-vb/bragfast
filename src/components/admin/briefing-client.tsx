"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import posthog from "posthog-js";
import { toast } from "sonner";
import { useUserId } from "@/hooks/use-user-id";
import { PixelBadge } from "@/components/admin/pixel-badge";
import { PixelButton } from "@/components/admin/pixel-button";
import { PixelEmptyState } from "@/components/admin/pixel-empty-state";
import {
  PixelEventCard,
  PixelEventList,
} from "@/components/admin/pixel-event-card";
import { LazyMount } from "./lazy-mount";
import { DraftPreview } from "./draft-preview";
import { DraftPreviewBoundary } from "./draft-preview-boundary";
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

type TriggerMetadata = {
  milestoneKey?: string;
  templateId?: string;
  templatePickReason?: "rule" | "haiku" | "haiku-fallback";
  templatePickRule?: string;
  templatePickKeyword?: string;
  categories?: string[];
  reason?: string;
};

const VALID_FORMATS: FormatKey[] = ["landscape", "square", "portrait"];

function parseConfig(raw: string): DraftConfig {
  try {
    return JSON.parse(raw) as DraftConfig;
  } catch {
    return { output: "image" };
  }
}

// AI-generated brag-post description, the short summary Haiku wrote about the
// PR. Stored on the draft config so this works for both drafted and
// (suppressed → low-confidence) skipped events.
function extractAiSummary(rawConfig: string | undefined): string | null {
  if (!rawConfig) return null;
  const cfg = parseConfig(rawConfig);
  const text = cfg.objectContent?.description?.text;
  return text && text.trim().length > 0 ? text.trim() : null;
}

const OVERRIDE_ERROR_COPY: Record<string, string> = {
  not_found: "Trigger event not found",
  not_skipped: "Already drafted",
  no_reference: "No source reference on this event",
  no_draft: "No suppressed draft exists for this trigger",
};

function primaryFormat(config: DraftConfig): FormatKey {
  const formats = config.formats ?? [];
  if (formats.includes("landscape")) return "landscape";
  const first = formats.find((f): f is FormatKey =>
    VALID_FORMATS.includes(f as FormatKey),
  );
  return first ?? "landscape";
}

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

function parseMetadata(raw: string | null): TriggerMetadata {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as TriggerMetadata;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const SOURCE_LABEL: Record<TriggerEventRow["sourceSystem"], string> = {
  github: "GitHub",
  stripe: "Stripe",
  posthog: "PostHog",
  ga4: "GA4",
  manual: "Manual",
  cron: "Cron",
};

// Humanized reason for the Skipped table. The webhook stores short codes
// (content_filter / rate_cap / low_confidence) plus optional metadata.
function skipReasonText(event: TriggerEventRow): string {
  const meta = parseMetadata(event.metadata);
  switch (event.reason) {
    case "content_filter": {
      const cats = meta.categories ?? [];
      return cats.length > 0
        ? `Content filter (${cats.join(", ")})`
        : "Content filter";
    }
    case "rate_cap":
      return "Rate cap (too many drafts for this repo today)";
    case "low_confidence": {
      const pct =
        typeof event.confidence === "number"
          ? ` (${Math.round(event.confidence * 100)}%)`
          : "";
      return `Low confidence${pct}`;
    }
    default:
      return event.reason ?? "Skipped";
  }
}

// Why this draft exists. Distinct from the template-pick reason.
function draftReasonText(event: TriggerEventRow): string {
  switch (event.reason) {
    case "rollup":
      return "Rolled into recent draft";
    case "user_override":
      return "Override (low-confidence)";
    default: {
      const pct =
        typeof event.confidence === "number"
          ? ` (${Math.round(event.confidence * 100)}%)`
          : "";
      return `Fresh draft${pct}`;
    }
  }
}

// Human-friendly explanation of which template was chosen and why.
function templatePickText(meta: TriggerMetadata): { id?: string; why?: string } {
  if (!meta.templateId) return {};
  if (meta.templatePickReason === "rule") {
    const kw = meta.templatePickKeyword ? ` · keyword: ${meta.templatePickKeyword}` : "";
    return {
      id: meta.templateId,
      why: `rule${meta.templatePickRule ? ` (${meta.templatePickRule})` : ""}${kw}`,
    };
  }
  if (meta.templatePickReason === "haiku") {
    return { id: meta.templateId, why: "Haiku pick" };
  }
  if (meta.templatePickReason === "haiku-fallback") {
    return { id: meta.templateId, why: "Haiku fallback" };
  }
  return { id: meta.templateId };
}

export function BriefingClient() {
  const userId = useUserId();
  const [ymd, setYmd] = useState<string>(() => todayLocalYmd());
  const [previewDraftId, setPreviewDraftId] = useState<string | null>(null);
  const [overridePending, setOverridePending] = useState<Set<string>>(
    () => new Set(),
  );

  const { startISO, endISO } = useMemo(() => localDayToUtcWindow(ymd), [ymd]);

  const events = useQuery(api.triggerEvents.listByUserForDay, {
    startISO,
    endISO,
  });
  const markBriefingSeen = useMutation(api.triggerEvents.markBriefingSeen);
  const overrideEvent = useMutation(
    api.triggerEvents.overrideAutoSkippedEvent,
  );

  async function handleOverride(eventId: string, reason: string | null) {
    setOverridePending((prev) => new Set(prev).add(eventId));
    try {
      const result = await overrideEvent({ externalId: eventId });
      if (result.ok) {
        posthog.capture("trigger_event_overridden", {
          event_id: eventId,
          reason: reason ?? "unknown",
          draft_id: result.draftExternalId,
          surface: "briefing",
        });
        toast.success("Draft restored — opening it.");
        setPreviewDraftId(result.draftExternalId);
      } else {
        toast.error(
          OVERRIDE_ERROR_COPY[result.error] ??
            `Override failed: ${result.error}`,
        );
      }
    } catch (err) {
      console.error("[briefing] override failed", err);
      toast.error("Override failed");
    } finally {
      setOverridePending((prev) => {
        const next = new Set(prev);
        next.delete(eventId);
        return next;
      });
    }
  }

  const todayYmd = todayLocalYmd();
  const isToday = ymd === todayYmd;

  const eventsLen = events?.length;

  useEffect(() => {
    if (!userId || events === undefined) return;
    void markBriefingSeen({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, eventsLen, markBriefingSeen]);

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
        <div className="space-y-3">
          <div className="h-40 border-2 border-dashed border-brand/30 bg-surface animate-pixel-skeleton" />
          <div className="h-24 border-2 border-dashed border-brand/30 bg-surface animate-pixel-skeleton" />
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
              <PixelEventList>
                {draftedEvents.map((event) => (
                  <DraftedCard
                    key={event.id}
                    event={event as TriggerEventRow}
                    onPreview={(id) => setPreviewDraftId(id)}
                  />
                ))}
              </PixelEventList>
            </section>
          )}
          {skippedEvents.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-[family-name:var(--font-press-start)] text-xs uppercase text-brand/70 tracking-wider">
                Skipped ({skippedEvents.length})
              </h2>
              <PixelEventList>
                {skippedEvents.map((event) => (
                  <SkippedCard
                    key={event.id}
                    event={event as TriggerEventRow}
                    pending={overridePending.has(event.id)}
                    onOverride={() =>
                      handleOverride(event.id, event.reason ?? null)
                    }
                  />
                ))}
              </PixelEventList>
            </section>
          )}
        </div>
      )}

      {previewDraftId && (
        <DraftPreviewModal
          draftId={previewDraftId}
          onClose={() => setPreviewDraftId(null)}
        />
      )}
    </div>
  );
}

function DraftedCard({
  event,
  onPreview,
}: {
  event: TriggerEventRow;
  onPreview: (draftId: string) => void;
}) {
  const draft = useQuery(
    api.drafts.getByExternalIdAuthed,
    event.draftExternalId ? { externalId: event.draftExternalId } : "skip",
  );
  const meta = parseMetadata(event.metadata);
  const pick = templatePickText(meta);
  const title = draft?.name;
  const summary = extractAiSummary(draft?.config);
  const kitchenHref = event.draftExternalId
    ? `/admin/kitchen?draft=${encodeURIComponent(event.draftExternalId)}`
    : "#";

  const refIsUrl =
    event.sourceReference != null && /^https?:\/\//.test(event.sourceReference);

  return (
    <PixelEventCard
      header={
        <>
          <PixelBadge
            variant="completed"
            label={SOURCE_LABEL[event.sourceSystem]}
          />
          <span className="font-[family-name:var(--font-geist-mono)] text-[12px] text-brand/70">
            {event.triggerType}
          </span>
          <span className="ml-auto font-[family-name:var(--font-geist-mono)] text-[11px] text-brand/60 whitespace-nowrap">
            {formatTime(event.created_at)}
          </span>
        </>
      }
      meta={
        <>
          <span>{draftReasonText(event)}</span>
          {pick.id && (
            <span>
              · template: <span className="text-brand/80">{pick.id}</span>
              {pick.why && <span className="text-brand/45"> ({pick.why})</span>}
            </span>
          )}
          {event.sourceReference && (
            refIsUrl ? (
              <a
                href={event.sourceReference}
                target="_blank"
                rel="noreferrer"
                className="ml-auto truncate max-w-[60%] hover:text-brand underline underline-offset-2"
              >
                {event.sourceReference}
              </a>
            ) : (
              <span className="ml-auto truncate max-w-[60%] text-brand/55">
                {event.sourceReference}
              </span>
            )
          )}
        </>
      }
      actions={
        <>
          <PixelButton
            variant="ghost"
            onClick={() => {
              if (!event.draftExternalId) return;
              onPreview(event.draftExternalId);
            }}
            disabled={!event.draftExternalId || !draft}
          >
            See preview
          </PixelButton>
          {event.draftExternalId ? (
            <Link href={kitchenHref}>
              <PixelButton>Open in Kitchen</PixelButton>
            </Link>
          ) : (
            <PixelButton disabled>Open in Kitchen</PixelButton>
          )}
        </>
      }
    >
      {title && (
        <h3 className="font-[family-name:var(--font-geist-sans)] text-base font-semibold text-brand">
          {title}
        </h3>
      )}
      {summary ? (
        <p className="font-[family-name:var(--font-geist-sans)] text-sm leading-relaxed text-brand/85 max-w-prose">
          {summary}
        </p>
      ) : (
        <p className="font-[family-name:var(--font-geist-mono)] text-[11px] text-brand/40">
          No summary
        </p>
      )}
    </PixelEventCard>
  );
}

function SkippedCard({
  event,
  pending,
  onOverride,
}: {
  event: TriggerEventRow;
  pending: boolean;
  onOverride: () => void;
}) {
  const draft = useQuery(
    api.drafts.getByExternalIdAuthed,
    event.draftExternalId ? { externalId: event.draftExternalId } : "skip",
  );
  const summary = extractAiSummary(draft?.config);
  const canOverride = event.reason === "low_confidence" && !!event.draftExternalId;
  const refIsUrl =
    event.sourceReference != null && /^https?:\/\//.test(event.sourceReference);

  return (
    <PixelEventCard
      header={
        <>
          <PixelBadge
            variant="suspended"
            label={SOURCE_LABEL[event.sourceSystem]}
          />
          <span className="font-[family-name:var(--font-geist-mono)] text-[12px] text-brand/70">
            {event.triggerType}
          </span>
          <span className="font-[family-name:var(--font-geist-sans)] text-[13px] text-brand/80">
            {skipReasonText(event)}
          </span>
          <span className="ml-auto font-[family-name:var(--font-geist-mono)] text-[11px] text-brand/60 whitespace-nowrap">
            {formatTime(event.created_at)}
          </span>
        </>
      }
      meta={
        event.sourceReference ? (
          refIsUrl ? (
            <a
              href={event.sourceReference}
              target="_blank"
              rel="noreferrer"
              className="truncate max-w-full hover:text-brand underline underline-offset-2"
            >
              {event.sourceReference}
            </a>
          ) : (
            <span className="truncate max-w-full">{event.sourceReference}</span>
          )
        ) : undefined
      }
      actions={
        canOverride ? (
          <PixelButton
            onClick={onOverride}
            disabled={pending}
            data-testid={`briefing-override-${event.id}`}
          >
            {pending ? "..." : "Draft anyway"}
          </PixelButton>
        ) : undefined
      }
    >
      {summary ? (
        <p className="font-[family-name:var(--font-geist-sans)] text-sm leading-relaxed text-brand/85 max-w-prose">
          {summary}
        </p>
      ) : (
        <p className="font-[family-name:var(--font-geist-mono)] text-[11px] text-brand/40">
          No summary
        </p>
      )}
    </PixelEventCard>
  );
}

function DraftPreviewModal({
  draftId,
  onClose,
}: {
  draftId: string;
  onClose: () => void;
}) {
  const draft = useQuery(api.drafts.getByExternalIdAuthed, { externalId: draftId });
  const config = draft ? parseConfig(draft.config) : null;
  const fmt = config ? primaryFormat(config) : "landscape";
  const dims = FORMAT_DIMENSIONS[fmt];
  const aspectStyle: React.CSSProperties = {
    aspectRatio: `${dims.width} / ${dims.height}`,
  };
  const kitchenHref = `/admin/kitchen?draft=${encodeURIComponent(draftId)}`;

  return (
    <div
      className="fixed inset-0 z-50 bg-brand/30 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white border-2 border-brand shadow-[8px_8px_0_var(--color-brand)] p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-[family-name:var(--font-press-start)] text-xs text-brand leading-relaxed">
            Draft preview
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="font-[family-name:var(--font-press-start)] text-xs text-brand/60 hover:text-brand shrink-0"
            aria-label="Close preview"
          >
            ✕
          </button>
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
          <h3 className="font-[family-name:var(--font-press-start)] text-xs text-brand leading-relaxed">
            {draft.name}
          </h3>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <PixelButton variant="ghost" onClick={onClose}>
            Close
          </PixelButton>
          <Link href={kitchenHref}>
            <PixelButton>Open in Kitchen</PixelButton>
          </Link>
        </div>
      </div>
    </div>
  );
}
