import { validateApiKey } from "@/lib/auth/validate-api-key";
import { fetchQuery, fetchMutation } from "convex/nextjs";
import { api } from "@convex/_generated/api";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await validateApiKey(request);
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const brand = await fetchQuery(api.brands.getByExternalId, {
    externalId: id,
  });

  if (!brand || brand.userId !== auth.userId) {
    return Response.json({ error: "Brand not found" }, { status: 404 });
  }

  return Response.json({
    id: brand.externalId,
    name: brand.name,
    logo_url: brand.logo_url,
    website: brand.website,
    font: brand.font,
    colors: brand.colors,
    created_at: brand.created_at,
    updated_at: brand.updated_at,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await validateApiKey(request);
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (typeof body.name === "string") updates.name = body.name;
  if (typeof body.logo_url === "string") updates.logo_url = body.logo_url;
  if (typeof body.website === "string") updates.website = body.website;
  if (typeof body.font === "string") updates.font = body.font;
  if (body.colors && typeof body.colors === "object" && !Array.isArray(body.colors)) {
    const c = body.colors as Record<string, unknown>;
    const colorsUpdate: Record<string, string> = {};
    if (typeof c.background === "string") colorsUpdate.background = c.background;
    if (typeof c.text === "string") colorsUpdate.text = c.text;
    if (typeof c.primary === "string") colorsUpdate.primary = c.primary;
    if (Object.keys(colorsUpdate).length > 0) updates.colors = colorsUpdate;
  }

  try {
    const updated = await fetchMutation(api.brands.update, {
      externalId: id,
      userId: auth.userId,
      ...updates,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    if (!updated) {
      return Response.json({ error: "Brand not found" }, { status: 404 });
    }
    return Response.json(updated);
  } catch (err) {
    console.error("Failed to update brand:", err);
    return Response.json({ error: "Failed to update brand" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await validateApiKey(request);
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const deleted = await fetchMutation(api.brands.remove, {
      externalId: id,
      userId: auth.userId,
    });
    if (!deleted) {
      return Response.json({ error: "Brand not found" }, { status: 404 });
    }
    return new Response(null, { status: 204 });
  } catch (err) {
    console.error("Failed to delete brand:", err);
    return Response.json({ error: "Failed to delete brand" }, { status: 500 });
  }
}
