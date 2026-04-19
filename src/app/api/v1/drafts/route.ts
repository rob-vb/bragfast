import { authenticate } from "@/lib/auth/authenticate";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";

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
