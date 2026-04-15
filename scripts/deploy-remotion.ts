import {
  deploySite,
  deployFunction,
  getOrCreateBucket,
} from "@remotion/lambda";
import path from "path";

const REGION = (process.env.REMOTION_AWS_REGION ?? "us-east-1") as "us-east-1";

async function main() {
  console.log("Deploying Remotion to Lambda...");

  const entryPoint = path.resolve(process.cwd(), "src/remotion/index.ts");

  const { bucketName } = await getOrCreateBucket({ region: REGION });

  console.log("Deploying site to S3...");
  const { serveUrl } = await deploySite({
    bucketName,
    entryPoint,
    region: REGION,
    siteName: "bragfast-video",
  });

  console.log("Deploying Lambda function...");
  const { functionName } = await deployFunction({
    region: REGION,
    memorySizeInMb: 2048,
    diskSizeInMb: 10240,
    timeoutInSeconds: 240,
    createCloudWatchLogGroup: true,
  });

  console.log("\nDeployed! Add these to your .env.local:");
  console.log(`REMOTION_SERVE_URL=${serveUrl}`);
  console.log(`REMOTION_FUNCTION_NAME=${functionName}`);
}

main().catch(console.error);
