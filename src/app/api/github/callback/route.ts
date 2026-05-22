import { NextRequest } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { captureServer } from "@/lib/analytics/posthog-server";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return Response.redirect(new URL("/login", request.url));
  }

  const { searchParams } = new URL(request.url);
  const installationId = searchParams.get("installation_id");
  const setupAction = searchParams.get("setup_action");

  if (setupAction === "request") {
    await captureServer({
      event: "github_app_install_blocked",
      distinctId: user._id,
      properties: { block_reason: "org_admin_required" },
    });
    return Response.redirect(new URL("/admin", request.url));
  }

  if (!installationId) {
    return Response.redirect(
      new URL("/admin/account?error=github_missing_installation_id", request.url)
    );
  }

  if (setupAction === "install" || setupAction === "update") {
    const existing = await convex.query(
      api.githubInstallations.getByInstallationId,
      { installationId: Number(installationId) }
    );

    let accountType: "User" | "Organization" = "User";
    if (existing) {
      accountType = existing.accountType;
      await convex.action(api.githubInstallations.upsertAction, {
        installationId: Number(installationId),
        userId: user._id,
        accountLogin: existing.accountLogin,
        accountType: existing.accountType,
      });
    } else {
      await convex.action(api.githubInstallations.upsertAction, {
        installationId: Number(installationId),
        userId: user._id,
        accountLogin: "",
        accountType: "User",
      });
    }

    await captureServer({
      event: "github_app_installed",
      distinctId: user._id,
      properties: {
        install_scope: null,
        repo_count: null,
        org_install: accountType === "Organization",
        action: setupAction,
      },
    });
  }

  return Response.redirect(new URL("/admin", request.url));
}
