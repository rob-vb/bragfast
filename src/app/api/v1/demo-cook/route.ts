import { after } from "next/server";

export const maxDuration = 60;

import { fetchMutation } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { analyzeRelease } from "@/lib/github/analyze-release";
import { fetchGitHubRelease } from "@/lib/github/fetch-release";
import { createRelease, renderReleaseAsync } from "@/lib/pipeline/render";
import type { FormatEntry } from "@/lib/types";
import { getDefaultConfig } from "@/lib/templates/default-configs";

const GITHUB_RELEASE_RE =
  /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/releases\/tag\/(.+)$/;

const DEMO_USER_ID = "demo_anonymous";

export async function POST(request: Request) {
  // Rate limit by IP via Convex (persists across deploys)
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const allowed = await fetchMutation(api.demoRateLimits.checkAndIncrement, { ip });
  if (!allowed) {
    return Response.json(
      {
        error:
          "You've used your free demos — sign up for 10 free credits!",
      },
      { status: 429 }
    );
  }

  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.url) {
    return Response.json(
      { error: "Provide a GitHub release URL" },
      { status: 400 }
    );
  }

  const match = body.url.match(GITHUB_RELEASE_RE);
  if (!match) {
    return Response.json(
      {
        error:
          "Invalid GitHub release URL. Expected: https://github.com/owner/repo/releases/tag/vX.Y.Z",
      },
      { status: 400 }
    );
  }

  const [, owner, repo, tag] = match;
  const release = await fetchGitHubRelease(owner, repo, tag);
  if (!release) {
    return Response.json(
      { error: "Couldn't access this release. Is the repo public?" },
      { status: 403 }
    );
  }

  // Resolve template (always standard-browser for demo)
  const templateName = "standard-browser";
  const templateConfig = getDefaultConfig(templateName);
  if (!templateConfig) {
    return Response.json({ error: "Template error" }, { status: 500 });
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

  // AI analysis — 1 slide max for demo
  const aiResult = await analyzeRelease({
    releaseName: release.name,
    releaseTag: release.tag_name,
    releaseBody: release.body,
    templateObjects,
    maxSlides: 1,
  });

  // Build formats — landscape + square only for demo
  const formatNames = ["landscape", "square"] as const;
  const formats: FormatEntry[] = formatNames.map((name) => ({
    name,
    slides: aiResult.slides,
  }));

  try {
    const result = await createRelease(
      {
        template: templateName,
        formats,
        metadata: JSON.stringify({
          releaseName: release.name,
          releaseTag: release.tag_name,
          releaseBody: release.body,
        }),
      },
      DEMO_USER_ID,
      { source: "demo" }
    );

    after(() =>
      renderReleaseAsync(result.cook_id, { template: templateName, formats }, DEMO_USER_ID)
    );

    return Response.json(
      { cook_id: result.cook_id, status: "pending" },
      { status: 202 }
    );
  } catch (err) {
    console.error("Demo cook failed:", err);
    return Response.json(
      { error: "Something burned. Try again." },
      { status: 500 }
    );
  }
}
