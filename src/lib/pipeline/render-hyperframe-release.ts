import path from "path";
import { LambdaClient } from "@aws-sdk/client-lambda";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { renderHyperframe, type HyperframeFormat } from "./render-hyperframe";
import { makeReadComposition } from "../templates/hyperframe-registry";
import { parseManifest } from "../templates/hyperframe-manifest";
import { getHyperframesTemplate } from "../templates/hyperframes-templates";
import { makeInvokeHyperframesLambda } from "../video/hyperframes-lambda";
import { createPresignedUploadUrl } from "../storage/r2";
import type { Brand as HyperframeBrand } from "../templates/hyperframe-variables";
import type { ReleaseRequest } from "../types";

// Hyperframes encodes via H.264 directly, which requires even dimensions.
// Landscape uses 676 (one pixel taller than the canvas-template 675) for that reason.
const FORMAT_DIMENSIONS: Record<HyperframeFormat, string> = {
  landscape: "1200x676",
  square: "1080x1080",
  portrait: "1080x1350",
};

function brandForHyperframes(request: ReleaseRequest, fallback: { background: string; text: string; primary: string }): HyperframeBrand {
  const colors = request.colors ?? fallback;
  return {
    background: colors.background,
    text: colors.text,
    primary: colors.primary,
    logoUrl: request.logo_url,
  };
}

export async function renderHyperframeRelease(
  cookId: string,
  userId: string,
  request: ReleaseRequest,
) {
  const templateId = request.template ?? "";
  const meta = getHyperframesTemplate(templateId);
  if (!meta) throw new Error(`Unknown hyperframes template: ${templateId}`);

  const formats = request.formats.map((f) => f.name as HyperframeFormat);
  for (const f of formats) {
    if (!meta.formats.includes(f)) {
      throw new Error(`Template "${meta.id}" does not support format "${f}"`);
    }
  }

  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  const creditsPerFormat = 10;
  const duration = (typeof request.video === "object" && request.video?.duration) || meta.defaultDurationSeconds;

  const compositionsRoot = path.join(process.cwd(), "src", "hyperframes");
  const readComposition = makeReadComposition(compositionsRoot);

  const firstFormat = formats[0];
  const { html: firstHtml } = await readComposition(meta.id, firstFormat);
  const manifest = parseManifest(firstHtml);

  const brandColors = request.colors ?? { background: "#fff8f0", text: "#4a3326", primary: "#d97706" };
  const hyperBrand = brandForHyperframes(request, brandColors);

  const functionName = process.env.HYPERFRAMES_FUNCTION_NAME;
  if (!functionName) throw new Error("HYPERFRAMES_FUNCTION_NAME is not set");
  const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION ?? "us-east-1" });
  const invokeLambda = makeInvokeHyperframesLambda({
    functionName,
    send: (cmd) => lambdaClient.send(cmd),
  });

  const result = await renderHyperframe(
    {
      releaseId: cookId,
      templateId: meta.id,
      formats,
      cookInput: request.variables ?? {},
      brand: hyperBrand,
      manifest,
      duration,
      creditsPerFormat,
    },
    {
      readComposition,
      mintPresignedPutUrl: async (key) => {
        const { uploadUrl, publicUrl } = await createPresignedUploadUrl(key, "video/mp4", 600);
        return { url: uploadUrl, publicUrl };
      },
      invokeLambda,
      markCompleted: async (releaseId, outputs) => {
        const videos: Record<string, { url: string; duration: number; dimensions: string }> = {};
        for (const o of outputs) {
          videos[o.format] = { url: o.url, duration, dimensions: FORMAT_DIMENSIONS[o.format] };
        }
        await convex.mutation(api.releases.markCompleted, { externalId: releaseId, videos });
      },
      markFailed: async (releaseId) => {
        await convex.mutation(api.releases.markFailed, { externalId: releaseId });
      },
      refundCredits: async (_releaseId, credits) => {
        await convex.mutation(api.userProfiles.refund, { userId, amount: credits });
      },
    },
  );

  if (request.webhook_url) {
    const release = await convex.query(api.releases.getByExternalId, { externalId: cookId });
    fetch(request.webhook_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(release),
    }).catch(console.error);
  }

  return result;
}
