import crypto from "crypto";

const CLIENT_ID = process.env.GITHUB_APP_CLIENT_ID!;

function getPrivateKey(): string {
  const raw = process.env.GITHUB_APP_PRIVATE_KEY!;
  // Support base64-encoded PEM (common for env vars with newlines)
  if (!raw.includes("-----BEGIN")) {
    return Buffer.from(raw, "base64").toString("utf-8");
  }
  return raw;
}

function base64url(input: Buffer): string {
  return input.toString("base64url");
}

export function createAppJwt(): string {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iat: now - 60, // clock drift allowance
    exp: now + 600, // 10 min max
    iss: CLIENT_ID,
  };

  const segments = [
    base64url(Buffer.from(JSON.stringify(header))),
    base64url(Buffer.from(JSON.stringify(payload))),
  ];

  const signingInput = segments.join(".");
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(signingInput);
  const signature = sign.sign(getPrivateKey());

  return `${signingInput}.${base64url(signature)}`;
}

export async function getInstallationToken(
  installationId: number
): Promise<string> {
  const jwt = createAppJwt();

  const res = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Failed to get installation token: ${res.status} ${text}`
    );
  }

  const data = await res.json();
  return data.token;
}
