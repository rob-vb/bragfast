"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import posthog from "posthog-js";
import { toast } from "sonner";
import { PixelBadge } from "@/components/admin/pixel-badge";
import { PixelEmptyState } from "@/components/admin/pixel-empty-state";

type Decision =
  | "drafted"
  | "auto_skipped"
  | "user_skipped"
  | "approved"
  | "ignored_48h";

const DECISION_VARIANT: Record<Decision, string> = {
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

// S6.3: only auto-skip reasons where a suppressed draft exists can be overridden
// in-place. Content-filter / rate-cap paths produce no draft, so override would
// require re-running the picker — out of scope for this iteration.
const OVERRIDABLE_REASONS = new Set(["low_confidence"]);

const OVERRIDE_ERROR_COPY: Record<string, string> = {
  not_found: "Trigger event not found",
  not_skipped: "Already drafted",
  no_reference: "No source reference on this event",
  no_draft: "No suppressed draft exists for this trigger",
};

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString();
}

export function SousChefHistoryFeed({ limit = 200 }: { limit?: number } = {}) {
  const events = useQuery(api.triggerEvents.listByUser, { limit });
  const overrideEvent = useMutation(api.triggerEvents.overrideAutoSkippedEvent);
  const [pending, setPending] = useState<Set<string>>(new Set());

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
    <div data-testid="trigger-event-feed" className="border-2 border-brand bg-surface">
      <table className="w-full text-sm">
        <thead className="bg-brand/10 font-[family-name:var(--font-press-start)] text-[10px]">
          <tr>
            <th className="px-3 py-2 text-left">When</th>
            <th className="px-3 py-2 text-left">Trigger</th>
            <th className="px-3 py-2 text-left">Decision</th>
            <th className="px-3 py-2 text-left">Reason</th>
            <th className="px-3 py-2 text-left">Confidence</th>
            <th className="px-3 py-2 text-left">Reference</th>
            <th className="px-3 py-2 text-left">Action</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => {
            const decision = e.decision as Decision;
            const canOverride =
              decision === "auto_skipped" &&
              e.reason != null &&
              OVERRIDABLE_REASONS.has(e.reason);
            const isPending = pending.has(e.id);
            return (
              <tr
                key={e.id}
                data-testid={`trigger-event-row-${e.id}`}
                data-decision={decision}
                className="border-t-2 border-brand/20"
              >
                <td className="px-3 py-2 whitespace-nowrap text-brand/70">
                  {formatTimestamp(e.created_at)}
                </td>
                <td className="px-3 py-2">
                  <span className="font-mono text-xs">
                    {e.sourceSystem}:{e.triggerType}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <PixelBadge
                    label={DECISION_LABEL[decision]}
                    variant={DECISION_VARIANT[decision]}
                  />
                </td>
                <td className="px-3 py-2 text-brand/70">{e.reason ?? "—"}</td>
                <td className="px-3 py-2 text-brand/70">
                  {e.confidence !== null ? e.confidence.toFixed(2) : "—"}
                </td>
                <td className="px-3 py-2 max-w-xs truncate">
                  {e.sourceReference ? (
                    /^https?:\/\//.test(e.sourceReference) ? (
                      <a
                        href={e.sourceReference}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand underline"
                      >
                        {e.sourceReference}
                      </a>
                    ) : (
                      <span className="font-mono text-xs">
                        {e.sourceReference}
                      </span>
                    )
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-2">
                  {canOverride ? (
                    <button
                      type="button"
                      data-testid={`trigger-event-override-${e.id}`}
                      onClick={() => handleOverride(e.id, e.reason)}
                      disabled={isPending}
                      className="font-[family-name:var(--font-press-start)] text-[9px] px-2 py-1 border-2 border-brand bg-gold text-brand shadow-[2px_2px_0_var(--color-brand)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all disabled:opacity-50"
                    >
                      {isPending ? "..." : "Draft anyway"}
                    </button>
                  ) : (
                    <span className="text-brand/30">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
