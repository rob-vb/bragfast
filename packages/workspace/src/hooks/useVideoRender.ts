import { useCallback, useEffect, useRef, useState } from "react";
import { pollVideoRenderStatus, triggerVideoRender } from "../api";
import type { FormatKey, VideoRenderPhase } from "../types";

const POLL_INTERVAL_MS = 1000;

export interface UseVideoRenderArgs {
  flush: () => Promise<string | null>;
  activeFormat: FormatKey;
}

export interface UseVideoRenderResult {
  renderPhase: VideoRenderPhase;
  framesRendered: number;
  totalFrames: number;
  downloadPct: number;
  url: string | null;
  jobId: string | null;
  error: string | null;
  trigger: () => Promise<void>;
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export function useVideoRender({
  flush,
  activeFormat,
}: UseVideoRenderArgs): UseVideoRenderResult {
  const [renderPhase, setRenderPhase] = useState<VideoRenderPhase>("idle");
  const [framesRendered, setFramesRendered] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);
  const [downloadPct, setDownloadPct] = useState(0);
  const [url, setUrl] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const renderPhaseRef = useRef<VideoRenderPhase>(renderPhase);

  useEffect(() => {
    renderPhaseRef.current = renderPhase;
  }, [renderPhase]);

  const trigger = useCallback(async (): Promise<void> => {
    if (
      renderPhaseRef.current === "flushing" ||
      renderPhaseRef.current === "chrome-download" ||
      renderPhaseRef.current === "rendering"
    ) {
      return;
    }

    setRenderPhase("flushing");
    setFramesRendered(0);
    setTotalFrames(0);
    setDownloadPct(0);
    setUrl(null);
    setError(null);

    const draftId = await flush();
    if (draftId === null) {
      setRenderPhase("failed");
      setError("Save failed before render");
      setJobId(null);
      return;
    }

    try {
      const job = await triggerVideoRender(draftId, activeFormat);
      setJobId(job.id);
      setRenderPhase("rendering");
    } catch (err) {
      setRenderPhase("failed");
      setError(errorMessage(err, "Video render request failed"));
      setJobId(null);
    }
  }, [activeFormat, flush]);

  useEffect(() => {
    if (jobId === null) return;

    const pollTick = async () => {
      try {
        const response = await pollVideoRenderStatus(jobId);
        setFramesRendered(response.framesRendered);
        setTotalFrames(response.totalFrames);
        setDownloadPct(response.downloadPct);
        if (response.url) setUrl(response.url);
        if (response.error) setError(response.error);

        if (response.phase !== "pending") {
          setRenderPhase(response.phase);
        }

        if (response.phase === "done" || response.phase === "failed") {
          window.clearInterval(interval);
        }
      } catch (err) {
        window.clearInterval(interval);
        setRenderPhase("failed");
        setError(errorMessage(err, "Video render status polling failed"));
      }
    };

    const interval = window.setInterval(() => {
      void pollTick();
    }, POLL_INTERVAL_MS);
    void pollTick();

    return () => window.clearInterval(interval);
  }, [jobId]);

  return {
    renderPhase,
    framesRendered,
    totalFrames,
    downloadPct,
    url,
    jobId,
    error,
    trigger,
  };
}
