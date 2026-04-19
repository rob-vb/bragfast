import { authenticate } from "@/lib/auth/authenticate";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { pickTemplate, type TemplateCandidate } from "@/lib/github/pick-template";

export const maxDuration = 60;

const VALID_FORMATS = ["landscape", "square", "portrait"] as const;
type Format = (typeof VALID_FORMATS)[number];

function isFormat(x: unknown): x is Format {
  return typeof x === "string" && (VALID_FORMATS as readonly string[]).includes(x);
}

export async function POST(request: Request) {
  const auth = await authenticate(request);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    copy?: unknown;
    formats?: unknown;
    candidates?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.copy !== "string" || body.copy.length === 0) {
    return Response.json({ error: "copy required" }, { status: 400 });
  }

  const formats: Format[] = Array.isArray(body.formats) && body.formats.every(isFormat)
    ? (body.formats as Format[])
    : ["landscape"];

  // If candidates omitted, load user's templates server-side.
  let candidates: TemplateCandidate[];
  if (Array.isArray(body.candidates) && body.candidates.length > 0) {
    candidates = body.candidates
      .filter(
        (c): c is { id: unknown; name: unknown; tags?: unknown; description?: unknown } =>
          typeof c === "object" && c !== null && "id" in c && "name" in c,
      )
      .map((c) => ({
        id: String(c.id),
        name: String(c.name),
        tags: Array.isArray(c.tags) ? (c.tags as string[]) : undefined,
        description: typeof c.description === "string" ? c.description : undefined,
      }));
  } else {
    const templates = await fetchQuery(api.drafts.listTemplateCandidates, {
      userId: auth.userId,
    });
    candidates = templates.map((t) => ({
      id: t.externalId,
      name: t.name,
      tags: t.tags,
      description: t.description,
    }));
  }

  if (candidates.length === 0) {
    return Response.json({ error: "No templates available" }, { status: 400 });
  }

  try {
    const result = await pickTemplate({
      draftCopy: body.copy,
      candidates,
      availableFormats: formats,
    });
    return Response.json(result, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: `Haiku pickTemplate failed: ${message}` }, { status: 502 });
  }
}
