import { authenticate } from "@/lib/auth/authenticate";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { fetchQuery, fetchMutation } from "convex/nextjs";
import { api } from "@convex/_generated/api";

const VALID_BLOCK_TYPES = ["title", "description", "image", "logo", "productName"] as const;

function validateBlocks(blocks: unknown[]): string | null {
  if (blocks.length < 1 || blocks.length > 8) {
    return "config.blocks must have 1-8 blocks";
  }
  const types = blocks.map((b) => (b as Record<string, unknown>).type);
  const uniqueTypes = new Set(types);
  if (uniqueTypes.size !== types.length) {
    return "config.blocks must not have duplicate block types";
  }
  for (const type of types) {
    if (!VALID_BLOCK_TYPES.includes(type as (typeof VALID_BLOCK_TYPES)[number])) {
      return `Invalid block type: ${type}`;
    }
  }
  return null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(request);
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const template = await fetchQuery(api.templates.getByExternalId, {
    externalId: id,
  });

  if (!template || (!template.isDefault && template.userId !== auth.userId)) {
    return Response.json({ error: "Template not found" }, { status: 404 });
  }

  return Response.json({
    id: template.externalId,
    name: template.name,
    is_default: template.isDefault,
    config: template.config,
    preview_url: template.previewUrl ?? null,
    created_at: template.created_at,
    updated_at: template.updated_at,
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

  const rateLimitResponse = await checkRateLimit(auth.userId);
  if (rateLimitResponse) return rateLimitResponse;

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.config !== undefined) {
    const config = body.config as Record<string, unknown>;
    if (!Array.isArray(config.blocks)) {
      return Response.json({ error: "config.blocks must be an array" }, { status: 400 });
    }
    const blocksError = validateBlocks(config.blocks);
    if (blocksError) {
      return Response.json({ error: blocksError }, { status: 400 });
    }
  }

  try {
    const updated = await fetchMutation(api.templates.update, {
      externalId: id,
      userId: auth.userId,
      ...(typeof body.name === "string" ? { name: body.name } : {}),
      ...(body.config !== undefined ? { config: body.config } : {}),
      ...(typeof body.previewUrl === "string" ? { previewUrl: body.previewUrl } : {}),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    if (!updated) {
      return Response.json({ error: "Template not found" }, { status: 404 });
    }
    return Response.json({
      id: updated.id,
      name: updated.name,
      is_default: updated.isDefault,
      config: updated.config,
      preview_url: updated.previewUrl ?? null,
      created_at: updated.created_at,
      updated_at: updated.updated_at,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("not found")) {
      return Response.json({ error: "Template not found" }, { status: 404 });
    }
    if (message.includes("Not authorized")) {
      return Response.json({ error: "Not authorized" }, { status: 403 });
    }
    if (message.includes("default")) {
      return Response.json({ error: "Cannot modify default templates" }, { status: 403 });
    }
    console.error("Failed to update template:", err);
    return Response.json({ error: "Failed to update template" }, { status: 500 });
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
    await fetchMutation(api.templates.remove, {
      externalId: id,
      userId: auth.userId,
    });
    return new Response(null, { status: 204 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("not found")) {
      return Response.json({ error: "Template not found" }, { status: 404 });
    }
    if (message.includes("Not authorized")) {
      return Response.json({ error: "Not authorized" }, { status: 403 });
    }
    if (message.includes("default")) {
      return Response.json({ error: "Cannot delete default templates" }, { status: 403 });
    }
    console.error("Failed to delete template:", err);
    return Response.json({ error: "Failed to delete template" }, { status: 500 });
  }
}
