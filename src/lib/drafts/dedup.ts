/**
 * Pure-function dedup + collision rules for insertDraftIfNew.
 * Extracted from the Convex mutation so the regression test can exercise the
 * logic without spinning up convex-test. The mutation composes this with
 * `ctx.db` calls.
 */

export type DraftDedupRow = {
  userId: string;
  repoFullName?: string;
  windowStart: number;
};

export type ReleaseCollisionRow = {
  userId: string;
  status: string;
  sourceMetadata?: string;
};

export type DedupInput = {
  userId: string;
  repoFullName?: string;
  windowStart: number;
  sourceCommitShas?: string[];
};

export type DedupDecision =
  | { inserted: true }
  | { inserted: false; reason: "dedup" | "collision" };

export function shouldInsertDraft(args: {
  input: DedupInput;
  existingDrafts: DraftDedupRow[];
  recentReleases: ReleaseCollisionRow[];
}): DedupDecision {
  const { input, existingDrafts, recentReleases } = args;

  if (input.repoFullName) {
    const dup = existingDrafts.find(
      (d) =>
        d.userId === input.userId &&
        d.repoFullName === input.repoFullName &&
        d.windowStart === input.windowStart,
    );
    if (dup) return { inserted: false, reason: "dedup" };
  }

  if (input.sourceCommitShas && input.sourceCommitShas.length > 0 && input.repoFullName) {
    const repoPrefix = `"repoFullName":"${input.repoFullName}"`;
    const shaSet = new Set(input.sourceCommitShas);
    const activeStatuses = new Set(["pending", "pending_review", "completed"]);

    const collision = recentReleases.find((r) => {
      if (r.userId !== input.userId) return false;
      if (!r.sourceMetadata || !r.sourceMetadata.includes(repoPrefix)) return false;
      if (!activeStatuses.has(r.status)) return false;
      try {
        const meta = JSON.parse(r.sourceMetadata) as { commitShas?: string[] };
        return meta.commitShas?.some((sha) => shaSet.has(sha));
      } catch {
        return false;
      }
    });
    if (collision) return { inserted: false, reason: "collision" };
  }

  return { inserted: true };
}
