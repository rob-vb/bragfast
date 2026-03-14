import {
  renderMediaOnLambda,
  getRenderProgress,
} from "@remotion/lambda";
import type { RenderProgress } from "@remotion/lambda";

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

export async function renderVideo({
  compositionId,
  inputProps,
}: RenderVideoParams): Promise<string> {
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
        timeoutInMilliseconds: 240000,
        // Render all frames in 1 chunk to minimize concurrent Lambda invocations.
        // Default chunking spawns many Lambdas which hits concurrency limits on
        // accounts with low limits (default is 10).
        framesPerLambda: 600,
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
  return progress.outputFile;
}
