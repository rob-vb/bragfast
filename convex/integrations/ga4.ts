"use node";

import { JWT } from "google-auth-library";
import { internalAction } from "../_generated/server";
import type { ActionCtx } from "../_generated/server";
import { internal, api } from "../_generated/api";
import { v } from "convex/values";
import { open } from "../../src/lib/crypto/secret-box";
import {
  parseGa4VisitorMilestoneKey,
  detectCrossedGa4Thresholds,
} from "../../src/lib/integrations/ga4-milestones";
import {
  buildIdempotencyKey,
  visitorsMilestoneKey,
} from "../../src/lib/drafts/idempotency-key";
import { composeCopy } from "../../src/lib/drafts/compose-copy";
import { pickTemplate } from "../../src/lib/drafts/pick-template";
import type { DraftConfig } from "../../src/lib/drafts/types";

type Ga4Extra = {
  propertyId: string;
};

type ServiceAccountKey = {
  client_email: string;
  private_key: string;
};

async function readState(ctx: ActionCtx, userId: string): Promise<{
  creds: ServiceAccountKey;
  extra: Ga4Extra;
  alreadyHit: number[];
} | null> {
  const sealed = await ctx.runQuery(
    internal.integrationSecrets.getSealedForScan,
    { userId, provider: "ga4" },
  );
  if (!sealed || !sealed.extra) return null;

  const credsJson = open({
    ciphertext: sealed.ciphertext,
    iv: sealed.iv,
    tag: sealed.tag,
  });
  let creds: ServiceAccountKey;
  try {
    creds = JSON.parse(credsJson) as ServiceAccountKey;
  } catch {
    return null;
  }
  if (!creds.client_email || !creds.private_key) return null;

  let extra: Ga4Extra;
  try {
    extra = JSON.parse(sealed.extra) as Ga4Extra;
  } catch {
    return null;
  }
  if (!extra.propertyId) return null;

  const hitKeys = await ctx.runQuery(api.milestoneHits.listByUserSource, {
    userId,
    sourceSystem: "ga4",
  });
  const alreadyHit = (hitKeys as string[])
    .map(parseGa4VisitorMilestoneKey)
    .filter((n): n is number => n !== null);

  return { creds, extra, alreadyHit };
}

async function fetchTotalUsers30d(
  creds: ServiceAccountKey,
  extra: Ga4Extra,
): Promise<number> {
  const client = new JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
  });
  const tokenResponse = await client.getAccessToken();
  const token = tokenResponse.token;
  if (!token) throw new Error("GA4: failed to obtain access token");

  const response = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${extra.propertyId}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
        metrics: [{ name: "totalUsers" }],
      }),
    },
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `GA4 runReport failed (${response.status}): ${text.slice(0, 300)}`,
    );
  }
  const json = (await response.json()) as {
    rows?: Array<{ metricValues?: Array<{ value?: string }> }>;
  };
  const raw = json.rows?.[0]?.metricValues?.[0]?.value;
  const count = raw ? parseInt(raw, 10) : 0;
  return Number.isFinite(count) ? count : 0;
}

export const scan = internalAction({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    try {
      const state = await readState(ctx, userId);
      if (!state) return { skipped: "not_connected" };
      const visitors = await fetchTotalUsers30d(state.creds, state.extra);
      const newThresholds = detectCrossedGa4Thresholds(
        visitors,
        state.alreadyHit,
      );
      for (const threshold of newThresholds) {
        await fireDraft(ctx, userId, threshold);
      }
      await ctx.runMutation(internal.integrationSecrets.recordScanResult, {
        userId,
        provider: "ga4",
        ok: true,
      });
      return { ok: true, visitors, fired: newThresholds };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await ctx.runMutation(internal.integrationSecrets.recordScanResult, {
        userId,
        provider: "ga4",
        ok: false,
        error: msg.slice(0, 500),
      });
      console.error(`[sous-chef] GA4 scan failed for ${userId}:`, err);
      return { ok: false, error: msg };
    }
  },
});

export const seedFromCurrentState = internalAction({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const state = await readState(ctx, userId);
    if (!state) return { skipped: "not_connected" };
    const visitors = await fetchTotalUsers30d(state.creds, state.extra);
    const crossed = detectCrossedGa4Thresholds(visitors, []);
    for (const threshold of crossed) {
      await ctx.runMutation(internal.milestoneHits.seedAlreadyHit, {
        userId,
        sourceSystem: "ga4",
        milestoneKey: visitorsMilestoneKey("ga4", threshold),
      });
    }
    return { seeded: crossed, visitors };
  },
});

export const scanAll = internalAction({
  args: {},
  handler: async (ctx): Promise<{ scheduled: number }> => {
    const enabled = await ctx.runQuery(
      internal.integrationSecrets.listEnabledByProvider,
      { provider: "ga4" },
    );
    for (const row of enabled as Array<{ userId: string }>) {
      await ctx.scheduler.runAfter(0, internal.integrations.ga4.scan, {
        userId: row.userId,
      });
    }
    return { scheduled: enabled.length };
  },
});

async function fireDraft(
  ctx: ActionCtx,
  userId: string,
  threshold: number,
): Promise<void> {
  const milestoneKey = visitorsMilestoneKey("ga4", threshold);
  const idempotencyKey = buildIdempotencyKey(userId, "ga4", milestoneKey);
  const [pick, copy] = await Promise.all([
    pickTemplate({ milestoneKey }),
    composeCopy({ type: "visitors", source: "ga4", threshold }),
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
    userId,
    idempotencyKey,
    sourceSystem: "ga4",
    milestoneKey,
    name: copy.title,
    config: JSON.stringify(draftConfig),
    createdBy: "sous-chef",
  });
}
