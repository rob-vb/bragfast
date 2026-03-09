import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs";
import { checkSignupRateLimit } from "@/lib/auth/ip-rate-limit";

const auth = convexBetterAuthNextJs({
  convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL!,
  convexSiteUrl: process.env.CONVEX_SITE_URL!,
});

export const { GET } = auth.handler;

export async function POST(request: Request) {
  // Rate-limit sign-up by IP
  if (new URL(request.url).pathname.includes("/sign-up")) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";
    const blocked = checkSignupRateLimit(ip);
    if (blocked) return blocked;
  }

  try {
    return await auth.handler.POST(request);
  } catch (err) {
    console.error("Auth POST error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Internal auth error" },
      { status: 500 }
    );
  }
}
