import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type IngestPayload = {
  source?: string;
  generated_at?: string;
  telemetry?: {
    coverage?: Record<string, unknown>;
    sessions?: unknown[];
    projects?: Array<{ name?: unknown; session_count?: unknown }>;
    usage_all?: { totals?: Record<string, unknown> };
    activity?: { totals?: Record<string, unknown> };
    agentsview?: Record<string, unknown>;
    [key: string]: unknown;
  };
  insights?: {
    final_insights?: unknown[];
    rules_for_future_agents?: unknown[];
    evidence?: unknown[];
    [key: string]: unknown;
  };
};

type StoredIngest = {
  id: string;
  received_at: string;
  payload: IngestPayload;
  summary: ReturnType<typeof summarizePayload>;
};

let latestIngest: StoredIngest | null = null;
const ingests: StoredIngest[] = [];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function stringList(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function countValue(value: unknown) {
  return Array.isArray(value) ? value.length : asNumber(value);
}

function summarizePayload(payload: IngestPayload) {
  const telemetry = isObject(payload.telemetry) ? payload.telemetry : {};
  const coverage = isObject(telemetry.coverage) ? telemetry.coverage : {};
  const sessions = Array.isArray(telemetry.sessions) ? telemetry.sessions : [];
  const projects = Array.isArray(telemetry.projects) ? telemetry.projects : [];
  const usageAll = isObject(telemetry.usage_all) ? telemetry.usage_all : {};
  const usageTotals = isObject(usageAll.totals) ? usageAll.totals : {};
  const activity = isObject(telemetry.activity) ? telemetry.activity : {};
  const activityTotals = isObject(activity.totals) ? activity.totals : {};
  const insights = isObject(payload.insights) ? payload.insights : {};

  const agentCounts = new Map<string, number>();
  for (const agent of stringList(coverage.agents)) {
    agentCounts.set(agent, 0);
  }
  for (const session of sessions) {
    if (!isObject(session)) continue;
    const agent =
      typeof session.agent === "string" && session.agent
        ? session.agent
        : "unknown";
    agentCounts.set(agent, (agentCounts.get(agent) ?? 0) + 1);
  }

  const topAgents = [...agentCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8)
    .map(([agent, session_count]) => ({ agent, session_count }));

  const topProjectsFromArray = projects.map((project) => ({
    name:
      typeof project.name === "string" && project.name
        ? project.name
        : "unknown",
    session_count: asNumber(project.session_count),
  }));
  const topProjectsFromCoverage = isObject(coverage.top_projects)
    ? Object.entries(coverage.top_projects).map(([name, count]) => ({
        name,
        session_count: asNumber(count),
      }))
    : [];
  const topProjects = (
    topProjectsFromArray.length ? topProjectsFromArray : topProjectsFromCoverage
  )
    .sort((a, b) => b.session_count - a.session_count)
    .slice(0, 8);

  return {
    source: payload.source ?? "agentsview",
    generated_at: payload.generated_at ?? null,
    data_period: coverage.period ?? {
      first_seen: coverage.first_seen ?? null,
      last_seen: coverage.last_seen ?? null,
    },
    has_telemetry: isObject(payload.telemetry),
    has_insights: isObject(payload.insights),
    coverage: {
      sessions: asNumber(coverage.sessions),
      agents: countValue(coverage.agents),
      agent_names: stringList(coverage.agents),
      projects: asNumber(coverage.projects),
      machines: countValue(coverage.machines),
      first_seen: coverage.first_seen ?? null,
      last_seen: coverage.last_seen ?? null,
    },
    usage: {
      input_tokens: asNumber(usageTotals.inputTokens),
      output_tokens: asNumber(usageTotals.outputTokens),
      total_cost: asNumber(usageTotals.totalCost),
      cache_savings: asNumber(usageTotals.cacheSavings),
    },
    activity: {
      agent_minutes: asNumber(activityTotals.agent_minutes),
      active_minutes: asNumber(activityTotals.active_minutes),
      cost: asNumber(activityTotals.cost),
    },
    top_agents: topAgents,
    top_projects: topProjects,
    insight_counts: {
      final_insights: Array.isArray(insights.final_insights)
        ? insights.final_insights.length
        : 0,
      rules_for_future_agents: Array.isArray(insights.rules_for_future_agents)
        ? insights.rules_for_future_agents.length
        : 0,
      evidence: Array.isArray(insights.evidence) ? insights.evidence.length : 0,
    },
  };
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "/api/ingest",
    total_ingests: ingests.length,
    latest: latestIngest
      ? {
          id: latestIngest.id,
          received_at: latestIngest.received_at,
          summary: latestIngest.summary,
          raw: latestIngest.payload,
        }
      : null,
  });
}

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Expected a JSON body." },
      { status: 400 },
    );
  }

  if (!isObject(body)) {
    return NextResponse.json(
      { ok: false, error: "Payload must be a JSON object." },
      { status: 400 },
    );
  }

  if (!isObject(body.telemetry) && !isObject(body.insights)) {
    return NextResponse.json(
      { ok: false, error: "Payload must include telemetry or insights." },
      { status: 400 },
    );
  }

  const payload: IngestPayload = {
    source: typeof body.source === "string" ? body.source : "agentsview",
    generated_at:
      typeof body.generated_at === "string"
        ? body.generated_at
        : new Date().toISOString(),
    telemetry: isObject(body.telemetry) ? body.telemetry : undefined,
    insights: isObject(body.insights) ? body.insights : undefined,
  };

  const stored: StoredIngest = {
    id: crypto.randomUUID(),
    received_at: new Date().toISOString(),
    payload,
    summary: summarizePayload(payload),
  };

  latestIngest = stored;
  ingests.push(stored);

  return NextResponse.json({
    ok: true,
    message: "Farpoint payload ingested.",
    endpoint: "/api/ingest",
    id: stored.id,
    received_at: stored.received_at,
    total_ingests: ingests.length,
    summary: stored.summary,
  });
}
