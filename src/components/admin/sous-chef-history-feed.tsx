"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import posthog from "posthog-js";
import { toast } from "sonner";
import { PixelBadge } from "@/components/admin/pixel-badge";
import { PixelButton } from "@/components/admin/pixel-button";
import { PixelEmptyState } from "@/components/admin/pixel-empty-state";
import { PixelEventCard, PixelEventList } from "@/components/admin/pixel-event-card";
import type { DraftConfig } from "@/lib/drafts/types";

type Decision =
  | "surfaced"
  | "bragged"
  | "dismissed"
  | "drafted"
  | "auto_skipped"
  | "user_skipped"
  | "approved"
  | "ignored_48h";

type EventRow = {
  id: string;
  sourceSystem: "github" | "stripe" | "posthog" | "ga4" | "manual" | "cron";
  triggerType: string;
  decision: Decision;
  reason: string | null;
  confidence: number | null;
  summary: string | null;
  sourceReference: string | null;
  draftExternalId?: string | null;
  created_at: string;
};

const SOURCE_LABEL: Record<EventRow["sourceSystem"], string> = {
  github: "GitHub",
  stripe: "Stripe",
  posthog: "PostHog",
  ga4: "GA4",
  manual: "Manual",
  cron: "Cron",
};

const SCORE_MUTED_THRESHOLD = 0.45;

function parseConfig(raw: string | undefined): DraftConfig | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DraftConfig;
  } catch {
    return null;
  }
}

function extractLegacyDraftSummary(rawConfig: string | undefined): string | null {
  const cfg = parseConfig(rawConfig);
  const text = cfg?.objectContent?.description?.text;
  return text && text.trim().length > 0 ? text.trim() : null;
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString();
}

function decisionLabel(decision: Decision): string {
  switch (decision) {
    case "surfaced":
      return "SURFACED";
    case "bragged":
      return "BRAGGED";
    case "dismissed":
    case "user_skipped":
      return "DISMISSED";
    case "drafted":
      return "DRAFTED";
    case "approved":
      return "APPROVED";
    case "auto_skipped":
      return "LOW SCORE";
    case "ignored_48h":
      return "IGNORED";
    default:
      return String(decision).toUpperCase();
  }
}

function decisionVariant(
  decision: Decision,
): "completed" | "suspended" {
  if (decision === "approved" || decision === "bragged" || decision === "drafted") {
    return "completed";
  }
  if (decision === "surfaced") return "completed";
  return "suspended";
}

function canBrag(event: EventRow): boolean {
  if (event.decision === "bragged" && event.draftExternalId) return true;
  return (
    event.decision === "surfaced" ||
    event.decision === "drafted" ||
    event.decision === "auto_skipped"
  );
}

function canDismiss(event: EventRow): boolean {
  return event.decision === "surfaced" || event.decision === "auto_skipped";
}

export function SousChefHistoryFeed({
  limit = 200,
  excludeDismissed = false,
}: { limit?: number; excludeDismissed?: boolean } = {}) {
  const router = useRouter();
  const fetchLimit = excludeDismissed ? limit * 4 : limit;
  const raw = useQuery(api.triggerEvents.listByUser, { limit: fetchLimit });
  const bragTrigger = useMutation(api.triggerEvents.bragFromTrigger);
  const dismissTrigger = useMutation(api.triggerEvents.dismissTrigger);
  const [pending, setPending] = useState<Set<string>>(new Set());

  const events = raw
    ? excludeDismissed
      ? raw
          .filter(
            (e) =>
              e.decision !== "user_skipped" && e.decision !== "dismissed",
          )
          .slice(0, limit)
      : raw
    : raw;

  if (!events) {
    return (
      <div className="h-32 border-2 border-dashed border-brand/30 bg-surface animate-pixel-skeleton" />
    );
  }

  if (events.length === 0) {
    return (
      <PixelEmptyState
        title="No activity yet"
        description="Merged PRs and other triggers show up here — hit Brag when you want to make a post."
        noPrimary
        cta={{ label: "", href: "#" }}
      />
    );
  }

  async function handleBrag(eventId: string) {
    setPending((prev) => new Set(prev).add(`brag:${eventId}`));
    try {
      const result = await bragTrigger({ externalId: eventId });
      if (result.ok) {
        posthog.capture("trigger_bragged", {
          event_id: eventId,
          draft_id: result.draftExternalId,
          created: result.created,
          surface: "activity_feed",
        });
        router.push(
          `/admin/kitchen?draft=${encodeURIComponent(result.draftExternalId)}`,
        );
      } else {
        toast.error(
          result.error === "not_braggable"
            ? "This trigger can't be bragged."
            : `Brag failed: ${result.error}`,
        );
      }
    } catch (err) {
      console.error("[activity-feed] brag failed", err);
      toast.error("Brag failed");
    } finally {
      setPending((prev) => {
        const next = new Set(prev);
        next.delete(`brag:${eventId}`);
        return next;
      });
    }
  }

  async function handleDismiss(eventId: string) {
    setPending((prev) => new Set(prev).add(`dismiss:${eventId}`));
    try {
      const result = await dismissTrigger({ externalId: eventId });
      if (result.ok) {
        posthog.capture("trigger_dismissed", {
          event_id: eventId,
          surface: "activity_feed",
        });
      } else if (result.error !== "already_dismissed") {
        toast.error("Dismiss failed");
      }
    } catch (err) {
      console.error("[activity-feed] dismiss failed", err);
      toast.error("Dismiss failed");
    } finally {
      setPending((prev) => {
        const next = new Set(prev);
        next.delete(`dismiss:${eventId}`);
        return next;
      });
    }
  }

  return (
    <div data-testid="trigger-event-feed">
      <PixelEventList>
        {events.map((e) => (
          <FeedCard
            key={e.id}
            event={e as EventRow}
            bragPending={pending.has(`brag:${e.id}`)}
            dismissPending={pending.has(`dismiss:${e.id}`)}
            onBrag={() => handleBrag(e.id)}
            onDismiss={() => handleDismiss(e.id)}
          />
        ))}
      </PixelEventList>
    </div>
  );
}

