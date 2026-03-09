import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs";
import { api } from "@convex/_generated/api";

const auth = convexBetterAuthNextJs({
  convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL!,
  convexSiteUrl: process.env.CONVEX_SITE_URL!,
});

export async function getSessionUser() {
  const token = await auth.getToken();
  if (!token) return null;
  const user = await auth.fetchAuthQuery(api.auth.getCurrentUser);
  return user;
}
