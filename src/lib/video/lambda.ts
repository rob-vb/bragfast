import {
  renderMediaOnLambda,
  getRenderProgress,
  deploySite,
  deployFunction,
  getOrCreateBucket,
} from "@remotion/lambda";
import type { RenderProgress } from "@remotion/lambda";
import { bundle } from "@remotion/bundler";
import path from "path";

const REGION = (process.env.REMOTION_AWS_REGION ?? "us-east-1") as "us-east-1";
const FUNCTION_NAME = process.env.REMOTION_FUNCTION_NAME;
const SERVE_URL = process.env.REMOTION_SERVE_URL;

type RenderVideoParams = {
  compositionId: string;
  inputProps: Record<string, unknown>;
};

export async function renderVideo({
  compositionId,
  inputProps,
}: RenderVideoParams): Promise<string> {
  if (!FUNCTION_NAME || !SERVE_URL) {
    throw new Error("REMOTION_FUNCTION_NAME and REMOTION_SERVE_URL must be set");
  }

  const { renderId, bucketName } = await renderMediaOnLambda({
    region: REGION,
    functionName: FUNCTION_NAME,
    serveUrl: SERVE_URL,
    composition: compositionId,
    inputProps,
    codec: "h264",
    timeoutInMilliseconds: 240000,
  });

  let progress: RenderProgress;
  do {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    progress = await getRenderProgress({
      renderId,
      bucketName,
      region: REGION,
      functionName: FUNCTION_NAME,
    });

    if (progress.fatalErrorEncountered) {
      throw new Error(
        `Remotion render failed: ${progress.errors?.[0]?.message ?? "Unknown error"}`
      );
    }
  } while (!progress.done);

  if (!progress.outputFile) {
    throw new Error("Render completed but no output file URL");
  }

  return progress.outputFile;
}

export async function deployRemotionToLambda() {
  const entryPoint = path.resolve(process.cwd(), "src/remotion/index.ts");

  const { bucketName } = await getOrCreateBucket({ region: REGION });

  console.log("Deploying site to S3...");
  const { serveUrl } = await deploySite({
    bucketName,
    entryPoint,
    region: REGION,
    siteName: "bragfast-video",
  });

  const { functionName } = await deployFunction({
    region: REGION,
    memorySizeInMb: 2048,
    timeoutInSeconds: 240,
    createCloudWatchLogGroup: true,
  });

  console.log("Deployed to Lambda:");
  console.log(`  REMOTION_SERVE_URL=${serveUrl}`);
  console.log(`  REMOTION_FUNCTION_NAME=${functionName}`);

  return { serveUrl, functionName };
}
