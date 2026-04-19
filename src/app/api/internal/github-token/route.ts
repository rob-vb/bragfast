import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { getInstallationToken } from "@/lib/github/auth";

// Internal endpoint: Convex actions call this to obtain a GitHub App
// installation token. Not exposed to public agents. Shared-secret auth only.
// Rationale: octokit + crypto.createSign live comfortably in the Next.js
// runtime. Keeping the JWT signing path there avoids duplicating it into
// Convex env + binding.

const INTERNAL_SECRET = process.env.CONVEX_INTERNAL_SECRET;

export async function POST(request: Request) {
  if (!INTERNAL_SECRET) {
    console.error("[internal/github-token] CONVEX_INTERNAL_SECRET not set");
    return Response.json({ error: "Endpoint not configured" }, { status: 503 });
  }

  const header = request.headers.get("x-internal-auth");
  if (!header || header !== INTERNAL_SECRET) {
    // Do NOT log the header value — could be the real secret from a misconfigured caller.
    console.warn("[internal/github-token] unauthorized call", {
      hasHeader: Boolean(header),
      ip: request.headers.get("x-forwarded-for") || "unknown",
    });
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { userId?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.userId || typeof body.userId !== "string") {
    return Response.json({ error: "userId required" }, { status: 400 });
  }

  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  const installations = await convex.query(api.githubInstallations.listByUserId, {
    userId: body.userId,
  });
  const installation = installations.find((i) => i.status === "active" && i.enabled);

  if (!installation) {
    return Response.json({ error: "No active installation for user" }, { status: 404 });
  }

  try {
    const token = await getInstallationToken(installation.installationId);
    // GitHub installation tokens expire in ~1h. Give Convex a conservative 50min window.
    return Response.json({
      token,
      installationId: installation.installationId,
      expiresAt: Date.now() + 50 * 60 * 1000,
    });
  } catch (err) {
    console.error("[internal/github-token] token exchange failed", err);
    return Response.json({ error: "Token exchange failed" }, { status: 502 });
  }
}
