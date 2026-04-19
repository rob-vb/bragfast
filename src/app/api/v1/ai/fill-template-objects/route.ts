import { authenticate } from "@/lib/auth/authenticate";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { generateSlideContent } from "@/lib/github/generate-slide-content";
import { migrateConfig } from "@/lib/templates/canvas-types";
import { extractCandidateSlots } from "@/lib/templates/extract-slots";
import type { CanvasTemplateConfig } from "@/lib/templates/canvas-types";

export const maxDuration = 60;

const VALID_FORMATS = new Set(["landscape", "square", "portrait"] as const);
type Format = "landscape" | "square" | "portrait";

export async function POST(request: Request) {
  const auth = await authenticate(request);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    templateId?: unknown;
    format?: unknown;
    context?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.templateId !== "string" || body.templateId.length === 0) {
    return Response.json({ error: "templateId required" }, { status: 400 });
  }
  if (typeof body.format !== "string" || !VALID_FORMATS.has(body.format as Format)) {
    return Response.json({ error: "format must be landscape|square|portrait" }, { status: 400 });
  }
  const ctx = (body.context ?? {}) as { draftCopy?: unknown; commitMessage?: unknown };
  const draftCopy = typeof ctx.draftCopy === "string" ? ctx.draftCopy : "";
  const commitMessage = typeof ctx.commitMessage === "string" ? ctx.commitMessage : "";

  if (draftCopy.length === 0) {
    return Response.json({ error: "context.draftCopy required" }, { status: 400 });
  }

  // Resolve template (user's own or built-in).
  const templates = await fetchQuery(api.drafts.listTemplateCandidates, {
    userId: auth.userId,
  });
  const tpl = templates.find((t) => t.externalId === body.templateId);
  if (!tpl) {
    return Response.json({ error: `Template ${body.templateId} not found` }, { status: 404 });
  }

  const config = migrateConfig(tpl.config) as CanvasTemplateConfig;
  const slots = extractCandidateSlots(config, body.format as Format);

  try {
    const result = await generateSlideContent({
      draftCopy,
      commitMessage,
      templateSlots: slots,
    });
    return Response.json(result, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: `Haiku generateSlideContent failed: ${message}` }, { status: 502 });
  }
}
