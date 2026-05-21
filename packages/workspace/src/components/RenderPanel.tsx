import { useState } from "react";
import type { RenderPhase } from "../hooks/useRender";
import type { DraftOutput, FormatKey, FormatRenderState, VideoRenderPhase } from "../types";

const FORMAT_KEYS: FormatKey[] = ["landscape", "square", "portrait"];

interface RenderPanelProps {
  output: DraftOutput;
  renderPhase: RenderPhase;
  formats: Record<"landscape" | "square" | "portrait", FormatRenderState>;
  jobId: string | null;
  caption: string;
  activeFormat: FormatKey;
  onTrigger: () => Promise<void>;
  onReveal: () => void;
  videoRenderPhase?: VideoRenderPhase;
  framesRendered?: number;
  totalFrames?: number;
  downloadPct?: number;
  videoUrl?: string | null;
  onVideoTrigger?: () => Promise<void>;
}

function labelFor(format: FormatKey): string {
  return format[0].toUpperCase() + format.slice(1);
}

function actionClassName(): string {
  return "flex min-h-[44px] items-center rounded-[8px] border border-[var(--workspace-border)] bg-white px-3 text-[12px] font-semibold text-[var(--workspace-forest)] hover:bg-[var(--workspace-surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--workspace-lime)]";
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
          ? `${label} rendering…`
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
          href={state.url}
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
  output,
  renderPhase,
  formats,
  jobId,
  caption,
  activeFormat,
  onTrigger,
  onReveal,
  videoRenderPhase = "idle",
  framesRendered = 0,
  totalFrames = 0,
  downloadPct = 0,
  videoUrl = null,
  onVideoTrigger,
}: RenderPanelProps) {
  const [copied, setCopied] = useState(false);
  const activeState = formats[activeFormat];
  const showImageActions = output === "image" && (renderPhase === "done" || renderPhase === "partial");
  const showRows = output === "image" && renderPhase !== "idle";
  const showRetry = renderPhase === "failed-all";
  const showPreview = showImageActions && activeState.phase === "done";
  const buttonDisabled = renderPhase === "flushing" || renderPhase === "rendering";
  const buttonLabel = renderPhase === "flushing" ? "Saving…" : showRetry ? "Retry render" : "Render images";
  const showVideoButton =
    output === "video" &&
    (videoRenderPhase === "idle" || videoRenderPhase === "flushing" || videoRenderPhase === "failed");
  const videoButtonDisabled = videoRenderPhase === "flushing";
  const videoButtonLabel =
    videoRenderPhase === "flushing"
      ? "Saving…"
      : videoRenderPhase === "failed"
        ? "Retry render"
        : "Render video";

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
      {output === "image" && renderPhase === "failed-all" ? (
        <p className="mb-3 text-[12px] text-red-600">Render failed. Check the terminal for details.</p>
      ) : null}

      {output === "video" && videoRenderPhase === "failed" ? (
        <p className="mb-3 text-[12px] text-red-600">Render failed. Check the terminal for details.</p>
      ) : null}

      {output === "image" && (renderPhase === "idle" || showRetry || renderPhase === "flushing") ? (
        <button
          type="button"
          disabled={buttonDisabled}
          aria-disabled={buttonDisabled}
          onClick={() => void onTrigger()}
          className="min-h-[44px] w-full rounded-[8px] bg-[var(--workspace-lime)] px-4 text-[14px] font-semibold text-[var(--workspace-forest)] hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--workspace-lime)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {buttonLabel}
        </button>
      ) : null}

      {showVideoButton ? (
        <button
          type="button"
          disabled={videoButtonDisabled}
          aria-disabled={videoButtonDisabled}
          onClick={() => void onVideoTrigger?.()}
          className="min-h-[44px] w-full rounded-[8px] bg-[var(--workspace-lime)] px-4 text-[14px] font-semibold text-[var(--workspace-forest)] hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--workspace-lime)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {videoButtonLabel}
        </button>
      ) : null}

      {output === "video" && videoRenderPhase === "idle" ? (
        <p className="mt-2 text-[12px] text-[var(--workspace-muted)]">
          Drop a video into the visual slot first.
        </p>
      ) : null}

      {output === "video" && videoRenderPhase === "chrome-download" ? (
        <div className="space-y-2">
          <h2 className="text-[12px] font-semibold text-[var(--workspace-forest)]">One-time setup</h2>
          <p className="text-[12px] leading-5 text-[var(--workspace-muted)]">
            Downloading Chrome renderer (~170 MB). This only happens once.
          </p>
          <div
            role="progressbar"
            aria-valuenow={downloadPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Chrome download progress"
            className="h-2 w-full rounded-full bg-[var(--workspace-border)]"
          >
            <div
              className="h-2 rounded-full bg-[var(--workspace-lime)]"
              style={{ width: `${downloadPct}%` }}
            />
          </div>
          <p className="text-[12px] text-[var(--workspace-muted)]">
            {downloadPct}% — Render will start automatically.
          </p>
        </div>
      ) : null}

      {output === "video" && videoRenderPhase === "rendering" ? (
        <div className="flex min-h-[44px] items-center gap-2">
          <span
            role="status"
            aria-label="Rendering video"
            className="h-4 w-4 rounded-full border-2 border-[var(--workspace-border)] border-t-[var(--workspace-forest)] animate-spin"
          />
          <span className="text-[12px] font-semibold text-[var(--workspace-ink)]">
            Rendering video…
          </span>
          <span
            aria-live="polite"
            className="ml-auto font-[Geist_Mono,monospace] text-[12px] text-[var(--workspace-forest)]"
          >
            {framesRendered} / {totalFrames} frames
          </span>
        </div>
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

      {output === "video" && videoRenderPhase === "done" && videoUrl ? (
        <video
          src={videoUrl}
          muted
          controls
          aria-label="Rendered video preview"
          className="mt-4 w-full rounded-[8px] border border-[var(--workspace-border)]"
        />
      ) : null}

      {showImageActions ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={handleCopy} className={actionClassName()}>
            {copied ? "Copied!" : "Copy caption"}
          </button>

          {activeState.phase === "done" && jobId ? (
            <a
              href={activeState.url}
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

      {output === "video" && videoRenderPhase === "done" && videoUrl ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={handleCopy} className={actionClassName()}>
            {copied ? "Copied!" : "Copy caption"}
          </button>

          <a
            href={videoUrl}
            download={`${activeFormat}.mp4`}
            aria-label="Download rendered video"
            className={actionClassName()}
          >
            Download video
          </a>

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
