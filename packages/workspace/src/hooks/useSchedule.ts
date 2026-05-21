import { useCallback, useEffect, useRef, useState } from "react";
import { saveRoutingDefault, schedulePost } from "../api";
import type {
  ScheduleChannel,
  ScheduleConfirmation,
  SchedulePhase,
  ScheduleRequest,
} from "../types";

export interface UseScheduleArgs {
  flush: () => Promise<string | null>;
  caption: string;
}

export interface UseScheduleResult {
  phase: SchedulePhase;
  confirmation: ScheduleConfirmation[];
  error: string | null;
  trigger: (request: Omit<ScheduleRequest, "draftId" | "caption">) => Promise<void>;
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

function channelsForDefault(channelIds: string[]): ScheduleChannel[] {
  return channelIds.map((channelId) => ({
    provider: "buffer",
    channelId,
  }));
}

export function useSchedule({ flush, caption }: UseScheduleArgs): UseScheduleResult {
  const [phase, setPhase] = useState<SchedulePhase>("idle");
  const [confirmation, setConfirmation] = useState<ScheduleConfirmation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const phaseRef = useRef<SchedulePhase>(phase);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const trigger = useCallback(
    async (request: Omit<ScheduleRequest, "draftId" | "caption">): Promise<void> => {
      if (phaseRef.current === "uploading" || phaseRef.current === "scheduling") return;

      phaseRef.current = "uploading";
      setPhase("uploading");
      setConfirmation([]);
      setError(null);

      const draftId = await flush();
      if (draftId === null) {
        phaseRef.current = "failed";
        setPhase("failed");
        setError("Save failed before schedule");
        return;
      }

      phaseRef.current = "scheduling";
      setPhase("scheduling");

      try {
        await Promise.all(
          request.selections.map((selection) =>
            saveRoutingDefault(selection.format, channelsForDefault(selection.channelIds)),
          ),
        );

        const result = await schedulePost({
          draftId,
          caption,
          selections: request.selections,
          scheduling: request.scheduling,
        });

        phaseRef.current = "done";
        setConfirmation(result.confirmation);
        setPhase("done");
      } catch (err) {
        phaseRef.current = "failed";
        setConfirmation([]);
        setError(errorMessage(err, "Schedule request failed"));
        setPhase("failed");
      }
    },
    [caption, flush],
  );

  return {
    phase,
    confirmation,
    error,
    trigger,
  };
}
