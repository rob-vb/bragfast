import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { components } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { betterAuth } from "better-auth";
import authConfig from "./auth.config";

const siteUrl = process.env.SITE_URL!;

export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (
  ctx: GenericCtx<DataModel>,
  { optionsOnly } = { optionsOnly: false },
) => {
  return betterAuth({
    logger: {
      disabled: optionsOnly,
    },
    baseURL: siteUrl,
    secret: process.env.BETTER_AUTH_SECRET,
    database: authComponent.adapter(ctx),
    socialProviders: {
      google: {
        clientId: process.env.AUTH_GOOGLE_CLIENT_ID!,
        clientSecret: process.env.AUTH_GOOGLE_CLIENT_SECRET!,
      },
      github: {
        clientId: process.env.AUTH_GITHUB_CLIENT_ID!,
        clientSecret: process.env.AUTH_GITHUB_CLIENT_SECRET!,
      },
    },
    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: ["email-password", "google", "github"],
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      sendResetPassword: async ({ user, url }) => {
        // siteUrl is process.env.SITE_URL — must be the Next.js app origin
        try {
          const res = await fetch(`${siteUrl}/api/internal/send-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.INTERNAL_API_SECRET}`,
            },
            body: JSON.stringify({
              type: "reset-password",
              to: user.email,
              data: { resetUrl: url },
            }),
          });
          if (!res.ok) {
            console.error(
              "Failed to send reset email:",
              res.status,
              await res.text(),
            );
          }
        } catch (err) {
          console.error("Failed to send reset email:", err);
        }
      },
    },
    user: {
      deleteUser: {
        enabled: true,
      },
    },
    plugins: [convex({ authConfig })],
  });
};

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => authComponent.getAuthUser(ctx),
});
