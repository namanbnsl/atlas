import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listForRun = query({
  args: {
    runId: v.id("runs"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("events")
      .withIndex("by_run_timestamp", (q) => q.eq("runId", args.runId))
      .order("asc")
      .collect();
  },
});

export const record = mutation({
  args: {
    runId: v.optional(v.id("runs")),
    source: v.string(),
    type: v.string(),
    timestamp: v.optional(v.number()),
    payload: v.any(),
    idempotencyKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.idempotencyKey) {
      const existing = await ctx.db
        .query("events")
        .withIndex("by_idempotency_key", (q) =>
          q.eq("idempotencyKey", args.idempotencyKey),
        )
        .unique();

      if (existing) {
        return existing._id;
      }
    }

    const identity = await ctx.auth.getUserIdentity();

    return await ctx.db.insert("events", {
      runId: args.runId,
      userExternalId: identity?.subject,
      source: args.source,
      type: args.type,
      timestamp: args.timestamp ?? Date.now(),
      payload: args.payload,
      idempotencyKey: args.idempotencyKey,
    });
  },
});
