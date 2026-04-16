import crypto from "crypto";

function getSigningKey(): string {
  const key = process.env.UPLOAD_SIGNING_KEY;
  if (!key) throw new Error("UPLOAD_SIGNING_KEY environment variable is required");
  return key;
}

function buildMessage(uploadId: string, expiresAt: number, contentType: string): string {
  return `PUT\n/api/v1/upload/${uploadId}\n${expiresAt}\n${contentType}`;
}

export function signUploadUrl(
  uploadId: string,
  expiresAt: number,
  contentType: string
): string {
  const message = buildMessage(uploadId, expiresAt, contentType);
  return crypto
    .createHmac("sha256", getSigningKey())
    .update(message)
    .digest("hex");
}

export function verifyUploadSignature(
  uploadId: string,
  expiresAt: number,
  contentType: string,
  signature: string
): boolean {
  const expected = signUploadUrl(uploadId, expiresAt, contentType);

  if (signature.length !== expected.length) return false;

  return crypto.timingSafeEqual(
    Buffer.from(signature, "hex"),
    Buffer.from(expected, "hex")
  );
}

function buildPartMessage(
  uploadId: string,
  partNumber: number,
  expiresAt: number,
  contentType: string
): string {
  return `PUT\n/api/v1/upload/chunked/${uploadId}/part/${partNumber}\n${expiresAt}\n${contentType}`;
}

export function signPartUrl(
  uploadId: string,
  partNumber: number,
  expiresAt: number,
  contentType: string
): string {
  const message = buildPartMessage(uploadId, partNumber, expiresAt, contentType);
  return crypto
    .createHmac("sha256", getSigningKey())
    .update(message)
    .digest("hex");
}

export function verifyPartSignature(
  uploadId: string,
  partNumber: number,
  expiresAt: number,
  contentType: string,
  signature: string
): boolean {
  const expected = signPartUrl(uploadId, partNumber, expiresAt, contentType);

  if (signature.length !== expected.length) return false;

  return crypto.timingSafeEqual(
    Buffer.from(signature, "hex"),
    Buffer.from(expected, "hex")
  );
}
