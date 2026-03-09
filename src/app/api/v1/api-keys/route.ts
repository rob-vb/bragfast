import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs";

const auth = convexBetterAuthNextJs({
  convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL!,
  convexSiteUrl: process.env.CONVEX_SITE_URL!,
});

async function getSessionUser() {
  const token = await auth.getToken();
  if (!token) return null;
  const user = await auth.fetchAuthQuery(api.auth.getCurrentUser);
  return user;
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const keys = await fetchQuery(api.apiKeys.listByUser, {
    userId: user._id,
  });
  return Response.json(keys);
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = body.name || "default";

  const result = await fetchMutation(api.apiKeys.create, {
    userId: user._id,
    name,
  });

  return Response.json(result, { status: 201 });
}
