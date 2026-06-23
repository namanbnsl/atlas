---
name: atlas-agent-telemetry
description: Generate Atlas coding-agent telemetry reports from local AgentsView data. Use when a user asks for Atlas reports, agent analytics, coding-agent usage, token or cost summaries, project/model breakdowns, health/outcome stats, retry/compaction signals, activity windows, or a content-free inventory across Codex, Claude Code, Cursor, OpenCode, Antigravity, Amp, Gemini CLI, and related coding agents.
---

# Atlas Agent Telemetry

Atlas turns local sessions into content-free Markdown and optional JSON telemetry reports. Use the wrapper script (built on agentsview) instead of parsing transcripts or calling raw message/export commands.

## Quick Start

Run from the workspace the user wants the report written into:

```bash
python <skill-dir>/scripts/analyze_agent_sessions.py --output atlas-agent-report.md
```

Then read `atlas-agent-report.md` before answering. Summarize the report, call out notable telemetry, and mention the saved file path.

## Common Commands

```bash
# Markdown report only
python <skill-dir>/scripts/analyze_agent_sessions.py \
  --output atlas-agent-report.md

# Markdown plus machine-readable telemetry
python <skill-dir>/scripts/analyze_agent_sessions.py \
  --output atlas-agent-report.md \
  --json atlas-agent-report.json

# Do not install AgentsView if it is missing
python <skill-dir>/scripts/analyze_agent_sessions.py \
  --output atlas-agent-report.md \
  --no-install

# Force a specific AgentsView command
python <skill-dir>/scripts/analyze_agent_sessions.py \
  --agentsview-bin "uvx agentsview" \
  --output atlas-agent-report.md
```

## What the Script Does?

The wrapper:

- resolves AgentsView from `--agentsview-bin`, `ATLAS_AGENTSVIEW_BIN`, `agentsview`, `uvx agentsview`, then optional install paths
- runs `agentsview sync` before collecting telemetry
- paginates content-free session metadata from `agentsview session list`
- collects all-time token/cost usage, one-year stats, project counts, and activity windows
- normalizes project keys so absolute workspace paths like `/home/name/code/atlas` and bare names like `atlas` roll up together
- writes Markdown, and optionally JSON, without prompt or transcript content

## Report Contents

Expect these sections:

- installation and AgentsView resolution details
- coverage totals and activity-window notes
- all-time token, cache, and cost totals
- agent breakdowns with sessions, project counts, messages, output tokens, context, cost, and average health
- retry, tool-failure, compaction, secret-leak, outcome, and health-grade signals
- model, project, tool-mix, hourly, distribution, and activity tables
- top cost days and top sessions by output, context, and retries

## Agent Response Pattern

After generating a report:

1. Confirm the file written.
2. Briefly summarize the most important telemetry changes or anomalies.
3. Note any data limitations from the report, such as one-year activity clipping or missing token/context coverage.
4. Do not infer productivity quality from private content. Stay with the telemetry.

## Safety Rules

Atlas reports must remain content-free.

Allowed fields include session ids, agents, projects, machines, models, timestamps, token totals, costs, health grades, outcomes, counts, and aggregate timing data.

Never surface or request:

- prompts or user messages
- transcript excerpts
- first-message text or titles
- tool-call arguments
- raw search hits
- raw session exports

Do not call these AgentsView commands for this skill:

- `agentsview session messages`
- `agentsview session search`
- `agentsview session export`

Prefer `--offline` for usage and activity commands so report generation does not depend on pricing lookups.

## Reference

Read `references/source-map.md` when you need the exact upstream command set, install behavior, output coverage notes, or project normalization behavior.
