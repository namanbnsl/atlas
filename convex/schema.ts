import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    externalId: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_external_id", ["externalId"]),

  organizations: defineTable({
    name: v.string(),
    slug: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_slug", ["slug"]),

  memberships: defineTable({
    organizationId: v.id("organizations"),
    userExternalId: v.string(),
    role: v.union(v.literal("owner"), v.literal("admin"), v.literal("member")),
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_user", ["userExternalId"]),

  projects: defineTable({
    organizationId: v.optional(v.id("organizations")),
    ownerExternalId: v.optional(v.string()),
    name: v.string(),
    slug: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_owner", ["ownerExternalId"])
    .index("by_slug", ["slug"]),

  runs: defineTable({
    projectId: v.optional(v.id("projects")),
    userExternalId: v.optional(v.string()),
    agent: v.string(),
    framework: v.optional(v.string()),
    model: v.optional(v.string()),
    task: v.string(),
    status: v.union(
      v.literal("started"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("blocked"),
      v.literal("canceled"),
    ),
    outcome: v.optional(v.string()),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    durationMs: v.optional(v.number()),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    costUsd: v.optional(v.number()),
    metadata: v.optional(v.any()),
  })
    .index("by_project_started", ["projectId", "startedAt"])
    .index("by_user_started", ["userExternalId", "startedAt"])
    .index("by_status", ["status"]),

  events: defineTable({
    runId: v.optional(v.id("runs")),
    userExternalId: v.optional(v.string()),
    source: v.string(),
    type: v.string(),
    timestamp: v.number(),
    payload: v.any(),
    idempotencyKey: v.optional(v.string()),
  })
    .index("by_run_timestamp", ["runId", "timestamp"])
    .index("by_type_timestamp", ["type", "timestamp"])
    .index("by_idempotency_key", ["idempotencyKey"]),

  dailyRollups: defineTable({
    date: v.string(),
    scope: v.union(v.literal("global"), v.literal("user"), v.literal("project")),
    scopeId: v.optional(v.string()),
    agent: v.optional(v.string()),
    model: v.optional(v.string()),
    runs: v.number(),
    successfulRuns: v.number(),
    costUsd: v.number(),
    inputTokens: v.number(),
    outputTokens: v.number(),
    updatedAt: v.number(),
  })
    .index("by_scope_date", ["scope", "scopeId", "date"])
    .index("by_agent_date", ["agent", "date"])
    .index("by_model_date", ["model", "date"]),
});
