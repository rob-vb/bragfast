// Smoke-test the deployed hyperframes Lambda end-to-end.
// Run: npx tsx --env-file .env.local scripts/smoke-test-hyperframes.ts
// Renders milestone/square.html, uploads to R2, prints the public URL.
import { LambdaClient } from "@aws-sdk/client-lambda";
import { makeInvokeHyperframesLambda } from "../src/lib/video/hyperframes-lambda";
import { createPresignedUploadUrl } from "../src/lib/storage/r2";

async function main() {
  const fnName = process.env.HYPERFRAMES_FUNCTION_NAME;
  if (!fnName) throw new Error("HYPERFRAMES_FUNCTION_NAME not set");

  const region = process.env.AWS_REGION ?? "us-east-1";
  const lambda = new LambdaClient({ region });
  const invoke = makeInvokeHyperframesLambda({ functionName: fnName, send: (cmd) => lambda.send(cmd) });

  const key = `smoke-tests/hyperframes/${Date.now()}-milestone-square.mp4`;
  const { uploadUrl, publicUrl } = await createPresignedUploadUrl(key, "video/mp4", 600);

  const variables = {
    __bg: "#0b0d10",
    __text: "#f4f4f5",
    __primary: "#7c5cff",
    kicker: "WE JUST HIT",
    heroNumber: "$10K",
    heroLabel: "MONTHLY RECURRING",
    caption: "Thank you to every customer along the way.",
    brandName: "Acme",
  };

  console.log(`[smoke] invoking Lambda ${fnName} (${region})...`);
  console.log(`[smoke] target R2 key: ${key}`);
  const t0 = Date.now();
  const result = await invoke({
    templateId: "milestone",
    variables,
    format: "square",
    duration: 8,
    presignedPutUrl: uploadUrl,
  });
  const wallMs = Date.now() - t0;

  console.log(`[smoke] result:`, result);
  console.log(`[smoke] wall time: ${wallMs}ms`);

  if (result.ok) {
    console.log(`[smoke] PUBLIC URL: ${publicUrl}`);
    console.log(`[smoke] open ${publicUrl}`);
  } else {
    console.error(`[smoke] FAILED: ${result.reason}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
