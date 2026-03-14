import { NextRequest } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { getSessionUser } from "@/lib/auth/get-session-user";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return Response.redirect(new URL("/login", request.url));
  }

  const { searchParams } = new URL(request.url);
  const installationId = searchParams.get("installation_id");
  const setupAction = searchParams.get("setup_action");

  if (!installationId) {
    return Response.redirect(
      new URL("/dashboard/github?error=missing_installation_id", request.url)
    );
  }

  if (setupAction === "install" || setupAction === "update") {
    // Link the installation to the authenticated user
    const existing = await convex.query(
      api.githubInstallations.getByInstallationId,
      { installationId: Number(installationId) }
    );

    if (existing) {
      // Update with user ID (was empty from webhook creation)
      await convex.mutation(api.githubInstallations.upsert, {
        installationId: Number(installationId),
        userId: user._id,
        accountLogin: existing.accountLogin,
        accountType: existing.accountType,
      });
    } else {
      // Webhook hasn't arrived yet — create a placeholder.
      // The webhook handler will update it when it arrives.
      await convex.mutation(api.githubInstallations.upsert, {
        installationId: Number(installationId),
        userId: user._id,
        accountLogin: "", // will be filled by webhook
        accountType: "User",
      });
    }
  }

  return Response.redirect(new URL("/dashboard/github", request.url));
}
