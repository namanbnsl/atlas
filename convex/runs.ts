import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const runStatus = v.union(
  v.literal("started"),
  v.literal("completed"),
  v.literal("failed"),
  v.literal("blocked"),
  v.literal("canceled"),
);

export const recent = query({
  args: {
    projectId: v.optional(v.id("projects")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 25, 100);

    if (args.projectId) {
      return await ctx.db
        .query("runs")
        .withIndex("by_project_started", (q) => q.eq("projectId", args.projectId))
        .order("desc")
        .take(limit);
    }

    return await ctx.db.query("runs").order("desc").take(limit);
  },
});

export const start = mutation({
  args: {
    projectId: v.optional(v.id("projects")),
    agent: v.string(),
    framework: v.optional(v.string()),
    model: v.optional(v.string()),
    task: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    return await ctx.db.insert("runs", {
      ...args,
      userExternalId: identity?.subject,
      status: "started",
      startedAt: Date.now(),
    });
  },
});

export const finish = mutation({
  args: {
    runId: v.id("runs"),
    status: runStatus,
    outcome: v.optional(v.string()),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    costUsd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run) {
      throw new Error("Run not found");
    }

    const completedAt = Date.now();
    await ctx.db.patch(args.runId, {
      status: args.status,
      outcome: args.outcome,
      completedAt,
      durationMs: completedAt - run.startedAt,
      inputTokens: args.inputTokens,
      outputTokens: args.outputTokens,
      costUsd: args.costUsd,
    });
  },
});
