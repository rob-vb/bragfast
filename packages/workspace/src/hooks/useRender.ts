import { useCallback, useEffect, useRef, useState } from "react";
import { pollRenderStatus, triggerRender } from "../api";
import type { FormatKey, FormatRenderState } from "../types";

const FORMAT_KEYS: FormatKey[] = ["landscape", "square", "portrait"];
const POLL_INTERVAL_MS = 1000;

export type RenderPhase =
  | "idle"
  | "flushing"
  | "rendering"
  | "done"
  | "failed-all"
  | "partial";

export interface UseRenderArgs {
  flush: () => Promise<string | null>;
}

export interface UseRenderResult {
  renderPhase: RenderPhase;
  formats: Record<"landscape" | "square" | "portrait", FormatRenderState>;
  jobId: string | null;
  trigger: () => Promise<void>;
}

function idleFormats(): UseRenderResult["formats"] {
  return {
    landscape: { phase: "idle" },
    square: { phase: "idle" },
    portrait: { phase: "idle" },
  };
}

function pendingFormats(): UseRenderResult["formats"] {
  return {
    landscape: { phase: "pending" },
    square: { phase: "pending" },
    portrait: { phase: "pending" },
  };
}

function failedFormats(error: string): UseRenderResult["formats"] {
  return {
    landscape: { phase: "failed", error },
    square: { phase: "failed", error },
    portrait: { phase: "failed", error },
  };
}

function isTerminal(formats: UseRenderResult["formats"]): boolean {
  return FORMAT_KEYS.every((format) => {
    const phase = formats[format].phase;
    return phase === "done" || phase === "failed";
  });
}

function terminalPhase(formats: UseRenderResult["formats"]): RenderPhase {
  const done = FORMAT_KEYS.filter((format) => formats[format].phase === "done").length;
  const failed = FORMAT_KEYS.filter((format) => formats[format].phase === "failed").length;
  if (done === FORMAT_KEYS.length) return "done";
  if (failed === FORMAT_KEYS.length) return "failed-all";
  return "partial";
}

export function useRender({ flush }: UseRenderArgs): UseRenderResult {
  const [renderPhase, setRenderPhase] = useState<RenderPhase>("idle");
  const [formats, setFormats] = useState<UseRenderResult["formats"]>(idleFormats);
  const [jobId, setJobId] = useState<string | null>(null);
  const renderPhaseRef = useRef<RenderPhase>(renderPhase);

  useEffect(() => {
    renderPhaseRef.current = renderPhase;
  }, [renderPhase]);

  const trigger = useCallback(async (): Promise<void> => {
    if (renderPhaseRef.current === "flushing" || renderPhaseRef.current === "rendering") return;

    setRenderPhase("flushing");
    setFormats(pendingFormats());

    const draftId = await flush();
    if (draftId === null) {
      setFormats(failedFormats("Save failed before render"));
      setRenderPhase("failed-all");
      setJobId(null);
      return;
    }

    setFormats(pendingFormats());
    try {
      const job = await triggerRender(draftId);
      setJobId(job.id);
      setRenderPhase("rendering");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Render request failed";
      setFormats(failedFormats(message));
      setRenderPhase("failed-all");
      setJobId(null);
    }
  }, [flush]);

  useEffect(() => {
    if (jobId === null) return;

    const pollTick = async () => {
      try {
        const response = await pollRenderStatus(jobId);
        setFormats(response.formats);
        if (isTerminal(response.formats)) {
          window.clearInterval(interval);
          setRenderPhase(terminalPhase(response.formats));
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Render status polling failed";
        window.clearInterval(interval);
        setFormats(failedFormats(message));
        setRenderPhase("failed-all");
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
    formats,
    jobId,
    trigger,
  };
}
