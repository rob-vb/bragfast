"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";

interface ReleaseProgress {
  status: "pending" | "pending_review" | "completed" | "failed" | "dismissed";
  progress: number | undefined;
}

export function useReleaseProgress(cookId: string | undefined): ReleaseProgress | null {
  const release = useQuery(
    api.releases.getByExternalId,
    cookId ? { externalId: cookId } : "skip"
  );

  if (!release) return null;

  return {
    status: release.status,
    progress: release.progress ?? undefined,
  };
}
