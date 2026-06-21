import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("projects").order("desc").take(50);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    organizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const now = Date.now();

    return await ctx.db.insert("projects", {
      name: args.name,
      slug: args.slug,
      organizationId: args.organizationId,
      ownerExternalId: identity?.subject,
      createdAt: now,
      updatedAt: now,
    });
  },
});
