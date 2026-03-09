import { query } from "./_generated/server";
import { v } from "convex/values";
import { authComponent, createAuth } from "./auth";

export const verifyApiKey = query({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const { auth } = await authComponent.getAuth(createAuth, ctx);
    const result = await auth.api.verifyApiKey({ body: { key } });
    if (!result?.valid || !result.key) return null;
    return { userId: result.key.userId as string };
  },
});
