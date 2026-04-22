import type { ComposeCopyInput } from "../drafts/compose-copy";
import type { PickTemplateInput } from "../drafts/pick-template";
import {
  buildIdempotencyKey,
  prMergedMilestoneKey,
} from "../drafts/idempotency-key";

// Minimum shape of a GitHub pull_request webhook payload.
export type GitHubPullRequestPayload = {
  action: string;
  installation?: { id: number };
  pull_request: {
    number: number;
    merged: boolean;
    title: string;
    body: string | null;
    html_url: string;
    base: { ref: string };
  };
  repository: {
    full_name: string;
    default_branch: string;
  };
};

// True when the webhook describes a PR merge into the repo's default branch.
// False for drafts, reopens, closes-without-merge, or merges to a non-default branch.
export function shouldHandlePrMerge(
  payload: GitHubPullRequestPayload,
): boolean {
  if (payload.action !== "closed") return false;
  if (!payload.pull_request.merged) return false;
  return payload.pull_request.base.ref === payload.repository.default_branch;
}

export type PrMergeDraftInput = {
  userId: string;
  idempotencyKey: string;
  milestoneKey: string;
  eventReference: string;
  pickTemplateInput: PickTemplateInput;
  composeCopyInput: ComposeCopyInput;
  repoFullName: string;
  prNumber: number;
};

export function buildPrMergeDraftInput(
  payload: GitHubPullRequestPayload,
  userId: string,
  brand?: { brandName?: string; brandVoice?: string },
): PrMergeDraftInput {
  const repoFullName = payload.repository.full_name;
  const prNumber = payload.pull_request.number;
  const milestoneKey = prMergedMilestoneKey(repoFullName, prNumber);
  const idempotencyKey = buildIdempotencyKey(userId, "github", milestoneKey);
  const title = payload.pull_request.title;
  const body = payload.pull_request.body ?? "";

  return {
    userId,
    idempotencyKey,
    milestoneKey,
    eventReference: payload.pull_request.html_url,
    pickTemplateInput: {
      milestoneKey,
      prContext: { title, body },
    },
    composeCopyInput: {
      type: "pr_merged",
      title,
      body,
      repoFullName,
      brandName: brand?.brandName,
      brandVoice: brand?.brandVoice,
    },
    repoFullName,
    prNumber,
  };
}
