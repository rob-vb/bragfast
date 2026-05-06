"use node";

import type { ActionCtx } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { buildIdempotencyKey, goalMilestoneKey } from "../src/lib/drafts/idempotency-key";
import {
  composeCopy,
  type ComposeCopyInput,
  type VoicePreset,
} from "../src/lib/drafts/compose-copy";
import { pickTemplate } from "../src/lib/drafts/pick-template";
import type { DraftConfig } from "../src/lib/drafts/types";
import {
  typedMilestoneKey,
  type GoalMetric,
  type GoalProvider,
} from "../src/lib/goals/types";
import {
  captureFromConvex,
  daysBetween,
  goalCategoryFromMetric,
} from "./posthogCapture";

type GoalHitDraftGoal = {
  externalId: string;
  metric: GoalMetric;
  target: number | null;
  scope: string | null;
};

export async function createGoalHitDraft(
  ctx: ActionCtx,
  input: {
    userId: string;
    sourceSystem: "github" | "stripe" | "posthog" | "ga4";
    provider: GoalProvider;
    goal: GoalHitDraftGoal;
    composeInput: ComposeCopyInput;
  },
): Promise<void> {
  const milestoneKey = typedMilestoneKey({
    metric: input.goal.metric,
    target: input.goal.target ?? undefined,
    scope: input.goal.scope ?? undefined,
    provider: input.provider,
  });
  const idempotencyKey = buildIdempotencyKey(
    input.userId,
    input.sourceSystem,
    goalMilestoneKey(input.goal.externalId),
  );

  const [profile, examples] = await Promise.all([
    ctx.runQuery(internal.userProfiles.getByUserIdInternal, {
      userId: input.userId,
    }),
    ctx.runQuery(api.drafts.getRecentApprovedEdits, { userId: input.userId }),
  ]);
  const voicePreset = (profile?.voicePreset ?? null) as VoicePreset | null;
  const composeInput = {
    ...input.composeInput,
    voicePreset,
    examples,
  } as ComposeCopyInput;

  const [pick, copy] = await Promise.all([
    pickTemplate({ milestoneKey }),
    composeCopy(composeInput),
  ]);

  const draftConfig: DraftConfig = {
    output: "image",
    templateId: pick.templateId,
    objectContent: {
      title: { text: copy.title },
      description: { text: copy.description },
    },
    notes: `Sous-Chef: ${milestoneKey}`,
  };

  await ctx.runMutation(internal.drafts.insertDraftIfNew, {
    userId: input.userId,
    idempotencyKey,
    sourceSystem: input.sourceSystem,
    milestoneKey,
    name: copy.title,
    config: JSON.stringify(draftConfig),
    createdBy: "sous-chef",
  });

  const fireResult = await ctx.runMutation(internal.goals.markFired, {
    externalId: input.goal.externalId,
  });

  if (fireResult.firstHit && fireResult.userId) {
    await ctx.scheduler.runAfter(0, internal.goalEmails.sendCelebrationEmail, {
      userId: fireResult.userId,
      label: fireResult.label,
      metric: fireResult.metric,
      target: fireResult.target,
      scope: fireResult.scope,
    });
    await captureFromConvex({
      event: "goal_hit",
      distinctId: fireResult.userId,
      properties: {
        goal_category: goalCategoryFromMetric(fireResult.metric),
        days_from_goal_set: daysBetween(
          fireResult.createdAt,
          new Date().toISOString(),
        ),
      },
    });
  }
}
