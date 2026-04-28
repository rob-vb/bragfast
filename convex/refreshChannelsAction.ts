"use node";

/**
 * Daily channel-cache refresh action.
 *
 * Iterates all enabled Buffer + Postiz integration rows and calls the
 * provider-agnostic dispatcher in src/lib/integrations/refresh-channels.ts.
 *
 * Auth errors (401) disable the row so the user sees the disconnected state
 * in the UI. Transient errors are logged but do not disable the row — the
 * next daily run will retry.
 *
 * This file must stay "use node" because refresh-channels.ts calls outbound
 * HTTP via fetch (Buffer GraphQL + Postiz REST).
 */

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

export const refreshAllChannels = internalAction({
  args: {},
  handler: async (ctx): Promise<void> => {
    // Dynamically import to keep the module graph clean in the Convex edge runtime.
    const { refreshChannelsForProvider } = await import(
      "../src/lib/integrations/refresh-channels"
    );

    const rows = await ctx.runQuery(
      internal.integrationSecrets.listAllEnabled,
      {},
    );

    for (const { userId, provider } of rows) {
      try {
        // Fetch the sealed credential row.
        const sealed = await ctx.runQuery(
          internal.integrationSecrets.getSealed,
          { userId, provider },
        );

        if (!sealed) {
          // Row was disabled or deleted between listAllEnabled and now — skip.
          continue;
        }

        const result = await refreshChannelsForProvider(
          { ciphertext: sealed.ciphertext, iv: sealed.iv, tag: sealed.tag },
          provider,
          sealed.extra,
        );

        if (result.ok) {
          await ctx.runMutation(internal.integrationSecrets.updateExtra, {
            userId,
            provider,
            extra: result.extra,
          });
        } else {
          if (result.errorClass === "auth") {
            // 401 — revoked token. Disable the integration so it surfaces in UI.
            await ctx.runMutation(internal.integrationSecrets.setEnabled, {
              userId,
              provider,
              enabled: false,
            });
            console.warn(
              `[channel-refresh] auth error for ${provider}:${userId} — disabled. ${result.message}`,
            );
          } else {
            // transient / unknown — log only, retry next cron tick.
            console.error(
              `[channel-refresh] ${result.errorClass} error for ${provider}:${userId}: ${result.message}`,
            );
          }
        }
      } catch (err) {
        // Unexpected error for one row — log and continue so other users aren't blocked.
        console.error(
          `[channel-refresh] unexpected error for ${provider}:${userId}:`,
          err,
        );
      }
    }
  },
});
