import { after } from "next/server";

export const maxDuration = 60;

import { authenticate } from "@/lib/auth/authenticate";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { analyzeRelease } from "@/lib/github/analyze-release";
import { createRelease, renderReleaseAsync } from "@/lib/pipeline/render";
import { calculateCredits, type FormatEntry, type ReleaseRequest } from "@/lib/types";
import { getDefaultConfig } from "@/lib/templates/default-configs";
import type { CanvasTemplateConfig } from "@/lib/templates/canvas-types";

const GITHUB_RELEASE_RE =
  /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/releases\/tag\/(.+)$/;

interface GuidedCookBody {
  url?: string;
  description?: string;
  title?: string;
  template?: string;
  brand_id?: string;
  colors?: { background: string; text: string; primary: string };
  logo_url?: string;
  name?: string;
  formats?: string[];
}

async function fetchGitHubRelease(owner: string, repo: string, tag: string) {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/releases/tags/${encodeURIComponent(tag)}`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "bragfast",
        ...(process.env.GITHUB_TOKEN
          ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
          : {}),
      },
    }
  );

  if (res.status === 404) return null;
  if (res.status === 403) return null;
  if (!res.ok) return null;

  const data = await res.json();
  return {
    name: (data.name as string) || tag,
    tag_name: data.tag_name as string,
    body: (data.body as string) || "",
  };
}

export async function POST(request: Request) {
  const auth = await authenticate(request);
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: GuidedCookBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Resolve release content
  let releaseName = "";
  let releaseTag = "";
  let releaseBody = "";

  if (body.url) {
    const match = body.url.match(GITHUB_RELEASE_RE);
    if (!match) {
      return Response.json(
        { error: "Invalid GitHub release URL. Expected: https://github.com/owner/repo/releases/tag/vX.Y.Z" },
        { status: 400 }
      );
    }

    const [, owner, repo, tag] = match;
    const release = await fetchGitHubRelease(owner, repo, tag);
    if (!release) {
      return Response.json(
        { error: "Couldn't access this repo. Is it public?" },
        { status: 403 }
      );
    }

    releaseName = release.name;
    releaseTag = release.tag_name;
    releaseBody = release.body;
  } else if (body.description || body.title) {
    releaseName = body.title || "New Release";
    releaseTag = "";
    releaseBody = body.description || "";
  } else {
    return Response.json(
      { error: "Provide either a GitHub release URL or a title/description" },
      { status: 400 }
    );
  }

  // Resolve template
  const templateName = body.template || "standard-browser";
  let templateConfig: CanvasTemplateConfig | null = getDefaultConfig(templateName);

  if (!templateConfig && templateName.startsWith("tmpl_")) {
    const tmpl = await fetchQuery(api.templates.getByExternalId, {
      externalId: templateName,
    });
    if (tmpl) templateConfig = tmpl.config as CanvasTemplateConfig;
  }

  if (!templateConfig) {
    return Response.json({ error: "Template not found" }, { status: 400 });
  }

  // Extract object slots from template
  const templateObjects = Object.values(templateConfig.formats)[0].objects.map(
    (o) => {
      const slot: {
        id: string;
        type: "text" | "image" | "logo";
        maxLines?: number;
      } = { id: o.id, type: o.type as "text" | "image" | "logo" };
      if (o.type === "text" && o.height && o.fontSize) {
        slot.maxLines = Math.max(
          1,
          Math.floor(o.height / (o.fontSize * (o.lineHeight || 1.2)))
        );
      }
      return slot;
    }
  );

  // AI analysis
  const aiResult = await analyzeRelease({
    releaseName,
    releaseTag,
    releaseBody,
    templateObjects,
    maxSlides: 1,
  });

  // Build formats
  const formatNames = body.formats || ["landscape", "square", "portrait"];
  const formats: FormatEntry[] = formatNames.map((name) => ({
    name: name as FormatEntry["name"],
    slides: aiResult.slides,
  }));

  // Reserve credits
  const creditsNeeded = calculateCredits({ output: "image", formats });

  let remaining: number;
  try {
    remaining = await fetchMutation(api.userProfiles.reserve, {
      userId: auth.userId,
      amount: creditsNeeded,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("Insufficient credits")) {
      return Response.json(
        {
          error: "Your plate is empty. Pick a plan to keep serving.",
          credits_needed: creditsNeeded,
        },
        { status: 429 }
      );
    }
    throw err;
  }

  // Build release request
  const releaseRequest: ReleaseRequest = {
    template: templateName,
    formats,
    metadata: JSON.stringify({ releaseName, releaseTag, releaseBody }),
  };

  if (body.brand_id) {
    releaseRequest.brand_id = body.brand_id;
  } else {
    if (body.colors) releaseRequest.colors = body.colors;
    if (body.logo_url) releaseRequest.logo_url = body.logo_url;
    if (body.name) releaseRequest.name = body.name;
  }

  try {
    const result = await createRelease(releaseRequest, auth.userId, {
      source: "api",
    });
    result.credits_remaining = remaining;

    after(() =>
      renderReleaseAsync(result.cook_id, releaseRequest, auth.userId)
    );

    return Response.json(result, { status: 202 });
  } catch (err) {
    await fetchMutation(api.userProfiles.refund, {
      userId: auth.userId,
      amount: creditsNeeded,
    }).catch(console.error);
    console.error("Guided cook failed:", err);
    return Response.json(
      { error: "Something burned. Try again." },
      { status: 500 }
    );
  }
}
