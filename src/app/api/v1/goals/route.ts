import { authenticate } from "@/lib/auth/authenticate";
import { fetchQuery, fetchMutation } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { validateGoalInput } from "@/lib/goals/types";
import type { GoalProvider, GoalMetric, GoalInput } from "@/lib/goals/types";

function parseCreateBody(raw: unknown): GoalInput | { error: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { error: "invalid body" };
  }
  const b = raw as Record<string, unknown>;

  const PROVIDERS: GoalProvider[] = ["stripe", "posthog", "ga4", "github"];
  const METRICS: GoalMetric[] = [
    "mrr", "total_revenue", "subscribers", "first_sale", "visitors", "stars",
  ];

  if (!PROVIDERS.includes(b.provider as GoalProvider)) {
    return { error: "provider must be one of: stripe, posthog, ga4, github" };
  }
  if (!METRICS.includes(b.metric as GoalMetric)) {
    return { error: "metric must be one of: mrr, total_revenue, subscribers, first_sale, visitors, stars" };
  }

  const input: GoalInput = {
    provider: b.provider as GoalProvider,
    metric: b.metric as GoalMetric,
    enabled: b.enabled !== false,
  };

  if (b.target !== undefined) {
    if (typeof b.target !== "number" || b.target <= 0) {
      return { error: "target must be a positive number" };
    }
    input.target = b.target;
  }

  if (typeof b.scope === "string" && b.scope) {
    input.scope = b.scope;
  }

  if (typeof b.label === "string" && b.label) {
    input.label = b.label;
  }

  const validationError = validateGoalInput(input);
  if (validationError) return { error: validationError };

  return input;
}

type StripeSnap = { mrrUsd?: number; totalRevenueUsd?: number; activeSubscriberCount?: number };
type VisitorSnap = { visitors?: number };

function currentValueForGoal(
  provider: string,
  metric: string,
  scope: string | null,
  secretSnaps: Record<string, unknown>,
  githubStarMap: Record<string, number>,
): number | null {
  if (provider === "stripe") {
    const s = secretSnaps.stripe as StripeSnap | undefined;
    if (!s) return null;
    if (metric === "mrr") return s.mrrUsd ?? null;
    if (metric === "total_revenue") return s.totalRevenueUsd ?? null;
    if (metric === "subscribers") return s.activeSubscriberCount ?? null;
    return null;
  }
  if (provider === "posthog") {
    const s = secretSnaps.posthog as VisitorSnap | undefined;
    return s?.visitors ?? null;
  }
  if (provider === "ga4") {
    const s = secretSnaps.ga4 as VisitorSnap | undefined;
    return s?.visitors ?? null;
  }
  if (provider === "github" && scope) {
    return githubStarMap[scope] ?? null;
  }
  return null;
}

export async function GET(request: Request) {
  const auth = await authenticate(request);
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [goals, integrations, installations] = await Promise.all([
    fetchQuery(api.goals.listByUser, { userId: auth.userId }),
    fetchQuery(api.integrationSecrets.listByUser, { userId: auth.userId }).catch(() => [] as never[]),
    fetchQuery(api.githubInstallations.listByUserId, { userId: auth.userId }).catch(() => [] as never[]),
  ]);

  const secretSnaps: Record<string, unknown> = {};
  for (const row of integrations) {
    if (row.lastSnapshotJson) {
      try { secretSnaps[row.provider] = JSON.parse(row.lastSnapshotJson); } catch { /* ignore */ }
    }
  }

  const githubStarMap: Record<string, number> = {};
  for (const inst of installations) {
    if (inst.lastSnapshotJson) {
      try {
        Object.assign(githubStarMap, JSON.parse(inst.lastSnapshotJson) as Record<string, number>);
      } catch { /* ignore */ }
    }
  }

  const enriched = goals.map((g) => ({
    ...g,
    currentValue: currentValueForGoal(g.provider, g.metric, g.scope, secretSnaps, githubStarMap),
  }));

  return Response.json({ goals: enriched });
}

export async function POST(request: Request) {
  const auth = await authenticate(request);
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400 });
  }

  const body = parseCreateBody(raw);
  if ("error" in body) {
    return Response.json({ error: body.error }, { status: 400 });
  }

  try {
    const goal = await fetchMutation(api.goals.create, {
      userId: auth.userId,
      provider: body.provider,
      metric: body.metric,
      target: body.target,
      scope: body.scope,
      label: body.label,
      enabled: body.enabled,
    });
    return Response.json(goal, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("requires")) {
      return Response.json({ error: msg }, { status: 400 });
    }
    console.error("[goals] create failed:", err);
    return Response.json({ error: "Failed to create goal" }, { status: 500 });
  }
}
