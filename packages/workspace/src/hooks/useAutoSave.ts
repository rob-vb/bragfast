import { useCallback, useEffect, useRef, useState } from "react";
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
  flush: () => Promise<string | null>;
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
  const pendingTimeoutRef = useRef<number | null>(null);
  const currentConfigRef = useRef<DraftConfig | null>(config);
  const savedDraftIdRef = useRef<string | null>(savedDraftId);

  const saveNow = useCallback(async (configToSave: DraftConfig): Promise<string | null> => {
    setStatus("saving");
    try {
      const currentDraftId = savedDraftIdRef.current;
      const result = currentDraftId
        ? await patchDraft(currentDraftId, configToSave)
        : await createDraft(configToSave);
      const nextDraftId = currentDraftId ?? result.draft_id;
      savedDraftIdRef.current = nextDraftId;
      setSavedDraftId(nextDraftId);
      lastSavedConfigRef.current = configToSave;
      setStatus("saved");
      return nextDraftId;
    } catch {
      setStatus("error");
      return null;
    }
  }, []);

  useEffect(() => {
    savedDraftIdRef.current = draftId;
    setSavedDraftId(draftId);
  }, [draftId]);

  useEffect(() => {
    currentConfigRef.current = config;
  }, [config]);

  useEffect(() => {
    if (config === null) {
      setStatus("idle");
      return;
    }

    if (lastSavedConfigRef.current === config) return;

    setStatus("unsaved");
    const timeout = window.setTimeout(() => {
      pendingTimeoutRef.current = null;
      void saveNow(config);
    }, SAVE_DELAY_MS);
    pendingTimeoutRef.current = timeout;

    return () => {
      window.clearTimeout(timeout);
      if (pendingTimeoutRef.current === timeout) pendingTimeoutRef.current = null;
    };
  }, [config, saveNow]);

  const flush = useCallback(async (): Promise<string | null> => {
    if (pendingTimeoutRef.current !== null) {
      window.clearTimeout(pendingTimeoutRef.current);
      pendingTimeoutRef.current = null;
    }

    const currentConfig = currentConfigRef.current;
    if (currentConfig === null || currentConfig === lastSavedConfigRef.current) {
      return savedDraftIdRef.current;
    }

    return saveNow(currentConfig);
  }, [saveNow]);

  return {
    draftId: savedDraftId,
    status,
    statusLabel: STATUS_LABELS[status],
    flush,
  };
}
