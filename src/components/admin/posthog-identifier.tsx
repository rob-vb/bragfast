"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";

const SIGNUP_DONE_KEY = "bragfast_signup_captured";

/**
 * Calls posthog.identify() on every admin mount with fresh person properties.
 * Also fires signup_completed once (guarded by localStorage) to cover both
 * email and social OAuth signup paths.
 */
export function PostHogIdentifier({
  userId,
  plan,
}: {
  userId: string;
  plan: string;
}) {
  const integrations = useQuery(api.integrationSecrets.listByUser, { userId });

  useEffect(() => {
    if (integrations === undefined) return;

    const sourceCount = integrations.length;

    // Third arg = $set_once — PostHog writes these only if not already on the person.
    posthog.identify(
      userId,
      { plan, source_count: sourceCount },
      { signup_date: new Date().toISOString() },
    );

    const alreadyCaptured = sessionStorage.getItem(SIGNUP_DONE_KEY);
    if (!alreadyCaptured) {
      sessionStorage.setItem(SIGNUP_DONE_KEY, "1");
      // Only fire signup_completed on the first ever session for this user.
      // Returning users already have the signup event from the original session.
      const isNewUser = !localStorage.getItem(`bragfast_known_${userId}`);
      if (isNewUser) {
        localStorage.setItem(`bragfast_known_${userId}`, "1");
        posthog.capture("signup_completed", {
          signup_source: "direct",
          came_from_preview: false,
        });
      }
    }
  }, [userId, plan, integrations]);

  return null;
}
