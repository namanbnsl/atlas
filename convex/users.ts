import { mutation, query } from "./_generated/server";

export const current = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    return await ctx.db
      .query("users")
      .withIndex("by_external_id", (q) => q.eq("externalId", identity.subject))
      .unique();
  },
});

export const syncCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const now = Date.now();
    const existing = await ctx.db
      .query("users")
      .withIndex("by_external_id", (q) => q.eq("externalId", identity.subject))
      .unique();

    const profile = {
      externalId: identity.subject,
      name: identity.name,
      email: identity.email,
      imageUrl: identity.pictureUrl,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, profile);
      return existing._id;
    }

    return await ctx.db.insert("users", {
      ...profile,
      createdAt: now,
    });
  },
});
