"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
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

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString();
}

export function SousChefHistoryFeed() {
  const events = useQuery(api.triggerEvents.listByUser, { limit: 200 });

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
          </tr>
        </thead>
        <tbody>
          {events.map((e) => {
            const decision = e.decision as Decision;
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
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
