export async function GET() {
  return Response.json({
    NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL ? "set" : "missing",
    CONVEX_SITE_URL: process.env.CONVEX_SITE_URL ? "set" : "missing",
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ? "set" : "missing",
  });
}

export async function POST(request: Request) {
  try {
    const { convexBetterAuthNextJs } = await import(
      "@convex-dev/better-auth/nextjs"
    );
    const auth = convexBetterAuthNextJs({
      convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL!,
      convexSiteUrl: process.env.CONVEX_SITE_URL!,
    });
    const res = await auth.handler.POST(request);
    return res;
  } catch (err) {
    return Response.json(
      {
        error: String(err),
        stack: err instanceof Error ? err.stack : undefined,
      },
      { status: 500 }
    );
  }
}
