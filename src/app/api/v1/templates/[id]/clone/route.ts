import crypto from "crypto";
import { authenticate } from "@/lib/auth/authenticate";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { fetchQuery, fetchMutation } from "convex/nextjs";
import { api } from "@convex/_generated/api";

export async function POST(
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

  // Lookup source template
  const source = await fetchQuery(api.templates.getByExternalId, {
    externalId: id,
  });

  if (!source) {
    return Response.json({ error: "Template not found" }, { status: 404 });
  }

  // Check source is default or owned by user
  if (!source.isDefault && source.userId !== auth.userId) {
    return Response.json({ error: "Template not found" }, { status: 404 });
  }

  // Parse optional body for name
  let name: string | undefined;
  try {
    const body = await request.json();
    if (typeof body.name === "string") {
      name = body.name;
    }
  } catch {
    // Body is optional — ignore parse errors
  }

  const externalId = `tmpl_${crypto.randomBytes(12).toString("hex")}`;

  try {
    const cloned = await fetchMutation(api.templates.clone, {
      sourceExternalId: id,
      userId: auth.userId,
      externalId,
      name,
    });

    return Response.json(
      {
        id: cloned.id,
        name: cloned.name,
        is_default: false,
        config: cloned.config,
        preview_url: cloned.previewUrl ?? null,
        created_at: cloned.created_at,
        updated_at: cloned.updated_at,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Failed to clone template:", err);
    return Response.json({ error: "Failed to clone template" }, { status: 500 });
  }
}
