import { deployRemotionToLambda } from "../src/lib/video/lambda";

async function main() {
  console.log("Deploying Remotion to Lambda...");
  const { serveUrl, functionName } = await deployRemotionToLambda();
  console.log("\nAdd these to your .env:");
  console.log(`REMOTION_SERVE_URL=${serveUrl}`);
  console.log(`REMOTION_FUNCTION_NAME=${functionName}`);
}

main().catch(console.error);
