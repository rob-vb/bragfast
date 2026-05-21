import { useEffect, useRef, useState } from "react";
import { createDraft, patchDraft } from "../api";
import type { DraftConfig } from "../types";

export type SaveStatus = "idle" | "unsaved" | "saving" | "saved" | "error";

export interface UseAutoSaveArgs {
  draftId: string | null;
  config: DraftConfig | null;
}

export interface UseAutoSaveResult {
  draftId: string | null;
  status: SaveStatus;
  statusLabel: "Unsaved" | "Saving..." | "Saved" | "Save failed - retrying on next edit";
}

const SAVE_DELAY_MS = 900;

const STATUS_LABELS: Record<SaveStatus, UseAutoSaveResult["statusLabel"]> = {
  idle: "Unsaved",
  unsaved: "Unsaved",
  saving: "Saving...",
  saved: "Saved",
  error: "Save failed - retrying on next edit",
};

export function useAutoSave({ draftId, config }: UseAutoSaveArgs): UseAutoSaveResult {
  const [savedDraftId, setSavedDraftId] = useState<string | null>(draftId);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const lastSavedConfigRef = useRef<DraftConfig | null>(null);

  useEffect(() => {
    setSavedDraftId(draftId);
  }, [draftId]);

  useEffect(() => {
    if (config === null) {
      setStatus("idle");
      return;
    }

    if (lastSavedConfigRef.current === config) return;

    setStatus("unsaved");
    const timeout = window.setTimeout(() => {
      void (async () => {
        setStatus("saving");
        try {
          const currentDraftId = savedDraftId;
          const result = currentDraftId
            ? await patchDraft(currentDraftId, config)
            : await createDraft(config);
          const nextDraftId = currentDraftId ?? result.draft_id;
          setSavedDraftId(nextDraftId);
          lastSavedConfigRef.current = config;
          setStatus("saved");
        } catch {
          setStatus("error");
        }
      })();
    }, SAVE_DELAY_MS);

    return () => window.clearTimeout(timeout);
  }, [config, savedDraftId]);

  return {
    draftId: savedDraftId,
    status,
    statusLabel: STATUS_LABELS[status],
  };
}
