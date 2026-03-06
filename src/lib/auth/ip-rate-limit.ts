const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_SIGNUPS_PER_IP = 5;

const ipCounts = new Map<string, { count: number; windowStart: number }>();

// Clean up stale entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of ipCounts) {
    if (now - entry.windowStart >= WINDOW_MS) {
      ipCounts.delete(ip);
    }
  }
}, 10 * 60 * 1000).unref();

export function checkSignupRateLimit(ip: string): Response | null {
  const now = Date.now();
  const entry = ipCounts.get(ip);

  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    ipCounts.set(ip, { count: 1, windowStart: now });
    return null;
  }

  if (entry.count >= MAX_SIGNUPS_PER_IP) {
    const retryAfter = Math.ceil((WINDOW_MS - (now - entry.windowStart)) / 1000);
    return Response.json(
      { error: "Too many sign-up attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  entry.count++;
  return null;
}
