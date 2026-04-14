import { authenticate } from "@/lib/auth/authenticate";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";

type ImageRow = {
  externalId: string;
  name: string;
  isDefault: boolean;
  config: unknown;
  previewUrl?: string;
  created_at: string;
  updated_at: string;
};

type VideoRow = {
  externalId: string;
  name: string;
  isDefault: boolean;
  config: unknown;
  previewUrl?: string;
  created_at: number;
  updated_at: number;
};

export async function GET(request: Request) {
  const auth = await authenticate(request);
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [imageDefaults, videoDefaults, userVideoTemplates] = await Promise.all([
    fetchQuery(api.templates.listDefaults, {}),
    fetchQuery(api.videoTemplates.listDefaults, {}),
    fetchQuery(api.videoTemplates.listByUser, { userId: auth.userId }),
  ]);

  const mapImage = (t: ImageRow) => ({
    id: t.externalId,
    name: t.name,
    is_default: t.isDefault,
    kind: "image" as const,
    config: t.config,
    preview_url: t.previewUrl ?? null,
    created_at: t.created_at,
    updated_at: t.updated_at,
  });

  const mapVideo = (t: VideoRow) => ({
    id: t.externalId,
    name: t.name,
    is_default: t.isDefault,
    kind: "video" as const,
    config: t.config,
    preview_url: t.previewUrl ?? null,
    created_at: new Date(t.created_at).toISOString(),
    updated_at: new Date(t.updated_at).toISOString(),
  });

  return Response.json({
    templates: [
      ...imageDefaults.map(mapImage),
      ...videoDefaults.map(mapVideo),
      ...userVideoTemplates.map(mapVideo),
    ],
  });
}
