import { fetchQuery } from "convex/nextjs";

export function extractBearerToken(headers: Headers): string | null {
  const authorization = headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  return authorization.slice(7) || null;
}

export async function validateApiKey(
  request: Request
): Promise<{ userId: string } | null> {
  const token = extractBearerToken(request.headers);
  if (!token) return null;

  // Dynamic import to avoid pulling Convex generated code at module level
  const { api } = await import("../../../convex/_generated/api");
  const result = await fetchQuery(api.verifyKey.verifyApiKey, { key: token });
  return result;
}
