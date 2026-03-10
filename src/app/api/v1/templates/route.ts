import crypto from "crypto";
import { authenticate } from "@/lib/auth/authenticate";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { fetchQuery, fetchMutation } from "convex/nextjs";
import { api } from "@convex/_generated/api";

export async function GET(request: Request) {
  const auth = await authenticate(request);
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [userTemplates, defaultTemplates] = await Promise.all([
    fetchQuery(api.templates.listByUser, { userId: auth.userId }),
    fetchQuery(api.templates.listDefaults, {}),
  ]);

  const mapTemplate = (t: {
    externalId: string;
    name: string;
    isDefault: boolean;
    config: unknown;
    previewUrl?: string;
    created_at: string;
    updated_at: string;
  }) => ({
    id: t.externalId,
    name: t.name,
    is_default: t.isDefault,
    config: t.config,
    preview_url: t.previewUrl ?? null,
    created_at: t.created_at,
    updated_at: t.updated_at,
  });

  return Response.json({
    templates: [...defaultTemplates.map(mapTemplate), ...userTemplates.map(mapTemplate)],
  });
}

export async function POST(request: Request) {
  const auth = await authenticate(request);
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimitResponse = await checkRateLimit(auth.userId);
  if (rateLimitResponse) return rateLimitResponse;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.name || typeof body.name !== "string") {
    return Response.json({ error: "name is required" }, { status: 400 });
  }

  if (
    !body.config ||
    typeof body.config !== "object" ||
    Array.isArray(body.config)
  ) {
    return Response.json({ error: "config is required" }, { status: 400 });
  }

  const config = body.config as Record<string, unknown>;

  if (!Array.isArray(config.blocks)) {
    return Response.json({ error: "config.blocks must be an array" }, { status: 400 });
  }

  const blocks = config.blocks as Array<Record<string, unknown>>;

  if (blocks.length < 1 || blocks.length > 8) {
    return Response.json(
      { error: "config.blocks must have between 1 and 8 items" },
      { status: 400 }
    );
  }

  const blockTypes = blocks.map((b) => b.type);
  const uniqueTypes = new Set(blockTypes);
  if (uniqueTypes.size !== blockTypes.length) {
    return Response.json(
      { error: "config.blocks cannot have duplicate block types" },
      { status: 400 }
    );
  }

  const externalId = `tmpl_${crypto.randomBytes(12).toString("hex")}`;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const template = await fetchMutation(api.templates.create, {
      userId: auth.userId,
      externalId,
      name: body.name,
      config: config as any,
    });

    return Response.json(
      {
        id: template.id,
        name: template.name,
        is_default: false,
        config: template.config,
        created_at: template.created_at,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Failed to create template:", err);
    return Response.json({ error: "Failed to create template" }, { status: 500 });
  }
}
