import {
  renderMediaOnLambda,
  getRenderProgress,
  deleteRender,
} from "@remotion/lambda-client";
import type { RenderProgress } from "@remotion/lambda-client";

const REGION = (process.env.REMOTION_AWS_REGION ?? "us-east-1") as "us-east-1";
const FUNCTION_NAME = process.env.REMOTION_FUNCTION_NAME;
const SERVE_URL = process.env.REMOTION_SERVE_URL;

type RenderVideoParams = {
  compositionId: string;
  inputProps: Record<string, unknown>;
};

async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  maxRetries = 3,
  baseDelayMs = 5000
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const isRateLimit =
        message.includes("Rate Exceeded") ||
        message.includes("TooManyRequests") ||
        message.includes("ConcurrentInvocationLimitExceeded");

      if (isRateLimit && attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        console.log(`[LAMBDA] ${label}: rate limited, retrying in ${delay / 1000}s (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Unreachable");
}

export type RenderVideoResult = {
  outputUrl: string;
  renderId: string;
  bucketName: string;
};

export async function cleanupRender(renderId: string, bucketName: string): Promise<void> {
  try {
    await deleteRender({
      renderId,
      bucketName,
      region: REGION,
    });
    console.log(`[LAMBDA] Cleaned up render ${renderId}`);
  } catch (err) {
    console.warn(`[LAMBDA] Failed to clean up render ${renderId}:`, err);
  }
}

export async function renderVideo({
  compositionId,
  inputProps,
}: RenderVideoParams): Promise<RenderVideoResult> {
  if (!FUNCTION_NAME || !SERVE_URL) {
    throw new Error("REMOTION_FUNCTION_NAME and REMOTION_SERVE_URL must be set");
  }

  console.log(`[LAMBDA] Rendering ${compositionId}`);

  const { renderId, bucketName } = await withRetry(
    () =>
      renderMediaOnLambda({
        region: REGION,
        functionName: FUNCTION_NAME,
        serveUrl: SERVE_URL,
        composition: compositionId,
        inputProps,
        codec: "h264",
        crf: 28,
        x264Preset: "medium",
        encodingMaxRate: "5M",
        encodingBufferSize: "10M",
        muted: true,
        timeoutInMilliseconds: 240000,
        // ~2-3 chunks for a typical 12s video. Parallelizes rendering
        // across multiple Lambdas for faster wall-clock time (~15-20s vs ~70s).
        framesPerLambda: 200,
      }),
    "renderMediaOnLambda"
  );

  console.log(`[LAMBDA] Render started: ${renderId}`);

  let progress: RenderProgress;
  do {
    await new Promise((resolve) => setTimeout(resolve, 5000));

    progress = await withRetry(
      () =>
        getRenderProgress({
          renderId,
          bucketName,
          region: REGION,
          functionName: FUNCTION_NAME,
        }),
      "getRenderProgress"
    );

    const pct = Math.round((progress.overallProgress ?? 0) * 100);
    console.log(`[LAMBDA] Progress: ${pct}%`);

    if (progress.fatalErrorEncountered) {
      const errorMsg = progress.errors?.[0]?.message ?? "Unknown error";
      console.error(`[LAMBDA] Fatal error:`, errorMsg);
      throw new Error(`Remotion render failed: ${errorMsg}`);
    }
  } while (!progress.done);

  if (!progress.outputFile) {
    throw new Error("Render completed but no output file URL");
  }

  console.log(`[LAMBDA] Render complete: ${progress.outputFile}`);
  return { outputUrl: progress.outputFile, renderId, bucketName };
}
