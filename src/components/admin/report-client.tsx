"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import posthog from "posthog-js";
import { useUserId } from "@/hooks/use-user-id";
import { PixelBadge } from "./pixel-badge";
import { PixelButton } from "./pixel-button";
import { PixelEmptyState } from "./pixel-empty-state";
import { LazyMount } from "./lazy-mount";
import { DraftPreview } from "./draft-preview";
import { DraftPreviewBoundary } from "./draft-preview-boundary";
import { ApproveDraftModal } from "./approve-draft-modal";
import type { DraftConfig } from "@/lib/drafts/types";
import type { FormatKey } from "@/lib/templates/canvas-types";
import { FORMAT_DIMENSIONS } from "@/lib/templates/canvas-types";

const VALID_FORMATS: FormatKey[] = ["landscape", "square", "portrait"];

type Format =
  | "square"
  | "landscape"
  | "portrait"
  | "video-square"
  | "video-landscape"
  | "video-portrait";

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

// ISO 8601 week string in YYYY-Www form for the most recently completed week
// (the one we'd summarize on a Monday morning).
function isoWeekString(d: Date): string {
  const target = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
  const dayNum = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(
    ((target.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7,
  );
  return `${target.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function previousWeekWindow(now: Date): {
  startISO: string;
  endISO: string;
  isoWeek: string;
  startDate: Date;
  endDate: Date;
} {
  const day = now.getUTCDay();
  const daysSinceMonday = (day + 6) % 7;
  const thisMonday = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - daysSinceMonday,
      0,
      0,
      0,
      0,
    ),
  );
  const previousMonday = new Date(thisMonday.getTime() - WEEK_MS);
  return {
    startISO: previousMonday.toISOString(),
    endISO: thisMonday.toISOString(),
    isoWeek: isoWeekString(previousMonday),
    startDate: previousMonday,
    endDate: thisMonday,
  };
}

function formatDateShort(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const SOURCE_LABEL: Record<string, string> = {
  github: "GitHub",
  stripe: "Stripe",
  posthog: "PostHog",
  ga4: "GA4",
  manual: "Manual",
};

export function ReportClient() {
  const userId = useUserId();
  const [approveOpen, setApproveOpen] = useState(false);
  const [generating, setGenerating] = useState(false);

  const window = useMemo(() => previousWeekWindow(new Date()), []);

  const events = useQuery(api.triggerEvents.listByUserForWeek, {
    startISO: window.startISO,
    endISO: window.endISO,
  });
  const weeklyDraft = useQuery(api.briefings.getWeeklyDraft, {
    isoWeek: window.isoWeek,
  });
  const integrations = useQuery(api.integrationSecrets.listByUser, { userId });
  const routingRows = useQuery(api.routingDefaults.listByUser, { userId });
  const userStats = useQuery(api.userProfiles.getStats, { userId });
  const triggerWeekly = useMutation(api.briefings.triggerWeeklySummaryIfNeeded);

  // Fire weekly_report_page_viewed once per (user, isoWeek).
  useEffect(() => {
    if (events === undefined) return;
    posthog.capture("weekly_report_page_viewed", {
      iso_week: window.isoWeek,
      event_count: events.length,
      has_draft: !!weeklyDraft,
    });
  }, [window.isoWeek, events?.length, weeklyDraft?.id, events, weeklyDraft]);

  const aggregate = useMemo(() => {
    const rows = events ?? [];
    const byDecision: Record<string, number> = {};
    const approvedBySource: Record<string, number> = {};
    for (const r of rows) {
      byDecision[r.decision] = (byDecision[r.decision] ?? 0) + 1;
      if (r.decision === "approved") {
        approvedBySource[r.sourceSystem] =
          (approvedBySource[r.sourceSystem] ?? 0) + 1;
      }
    }
    return {
      total: rows.length,
      approved: byDecision["approved"] ?? 0,
      drafted: byDecision["drafted"] ?? 0,
      auto_skipped: byDecision["auto_skipped"] ?? 0,
      user_skipped: byDecision["user_skipped"] ?? 0,
      approvedBySource,
    };
  }, [events]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      await triggerWeekly({
        isoWeek: window.isoWeek,
        startISO: window.startISO,
        endISO: window.endISO,
      });
    } finally {
      setGenerating(false);
    }
  }

  // Auto-generate on first paint when there's signal but no draft yet
  // (e.g. user opened the page before Monday's cron fired).
  useEffect(() => {
    if (events === undefined || weeklyDraft === undefined) return;
    if (weeklyDraft) return;
    if (aggregate.drafted === 0 && aggregate.approved === 0) return;
    void handleGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events?.length, weeklyDraft?.id]);

  const config = useMemo(
    () => (weeklyDraft ? parseConfig(weeklyDraft.config) : null),
    [weeklyDraft],
  );
  const fmt = config ? primaryFormat(config) : "landscape";
  const dims = FORMAT_DIMENSIONS[fmt];
  const aspectStyle: React.CSSProperties = {
    aspectRatio: `${dims.width} / ${dims.height}`,
  };

  const draftedFormats: Format[] = useMemo(() => {
    if (!config) return ["landscape"];
    const f = (config.formats ?? ["landscape"]).filter(
      (x): x is FormatKey => VALID_FORMATS.includes(x as FormatKey),
    );
    return config.output === "video"
      ? f.map((x) => `video-${x}` as Format)
      : (f as Format[]);
  }, [config]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-[family-name:var(--font-press-start)] text-lg text-brand">
          Weekly report
        </h1>
        <span className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/60">
          {formatDateShort(window.startDate)} — {formatDateShort(window.endDate)}
        </span>
      </div>

      <section className="border-2 border-brand bg-white p-4 shadow-[4px_4px_0_var(--color-brand)] grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Stat label="Approved" value={aggregate.approved} />
        <Stat label="Drafted" value={aggregate.drafted} />
        <Stat label="Auto-skipped" value={aggregate.auto_skipped} />
        <Stat label="Total events" value={aggregate.total} />
      </section>

      {Object.keys(aggregate.approvedBySource).length > 0 && (
        <section className="border-2 border-brand/30 bg-surface p-4 space-y-2">
          <h2 className="font-[family-name:var(--font-press-start)] text-xs uppercase text-brand/70 tracking-wider">
            Approved by source
          </h2>
          <ul className="flex flex-wrap gap-2">
            {Object.entries(aggregate.approvedBySource).map(([src, count]) => (
              <li key={src}>
                <PixelBadge
                  variant="completed"
                  label={`${SOURCE_LABEL[src] ?? src}: ${count}`}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-[family-name:var(--font-press-start)] text-xs uppercase text-brand/70 tracking-wider">
          Summary draft
        </h2>

        {weeklyDraft === undefined ? (
          <div className="h-72 border-2 border-dashed border-brand/30 bg-surface animate-pixel-skeleton" />
        ) : !weeklyDraft ? (
          aggregate.drafted === 0 && aggregate.approved === 0 ? (
            <PixelEmptyState
              title="Quiet week"
              description="No drafts or approvals to summarize this week. Come back after your Sous-Chef sees a few triggers."
              noPrimary
              cta={{ label: "", href: "#" }}
            />
          ) : (
            <div className="border-2 border-brand bg-white p-6 text-center space-y-3">
              <p className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/80">
                {generating
                  ? "Generating your weekly summary…"
                  : "Click below to generate this week's summary."}
              </p>
              <PixelButton onClick={handleGenerate} disabled={generating}>
                {generating ? "Generating…" : "Generate now"}
              </PixelButton>
            </div>
          )
        ) : weeklyDraft.generationError ? (
          <div className="border-2 border-brand bg-surface p-6 text-center space-y-3">
            <p className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/80">
              Last attempt failed: {weeklyDraft.generationError}
            </p>
            <PixelButton onClick={handleGenerate} disabled={generating}>
              {generating ? "Retrying…" : "Regenerate"}
            </PixelButton>
          </div>
        ) : (
          <article className="border-2 border-brand bg-white p-4 shadow-[4px_4px_0_var(--color-brand)] space-y-4">
            {config && (
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
            )}
            {weeklyDraft.name && (
              <h3 className="font-[family-name:var(--font-press-start)] text-xs text-brand leading-relaxed">
                {weeklyDraft.name}
              </h3>
            )}
            {config?.notes && (
              <div className="border-l-4 border-gold bg-surface/50 px-3 py-2">
                <p className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/80 whitespace-pre-line">
                  {config.notes}
                </p>
              </div>
            )}
            <div className="flex gap-2">
              <PixelButton onClick={() => setApproveOpen(true)}>
                Send…
              </PixelButton>
              <PixelButton variant="ghost" onClick={handleGenerate} disabled={generating}>
                {generating ? "Regenerating…" : "Regenerate"}
              </PixelButton>
            </div>
          </article>
        )}
      </section>

      {approveOpen && weeklyDraft && config && (
        <ApproveDraftModal
          draftId={weeklyDraft.id}
          initialTitle={(config.objectContent?.title?.text ?? weeklyDraft.name ?? "Weekly summary").slice(0, 80)}
          initialDescription={(config.objectContent?.description?.text ?? "").slice(0, 220)}
          initialCopyByPlatform={config.copyByPlatform}
          draftFormats={draftedFormats}
          routingRows={routingRows ?? []}
          integrations={integrations ?? []}
          plan={userStats?.plan}
          approvalSurface="weekly_report"
          onClose={() => setApproveOpen(false)}
        />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="font-[family-name:var(--font-press-start)] text-2xl text-brand">
        {value}
      </div>
      <div className="font-[family-name:var(--font-press-start)] text-[10px] uppercase text-brand/60 tracking-wider">
        {label}
      </div>
    </div>
  );
}
