import { authenticate } from "@/lib/auth/authenticate";
import { isValidHexColor } from "@/lib/validation";
import { fetchQuery, fetchMutation } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { isR2Url, keyFromUrl, deleteByKey } from "@/lib/storage/r2";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(request);
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
    font_family: brand.font_family,
    colors: brand.colors,
    created_at: brand.created_at,
    updated_at: brand.updated_at,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(request);
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
  if (typeof body.font_family === "string") updates.font_family = body.font_family;
  if (body.colors && typeof body.colors === "object" && !Array.isArray(body.colors)) {
    const c = body.colors as Record<string, unknown>;
    const colorsUpdate: Record<string, string> = {};
    if (typeof c.background === "string") colorsUpdate.background = c.background;
    if (typeof c.text === "string") colorsUpdate.text = c.text;
    if (typeof c.primary === "string") colorsUpdate.primary = c.primary;
    for (const [key, val] of Object.entries(colorsUpdate)) {
      if (!isValidHexColor(val)) {
        return Response.json(
          { error: `colors.${key} must be a valid hex color (e.g. "#1a1a2e")` },
          { status: 400 }
        );
      }
    }
    if (Object.keys(colorsUpdate).length > 0) updates.colors = colorsUpdate;
  }

  // If logo_url is changing, check if old logo was on R2 so we can clean it up
  let oldLogoKey: string | null = null;
  if (typeof updates.logo_url === "string") {
    const brand = await fetchQuery(api.brands.getByExternalId, { externalId: id });
    if (brand?.logo_url && brand.logo_url !== updates.logo_url) {
      oldLogoKey = keyFromUrl(brand.logo_url);
    }
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

    // Clean up old R2 logo after successful save (fire-and-forget)
    if (oldLogoKey) {
      deleteByKey(oldLogoKey).catch((err) =>
        console.error("Failed to delete old logo:", err)
      );
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
  const auth = await authenticate(request);
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
