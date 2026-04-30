// Minimal server-side PostHog capture. We don't pull in posthog-node — the
// /capture endpoint is a single POST and we want to keep webhook deps lean.
//
// Fire-and-forget: failures are logged, never thrown. Webhooks must not break
// because analytics is down.

const ENDPOINT_PATH = "/capture/";

type CaptureInput = {
  event: string;
  distinctId: string;
  properties?: Record<string, unknown>;
};

export async function captureServer(input: CaptureInput): Promise<void> {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
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
        `[posthog-server] capture ${input.event} returned ${res.status}`,
      );
    }
  } catch (err) {
    console.warn(`[posthog-server] capture ${input.event} failed:`, err);
  }
}
