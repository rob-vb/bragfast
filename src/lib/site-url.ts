/**
 * Resolves the site URL dynamically:
 * 1. NEXT_PUBLIC_SITE_URL (explicit override, highest priority)
 * 2. VERCEL_PROJECT_PRODUCTION_URL (production deployments)
 * 3. VERCEL_URL (preview deployments)
 * 4. localhost fallback
 */
export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL)
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
