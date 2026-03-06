import { fetchMutation } from "convex/nextjs";
import { api } from "../../../convex/_generated/api";

export async function checkRateLimit(
  userId: string
): Promise<Response | null> {
  const result = await fetchMutation(api.rateLimit.check, { userId });

  if (!result.allowed) {
    const retryAfter = Math.ceil((result.retryAfterMs ?? 60000) / 1000);
    return Response.json(
      { error: "Too many requests. Slow down." },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfter) },
      }
    );
  }

  return null;
}
