import crypto from "crypto";

const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET!;

export function verifyWebhookSignature(
  body: string,
  signature: string
): boolean {
  if (!signature.startsWith("sha256=")) return false;

  const expected = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(body)
    .digest("hex");

  const sig = signature.slice("sha256=".length);

  if (sig.length !== expected.length) return false;

  return crypto.timingSafeEqual(
    Buffer.from(sig, "hex"),
    Buffer.from(expected, "hex")
  );
}