function FeedCard({
  event,
  bragPending,
  dismissPending,
  onBrag,
  onDismiss,
}: {
  event: EventRow;
  bragPending: boolean;
  dismissPending: boolean;
  onBrag: () => void;
  onDismiss: () => void;
}) {
  const draft = useQuery(
    api.drafts.getByExternalIdAuthed,
    event.draftExternalId && !event.summary
      ? { externalId: event.draftExternalId }
      : "skip",
  );
  const summary =
    event.summary?.trim() ||
    extractLegacyDraftSummary(draft?.config) ||
    null;
  const score = event.confidence;
  const muted =
    score !== null && score < SCORE_MUTED_THRESHOLD && event.decision === "surfaced";

  const refIsUrl =
    event.sourceReference != null && /^https?:\/\//.test(event.sourceReference);

  return (
    <PixelEventCard
      testId={`trigger-event-row-${event.id}`}
      dataAttrs={{
        "data-decision": event.decision,
        ...(score != null ? { "data-confidence": String(score) } : {}),
      }}
      header={
        <>
          <PixelBadge
            variant={decisionVariant(event.decision)}
            label={SOURCE_LABEL[event.sourceSystem]}
          />
          <span className="font-[family-name:var(--font-geist-mono)] text-[12px] text-brand/70">
            {event.triggerType}
          </span>
          {score !== null && (
            <span
              className={`font-[family-name:var(--font-geist-mono)] text-[11px] ${
                muted ? "text-brand/45" : "text-gold"
              }`}
            >
              {(score * 100).toFixed(0)}% brag-worthy
            </span>
          )}
          <PixelBadge
            label={decisionLabel(event.decision)}
            variant={decisionVariant(event.decision)}
          />
          <span className="ml-auto font-[family-name:var(--font-geist-mono)] text-[11px] text-brand/60 whitespace-nowrap">
            {formatTimestamp(event.created_at)}
          </span>
        </>
      }
      meta={
        <>
          {event.reason ? (
            <span>{event.reason}</span>
          ) : (
            <span className="text-brand/30">—</span>
          )}
          {event.sourceReference ? (
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
          ) : null}
        </>
      }
      actions={
        <div className="flex flex-wrap gap-2">
          {canBrag(event) ? (
            <PixelButton
              onClick={onBrag}
              disabled={bragPending}
              data-testid={`trigger-event-brag-${event.id}`}
            >
              {bragPending
                ? "..."
                : event.decision === "bragged"
                  ? "Open in Kitchen"
                  : "Brag"}
            </PixelButton>
          ) : null}
          {canDismiss(event) ? (
            <PixelButton
              variant="ghost"
              onClick={onDismiss}
              disabled={dismissPending}
              data-testid={`trigger-event-dismiss-${event.id}`}
            >
              {dismissPending ? "..." : "Dismiss"}
            </PixelButton>
          ) : null}
        </div>
      }
    >
      {summary ? (
        <p
          className={`font-[family-name:var(--font-geist-sans)] text-sm leading-relaxed max-w-prose ${
            muted ? "text-brand/65" : "text-brand/85"
          }`}
        >
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
