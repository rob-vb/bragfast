import crypto from "crypto";

// AES-256-GCM wrapper for third-party API credentials.
//
// Generate and set the key:
//   openssl rand -base64 32
// Then add to .env.local (and .env.example for docs):
//   SECRET_BOX_KEY=<32-byte base64>
//
// Rotation is deliberately out of scope for v1. See plan
// docs/plans/2026-04-22-001-feat-sous-chef-milestone-agent-plan.md
// (Risks table — "SECRET_BOX_KEY rotation not designed").

export type SealedSecret = {
  ciphertext: string;
  iv: string;
  tag: string;
};

const ALGO = "aes-256-gcm";
const IV_LENGTH = 12;
const KEY_LENGTH = 32;

function getKey(): Buffer {
  const raw = process.env.SECRET_BOX_KEY;
  if (!raw) {
    throw new Error(
      "SECRET_BOX_KEY is not set. Generate with `openssl rand -base64 32` and add to .env.local.",
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== KEY_LENGTH) {
    throw new Error(
      `SECRET_BOX_KEY must decode to ${KEY_LENGTH} bytes (got ${key.length}). Regenerate with \`openssl rand -base64 32\`.`,
    );
  }
  return key;
}

export function seal(plaintext: string): SealedSecret {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
  };
}

export function open(payload: SealedSecret): string {
  const key = getKey();
  const iv = Buffer.from(payload.iv, "base64");
  const tag = Buffer.from(payload.tag, "base64");
  const ciphertext = Buffer.from(payload.ciphertext, "base64");
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}
