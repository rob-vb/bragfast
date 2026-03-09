import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { getSessionUser } from "@/lib/auth/get-session-user";
import type { Id } from "@convex/_generated/dataModel";

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

  // Ensure user has a profile with trial credits
  await fetchMutation(api.userProfiles.create, { userId: user._id });

  const result = await fetchMutation(api.apiKeys.create, {
    userId: user._id,
    name,
  });

  return Response.json(result, { status: 201 });
}

export async function DELETE(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { id?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.id) {
    return Response.json({ error: "id is required" }, { status: 400 });
  }

  const result = await fetchMutation(api.apiKeys.remove, {
    id: body.id as Id<"apiKeys">,
    userId: user._id,
  });

  return result
    ? Response.json({ success: true })
    : Response.json({ error: "Key not found" }, { status: 404 });
}
