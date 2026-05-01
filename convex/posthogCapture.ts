"use node";

// Server-side PostHog capture from Convex node actions. Mirrors
// src/lib/analytics/posthog-server.ts but lives inside convex/ because
// convex modules can't import from the Next.js src tree.
//
// Fire-and-forget: failures logged, never thrown.

const ENDPOINT_PATH = "/capture/";

type CaptureInput = {
  event: string;
  distinctId: string;
  properties?: Record<string, unknown>;
};

export async function captureFromConvex(input: CaptureInput): Promise<void> {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host =
    process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
  if (!key) return;

  try {
    const res = await fetch(`${host.replace(/\/$/, "")}${ENDPOINT_PATH}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        event: input.event,
        distinct_id: input.distinctId,
        properties: input.properties ?? {},
        timestamp: new Date().toISOString(),
      }),
    });
    if (!res.ok) {
      console.warn(
        `[posthog-convex] capture ${input.event} returned ${res.status}`,
      );
    }
  } catch (err) {
    console.warn(`[posthog-convex] capture ${input.event} failed:`, err);
  }
}

// Map a goal metric to the goal_category dimension used in the goal_set /
// goal_hit event contract (PRD §13). Mirrors the four categories from
// src/components/admin/goal-create-modal.tsx.
export function goalCategoryFromMetric(metric: string | null): string {
  switch (metric) {
    case "mrr":
    case "total_revenue":
    case "first_sale":
      return "revenue";
    case "subscribers":
    case "stars":
      return "users";
    case "visitors":
      return "traffic";
    default:
      return "custom";
  }
}

export function daysBetween(fromIso: string | null, toIso: string): number | null {
  if (!fromIso) return null;
  const from = Date.parse(fromIso);
  const to = Date.parse(toIso);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return null;
  return Math.max(0, Math.round((to - from) / 86_400_000));
}
