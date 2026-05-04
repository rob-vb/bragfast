"use client";

import { useState } from "react";
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
  sourceReference: string | null;
  draftExternalId?: string | null;
  created_at: string;
};

const DECISION_VARIANT: Record<Decision, "completed" | "suspended"> = {
  drafted: "completed",
  approved: "completed",
  auto_skipped: "suspended",
  user_skipped: "suspended",
  ignored_48h: "suspended",
};

const DECISION_LABEL: Record<Decision, string> = {
  drafted: "DRAFTED",
  approved: "APPROVED",
  auto_skipped: "AUTO-SKIP",
  user_skipped: "DISMISSED",
  ignored_48h: "IGNORED",
};

const SOURCE_LABEL: Record<EventRow["sourceSystem"], string> = {
  github: "GitHub",
  stripe: "Stripe",
  posthog: "PostHog",
  ga4: "GA4",
  manual: "Manual",
  cron: "Cron",
};

const OVERRIDABLE_REASONS = new Set(["low_confidence"]);

const OVERRIDE_ERROR_COPY: Record<string, string> = {
  not_found: "Trigger event not found",
  not_skipped: "Already drafted",
  no_reference: "No source reference on this event",
  no_draft: "No suppressed draft exists for this trigger",
};

function parseConfig(raw: string | undefined): DraftConfig | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DraftConfig;
  } catch {
    return null;
  }
}

function extractAiSummary(rawConfig: string | undefined): string | null {
  const cfg = parseConfig(rawConfig);
  const text = cfg?.objectContent?.description?.text;
  return text && text.trim().length > 0 ? text.trim() : null;
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString();
}

export function SousChefHistoryFeed({
  limit = 200,
  excludeDismissed = false,
}: { limit?: number; excludeDismissed?: boolean } = {}) {
  // Over-fetch when filtering so the post-filter list still hits `limit`.
  const fetchLimit = excludeDismissed ? limit * 4 : limit;
  const raw = useQuery(api.triggerEvents.listByUser, { limit: fetchLimit });
  const overrideEvent = useMutation(api.triggerEvents.overrideAutoSkippedEvent);
  const [pending, setPending] = useState<Set<string>>(new Set());

  const events = raw
    ? excludeDismissed
      ? raw.filter((e) => e.decision !== "user_skipped").slice(0, limit)
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
        title="No trigger events yet"
        description="Sous-Chef logs every trigger it sees here — drafts, skips, approvals."
        noPrimary
        cta={{ label: "", href: "#" }}
      />
    );
  }

  async function handleOverride(eventId: string, reason: string | null) {
    setPending((prev) => new Set(prev).add(eventId));
    try {
      const result = await overrideEvent({ externalId: eventId });
      if (result.ok) {
        posthog.capture("trigger_event_overridden", {
          event_id: eventId,
          reason: reason ?? "unknown",
          draft_id: result.draftExternalId,
          surface: "sous_chef_history",
        });
        toast.success("Draft restored — review it on the Drafts page.");
      } else {
        toast.error(
          OVERRIDE_ERROR_COPY[result.error] ??
            `Override failed: ${result.error}`,
        );
      }
    } catch (err) {
      console.error("[sous-chef] override failed", err);
      toast.error("Override failed");
    } finally {
      setPending((prev) => {
        const next = new Set(prev);
        next.delete(eventId);
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
            pending={pending.has(e.id)}
            onOverride={() => handleOverride(e.id, e.reason)}
          />
        ))}
      </PixelEventList>
    </div>
  );
}

function FeedCard({
  event,
  pending,
  onOverride,
}: {
  event: EventRow;
  pending: boolean;
  onOverride: () => void;
}) {
  const decision = event.decision;
  const draft = useQuery(
    api.drafts.getByExternalIdAuthed,
    event.draftExternalId ? { externalId: event.draftExternalId } : "skip",
  );
  const summary = extractAiSummary(draft?.config);
  const canOverride =
    decision === "auto_skipped" &&
    event.reason != null &&
    OVERRIDABLE_REASONS.has(event.reason);

  const refIsUrl =
    event.sourceReference != null && /^https?:\/\//.test(event.sourceReference);

  return (
    <PixelEventCard
      testId={`trigger-event-row-${event.id}`}
      dataAttrs={{ "data-decision": decision }}
      header={
        <>
          <PixelBadge
            variant={DECISION_VARIANT[decision]}
            label={SOURCE_LABEL[event.sourceSystem]}
          />
          <span className="font-[family-name:var(--font-geist-mono)] text-[12px] text-brand/70">
            {event.triggerType}
          </span>
          <PixelBadge
            label={DECISION_LABEL[decision]}
            variant={DECISION_VARIANT[decision]}
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
            <span className="text-brand/30">no reason</span>
          )}
          {event.confidence !== null && (
            <span>· {(event.confidence * 100).toFixed(0)}% conf</span>
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
        canOverride ? (
          <PixelButton
            onClick={onOverride}
            disabled={pending}
            data-testid={`trigger-event-override-${event.id}`}
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
