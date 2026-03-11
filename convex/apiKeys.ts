import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

function generateKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let key = "";
  for (let i = 0; i < 40; i++) {
    key += chars[Math.floor(Math.random() * chars.length)];
  }
  return `bf_${key}`;
}

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const create = mutation({
  args: { userId: v.string(), name: v.string() },
  handler: async (ctx, { userId, name }) => {
    const key = generateKey();
    const keyHash = await hashKey(key);
    const prefix = key.slice(0, 10);

    await ctx.db.insert("apiKeys", {
      userId,
      name,
      key,
      keyHash,
      prefix,
      created_at: new Date().toISOString(),
    });

    // Return the full key only once — it's never stored in plain text
    return { key, prefix };
  },
});

export const verify = query({
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

export const listByUser = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const keys = await ctx.db
      .query("apiKeys")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    return keys.map((k) => ({
      id: k._id,
      name: k.name,
      key: k.key ?? null,
      prefix: k.prefix,
      created_at: k.created_at,
    }));
  },
});

export const remove = mutation({
  args: { id: v.id("apiKeys"), userId: v.string() },
  handler: async (ctx, { id, userId }) => {
    const key = await ctx.db.get(id);
    if (!key || key.userId !== userId) return false;
    await ctx.db.delete(id);
    return true;
  },
});
