import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";

function subscriptionRequired(): Response {
  return Response.json(
    { error: "subscription_required", message: "Trial expired. Subscribe to continue." },
    { status: 402 },
  );
}

/**
 * Check whether a user has an active subscription or trial.
 * Returns a 402 Response if access should be denied, or null to allow through.
 *
 * Must be called AFTER authenticate() so that unauthenticated requests receive
 * 401 (from authenticate) before this gate can return 402 (T-08-15).
 */
export async function checkSubscriptionGate(
  userId: string,
): Promise<Response | null> {
  const profile = await fetchQuery(api.userProfiles.getByUserId, { userId });

  // Missing profile — no subscription record, treat as free/ungated
  if (!profile) {
    return subscriptionRequired();
  }

  if (profile.plan === "free") {
    return subscriptionRequired();
  }

  if (profile.plan === "trial") {
    // T-08-16: treat undefined trialEnd on trial plan as expired (safe default)
    if (
      profile.trialEnd === undefined ||
      profile.trialEnd === null ||
      profile.trialEnd < Date.now()
    ) {
      return subscriptionRequired();
    }
    // Active trial
    return null;
  }

  // plan === "plate" (or any other future active plan) — allow through
  return null;
}
