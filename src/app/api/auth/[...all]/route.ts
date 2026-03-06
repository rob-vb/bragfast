import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs";

const auth = convexBetterAuthNextJs({
  convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL!,
  convexSiteUrl: process.env.CONVEX_SITE_URL!,
});

export const { GET, POST } = auth.handler;
