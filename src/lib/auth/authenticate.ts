import { validateApiKey } from "./validate-api-key";
import { getSessionUser } from "./get-session-user";

/**
 * Authenticate a request via API key (Bearer token) or session cookie.
 * Returns { userId } or null.
 */
export async function authenticate(
  request: Request
): Promise<{ userId: string } | null> {
  // Try API key first (for programmatic access)
  const apiKeyAuth = await validateApiKey(request);
  if (apiKeyAuth) return apiKeyAuth;

  // Fall back to session auth (for dashboard)
  const user = await getSessionUser();
  if (user) return { userId: user._id };

  return null;
}
