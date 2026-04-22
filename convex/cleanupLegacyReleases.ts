import { internalMutation } from "./_generated/server";

// One-shot cleanup: strip legacy fields from the removed github-release flow
// so the schema validator can drop the optional passthroughs.
//
// Run once per deployment:
//   npx convex run --prod cleanupLegacyReleases:strip
//
// Safe to re-run — no-ops once fields are gone.
export const strip = internalMutation({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("releases").collect();
    let patched = 0;
    for (const row of rows) {
      const r = row as Record<string, unknown>;
      if (
        r.sourceMetadata === undefined &&
        r.aiContent === undefined &&
        r.pendingConfig === undefined
      ) {
        continue;
      }
      await ctx.db.patch(row._id, {
        sourceMetadata: undefined,
        aiContent: undefined,
        pendingConfig: undefined,
      });
      patched += 1;
    }
    return { scanned: rows.length, patched };
  },
});
