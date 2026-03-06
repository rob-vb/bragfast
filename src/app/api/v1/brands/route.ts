import { validateApiKey } from "@/lib/auth/validate-api-key";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { fetchQuery, fetchMutation } from "convex/nextjs";
import { api } from "../../../../convex/_generated/api";

export async function GET(request: Request) {
  const auth = await validateApiKey(request);
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const brands = await fetchQuery(api.brands.listByUser, {
    userId: auth.userId,
  });

  return Response.json(
    brands.map((b) => ({
      id: b.externalId,
      name: b.name,
      logo_url: b.logo_url,
      website: b.website,
      font: b.font,
      colors: b.colors,
      created_at: b.created_at,
      updated_at: b.updated_at,
    }))
  );
}

export async function POST(request: Request) {
  const auth = await validateApiKey(request);
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
    !body.colors ||
    typeof body.colors !== "object" ||
    Array.isArray(body.colors)
  ) {
    return Response.json({ error: "colors is required" }, { status: 400 });
  }
  const colors = body.colors as Record<string, unknown>;
  if (
    typeof colors.background !== "string" ||
    typeof colors.text !== "string" ||
    typeof colors.primary !== "string"
  ) {
    return Response.json(
      { error: "colors must include background, text, and primary (hex strings)" },
      { status: 400 }
    );
  }

  try {
    const brand = await fetchMutation(api.brands.create, {
      userId: auth.userId,
      name: body.name,
      logo_url: typeof body.logo_url === "string" ? body.logo_url : undefined,
      website: typeof body.website === "string" ? body.website : undefined,
      font: typeof body.font === "string" ? body.font : undefined,
      colors: {
        background: colors.background,
        text: colors.text,
        primary: colors.primary,
      },
    });
    return Response.json(brand, { status: 201 });
  } catch (err) {
    console.error("Failed to create brand:", err);
    return Response.json({ error: "Failed to create brand" }, { status: 500 });
  }
}
