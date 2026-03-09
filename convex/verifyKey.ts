import { query } from "./_generated/server";
import { v } from "convex/values";

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const verifyApiKey = query({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const keyHash = await hashKey(key);
    const apiKey = await ctx.db
      .query("apiKeys")
      .withIndex("by_keyHash", (q) => q.eq("keyHash", keyHash))
      .first();

    if (!apiKey) return null;
    return { userId: apiKey.userId };
  },
});
