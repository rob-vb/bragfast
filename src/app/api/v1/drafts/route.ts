import { authenticate } from "@/lib/auth/authenticate";
import { fetchQuery, fetchMutation } from "convex/nextjs";
import { api } from "@convex/_generated/api";

const WINDOW_MS = 24 * 60 * 60 * 1000;
const VALID_FORMATS = new Set(["landscape", "square", "portrait"] as const);
type Format = "landscape" | "square" | "portrait";

function serialize(d: {
  _id: string;
  source: string;
  repoFullName?: string;
  windowStart: number;
  windowEnd: number;
  platform: "twitter";
  copy: string;
  originalCopy: string;
  copyEditDistance?: number;
  suggestedTemplateId: string;
  suggestedFormat: "landscape" | "square" | "portrait";
  aiContent: unknown;
  imageReleaseId?: string;
  videoReleaseId?: string;
  uploadId?: string;
  status: string;
  errorMessage?: string;
  sourceCommitShas?: string[];
  postedAt?: number;
  expiresAt: number;
  created_at: string;
  approved_at?: string;
}) {
  return {
    id: d._id,
    source: d.source,
    repoFullName: d.repoFullName,
    windowStart: d.windowStart,
    windowEnd: d.windowEnd,
    platform: d.platform,
    copy: d.copy,
    originalCopy: d.originalCopy,
    copyEditDistance: d.copyEditDistance,
    suggestedTemplateId: d.suggestedTemplateId,
    suggestedFormat: d.suggestedFormat,
    aiContent: d.aiContent,
    imageReleaseId: d.imageReleaseId,
    videoReleaseId: d.videoReleaseId,
    uploadId: d.uploadId,
    status: d.status,
    errorMessage: d.errorMessage,
    sourceCommitShas: d.sourceCommitShas,
    postedAt: d.postedAt,
    expiresAt: d.expiresAt,
    created_at: d.created_at,
    approved_at: d.approved_at,
  };
}

export async function GET(request: Request) {
  const auth = await authenticate(request);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const statusParam = url.searchParams.get("status");
  const status =
    statusParam === "pending_review" ||
    statusParam === "approved" ||
    statusParam === "dismissed" ||
    statusParam === "expired" ||
    statusParam === "error"
      ? statusParam
      : undefined;
  const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 200);

  const drafts = await fetchQuery(api.drafts.listByUser, {
    userId: auth.userId,
    status,
    limit,
  });
  return Response.json(drafts.map(serialize));
}

/**
 * Shape B raw draft create. Agent supplies pre-filled copy + template + objects.
 * Used by agents that orchestrate the AI primitives themselves (e.g., already
 * have a GitHub MCP and just want brag.fast for render + draft management).
 *
 * For one-call convenience that runs the full Haiku pipeline, see
 * POST /api/v1/drafts/from-commits (Shape A).
 */
export async function POST(request: Request) {
  const auth = await authenticate(request);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    copy?: unknown;
    templateId?: unknown;
    format?: unknown;
    aiContent?: unknown;
    repoFullName?: unknown;
    sourceCommitShas?: unknown;
    windowStartMs?: unknown;
    windowEndMs?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.copy !== "string" || body.copy.length === 0 || body.copy.length > 280) {
    return Response.json({ error: "copy must be 1-280 chars" }, { status: 400 });
  }
  if (typeof body.templateId !== "string" || body.templateId.length === 0) {
    return Response.json({ error: "templateId required" }, { status: 400 });
  }
  if (typeof body.format !== "string" || !VALID_FORMATS.has(body.format as Format)) {
    return Response.json({ error: "format must be landscape|square|portrait" }, { status: 400 });
  }
  if (!Array.isArray(body.aiContent)) {
    return Response.json({ error: "aiContent must be an array" }, { status: 400 });
  }

  const now = Date.now();
  const day = Math.floor(now / WINDOW_MS);
  const windowStart =
    typeof body.windowStartMs === "number" ? body.windowStartMs : day * WINDOW_MS;
  const windowEnd =
    typeof body.windowEndMs === "number" ? body.windowEndMs : (day + 1) * WINDOW_MS;

  const repoFullName =
    typeof body.repoFullName === "string" ? body.repoFullName : undefined;
  const sourceCommitShas =
    Array.isArray(body.sourceCommitShas) &&
    body.sourceCommitShas.every((s) => typeof s === "string")
      ? (body.sourceCommitShas as string[])
      : undefined;

  const result = await fetchMutation(api.drafts.insertDraftIfNew, {
    userId: auth.userId,
    source: "mcp-manual",
    repoFullName,
    windowStart,
    windowEnd,
    sourceCommitShas,
    platform: "twitter",
    copy: body.copy,
    originalCopy: body.copy,
    suggestedTemplateId: body.templateId,
    suggestedFormat: body.format as Format,
    aiContent: body.aiContent,
  });

  if (!result.inserted) {
    return Response.json({ skipped: result.reason }, { status: 200 });
  }
  return Response.json({ id: result.draftId, status: "pending_review" }, { status: 200 });
}
