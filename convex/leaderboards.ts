import { query } from "./_generated/server";

export const globalSummary = query({
  args: {},
  handler: async (ctx) => {
    const recentRuns = await ctx.db.query("runs").order("desc").take(500);
    const completed = recentRuns.filter((run) => run.status === "completed");
    const totalCost = recentRuns.reduce((sum, run) => sum + (run.costUsd ?? 0), 0);

    return {
      runs: recentRuns.length,
      successfulRuns: completed.length,
      successRate:
        recentRuns.length === 0 ? 0 : completed.length / recentRuns.length,
      totalCostUsd: totalCost,
      agents: Array.from(new Set(recentRuns.map((run) => run.agent))).sort(),
    };
  },
});
