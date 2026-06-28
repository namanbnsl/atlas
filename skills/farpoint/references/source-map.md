# Farpoint AgentsView Source Map

Farpoint wraps AgentsView. Use this file for details; keep `SKILL.md` as the short operator guide.

## Resolution Order

The telemetry wrapper resolves AgentsView in this order:

1. `--agentsview-bin`
2. `FARPOINT_AGENTSVIEW_BIN`
3. `agentsview` on `PATH`
4. `uvx agentsview`
5. `python -m pip install agentsview`
6. Unix curl installer when available

On Windows without AgentsView, prefer `--agentsview-bin`, `uvx agentsview`, or manual install.

## Content-Free Telemetry Commands

The all-time telemetry payload may use:

- `agentsview version`
- `agentsview sync`
- `agentsview session list --json --limit 500 --include-one-shot --include-automated --include-children`
- `agentsview stats --format json`
- `agentsview usage daily --all --json --breakdown --offline`
- `agentsview usage daily --agent <name> --all --json --breakdown --offline`
- `agentsview projects --json`
- `agentsview activity report --preset custom --from <rfc3339> --to <rfc3339> --bucket 1d --json --offline`

Content-free output may include ids, agents, projects, machines, models, timestamps, token totals, costs, health grades, outcomes, and aggregate counts. It must not include prompt text, message text, titles, first-message text, search hits, raw exports, or tool-call arguments.

## Behavioral Insight Commands

Behavioral insight runs are opt-in and may use compact quoted session text. Use AgentsView surfaces; do not parse raw transcript files.

Useful commands:

- `agentsview stats --format json --since <window>` for orientation only.
- `agentsview health --json --limit <N>` and `agentsview health <session-id> --json` for triage.
- `agentsview session list --json --sort user-messages|failures|retries|edit-churn|compactions|peak-context|output-tokens|health|secrets` for contrast cohorts.
- `agentsview session list --json --outcome completed|abandoned,errored` for outcome contrast.
- `agentsview session search <pattern> --json --exclude-system` for leads only.
- `agentsview session get <session-id> --format json` for session metadata.
- `agentsview session tool-calls <session-id> --json` for agent behavior context.
- `agentsview session messages <session-id> --from <ordinal> --limit <N> --direction asc --json` for bounded quote windows.

Search snippets are not evidence. Fetch surrounding messages before making claims.

## Project Normalization

Farpoint canonicalizes project names:

- `/home/namanb/code/farpoint` -> `farpoint`
- `C:\Users\name\code\farpoint` -> `farpoint`
- `\\wsl.localhost\Ubuntu\home\name\code\farpoint` -> `farpoint`
- empty, `none`, `null`, and missing values -> `unknown`

## Behavioral Insight Rules

Default Farpoint runs send one structured JSON payload to the API. Do not create Markdown report artifacts unless the user explicitly asks for export files.

Behavioral insight runs should include an `insights` object with evidence, case notes, candidate review, final insights, rules for future agents, and an evidence index. Final insights must cite Q-labels and exact quotes from the evidence array. Remove claims that cannot be traced to a quote.

A useful insight should identify a hidden mechanism, not a visible metric. Prefer latent patterns, contradictions, silent assumptions, taste signatures, product-model drift, negative preference maps, and prompt leverage.

Reject:

- metric summaries
- obvious personality summaries
- self-referential evidence from Farpoint docs or prior reports
- claims where evidence text is identical to the conclusion
- generic advice such as "ask clarifying questions"

## Window Notes

- `usage daily --all` can cover all synced history.
- `stats should be run without `--since` for the default all-time Farpoint payload.
- `activity report` may be clipped by upstream limits; sessions, usage daily with `--all`, projects, and unwindowed stats are the all-time sources.
