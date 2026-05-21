import { useState } from "react";
import type { RenderPhase } from "../hooks/useRender";
import type { FormatKey, FormatRenderState } from "../types";

const FORMAT_KEYS: FormatKey[] = ["landscape", "square", "portrait"];

interface RenderPanelProps {
  renderPhase: RenderPhase;
  formats: Record<"landscape" | "square" | "portrait", FormatRenderState>;
  jobId: string | null;
  caption: string;
  activeFormat: FormatKey;
  onTrigger: () => Promise<void>;
  onReveal: () => void;
}

function labelFor(format: FormatKey): string {
  return format[0].toUpperCase() + format.slice(1);
}

function outputUrl(jobId: string, format: FormatKey): string {
  return `/output/${encodeURIComponent(jobId)}/${format}.jpg`;
}

function actionClassName(): string {
  return "flex min-h-[44px] items-center rounded-[8px] border border-[var(--workspace-border)] bg-white px-3 text-[12px] font-semibold text-[var(--workspace-forest)] hover:bg-[var(--workspace-surface)]";
}

function FormatStatusRow({
  format,
  state,
  jobId,
}: {
  format: FormatKey;
  state: FormatRenderState;
  jobId: string | null;
}) {
  const label = labelFor(format);

  return (
    <div className="flex min-h-[44px] items-center gap-2 border-b border-[var(--workspace-border)] py-2 last:border-b-0">
      {state.phase === "pending" ? (
        <span
          role="status"
          aria-label={`Rendering ${format}`}
          className="h-4 w-4 rounded-full border-2 border-[var(--workspace-border)] border-t-[var(--workspace-forest)] animate-spin"
        />
      ) : state.phase === "done" ? (
        <span aria-hidden className="h-2 w-2 rounded-full bg-[var(--workspace-lime)]" />
      ) : state.phase === "failed" ? (
        <span aria-hidden className="text-red-500">x</span>
      ) : (
        <span aria-hidden className="h-2 w-2 rounded-full bg-[var(--workspace-border)]" />
      )}

      <span
        className={[
          "text-[12px] font-semibold",
          state.phase === "idle" ? "text-[var(--workspace-muted)]" : "text-[var(--workspace-forest)]",
          state.phase === "pending" ? "text-[var(--workspace-ink)]" : "",
        ].join(" ")}
      >
        {state.phase === "pending"
          ? `${label} rendering...`
          : state.phase === "failed"
            ? `${label} failed`
            : label}
      </span>

      {state.phase === "failed" ? (
        <span className="ml-2 rounded bg-red-500/10 px-2 py-0.5 text-[12px] text-red-600">
          {state.error}
        </span>
      ) : null}

      {state.phase === "done" && jobId ? (
        <a
          href={outputUrl(jobId, format)}
          download={`${format}.jpg`}
          aria-label={`Download ${format} image`}
          className="ml-auto flex min-h-[44px] items-center text-[12px] font-semibold text-[var(--workspace-forest)] underline underline-offset-2"
        >
          Download {format}
        </a>
      ) : null}
    </div>
  );
}

export function RenderPanel({
  renderPhase,
  formats,
  jobId,
  caption,
  activeFormat,
  onTrigger,
  onReveal,
}: RenderPanelProps) {
  const [copied, setCopied] = useState(false);
  const activeState = formats[activeFormat];
  const showActions = renderPhase === "done" || renderPhase === "partial";
  const showRows = renderPhase !== "idle";
  const showRetry = renderPhase === "failed-all";
  const showPreview = showActions && activeState.phase === "done";
  const buttonDisabled = renderPhase === "flushing" || renderPhase === "rendering";
  const buttonLabel = renderPhase === "flushing" ? "Saving..." : showRetry ? "Retry render" : "Render images";

  function handleCopy() {
    void navigator.clipboard.writeText(caption).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div
      aria-live="polite"
      className="mt-4 rounded-[8px] border border-[var(--workspace-border)] bg-[var(--workspace-bg)] p-4"
    >
      {renderPhase === "failed-all" ? (
        <p className="mb-3 text-[12px] text-red-600">Render failed. Check the terminal for details.</p>
      ) : null}

      {renderPhase === "idle" || showRetry || renderPhase === "flushing" ? (
        <button
          type="button"
          disabled={buttonDisabled}
          aria-disabled={buttonDisabled}
          onClick={() => void onTrigger()}
          className="min-h-[44px] w-full rounded-[8px] bg-[var(--workspace-lime)] px-4 text-[14px] font-semibold text-[var(--workspace-forest)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {buttonLabel}
        </button>
      ) : null}

      {showRows ? (
        <div className={renderPhase === "failed-all" ? "mt-4" : ""}>
          <h2 className="mb-2 text-[16px] font-semibold text-[var(--workspace-forest)]">
            Rendered images
          </h2>
          <div>
            {FORMAT_KEYS.map((format) => (
              <FormatStatusRow key={format} format={format} state={formats[format]} jobId={jobId} />
            ))}
          </div>
        </div>
      ) : null}

      {showPreview && activeState.phase === "done" ? (
        <img
          src={activeState.url}
          alt={`${activeFormat} render preview`}
          className="mt-4 w-full rounded-[8px] border border-[var(--workspace-border)]"
        />
      ) : null}

      {showActions ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={handleCopy} className={actionClassName()}>
            {copied ? "Copied!" : "Copy caption"}
          </button>

          {activeState.phase === "done" && jobId ? (
            <a
              href={outputUrl(jobId, activeFormat)}
              download={`${activeFormat}.jpg`}
              aria-label={`Download ${activeFormat} image`}
              className={actionClassName()}
            >
              Download {activeFormat}
            </a>
          ) : null}

          <button
            type="button"
            onClick={onReveal}
            aria-label="Open output folder in file manager"
            className={actionClassName()}
          >
            Open folder
          </button>
        </div>
      ) : null}
    </div>
  );
}
