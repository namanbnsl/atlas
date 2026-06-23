# Atlas AgentsView Source Map

Atlas is a focused wrapper around AgentsView.

## Install Resolution Order

The wrapper resolves AgentsView in this order:

1. `--agentsview-bin` command argument
2. `ATLAS_AGENTSVIEW_BIN` environment variable
3. `agentsview` already on `PATH`
4. `uvx agentsview`
5. `python -m pip install agentsview`
6. `curl -fsSL https://agentsview.io/install.sh | bash` on Unix-like systems

Windows PowerShell installation exists upstream, but the wrapper only attempts pip and the Unix curl installer automatically. On Windows without AgentsView, prefer `--agentsview-bin`, `uvx agentsview`, or a manual install first.

## Commands Atlas Uses

- `agentsview version`
- `agentsview sync`
- `agentsview session list --json --limit 500 --include-one-shot --include-automated --include-children`
- `agentsview stats --format json --since 365d`
- `agentsview usage daily --all --json --breakdown --offline`
- `agentsview usage daily --agent <name> --all --json --breakdown --offline`
- `agentsview projects --json`
- `agentsview activity report --preset custom --from <rfc3339> --to <rfc3339> --bucket 1d --json --offline`

## Data Sources

- `session list` supplies content-free per-session metadata: ids, agents, projects, machines, times, message counts, output tokens, peak context, health grades, outcomes, retries, compactions, and secret-leak counts.
- `stats` supplies one-year aggregate distributions, archetypes, temporal buckets, velocity, tool mix, model mix, agent portfolio, cache economics, and outcome summaries.
- `usage daily` supplies all-history token and cost totals with model breakdowns.
- `projects` supplies known project names and session counts.
- `activity report` supplies timed activity, concurrency, per-project costs, per-model costs, and per-agent costs.

## Project Normalization

Atlas canonicalizes project names before displaying and counting them:

- `/home/namanb/code/atlas` -> `atlas`
- `C:\Users\name\code\atlas` -> `atlas`
- `\\wsl.localhost\Ubuntu\home\name\code\atlas` -> `atlas`
- empty, `none`, `null`, and missing values -> `unknown`

This normalization is applied to session summaries, per-agent project counts, project tables, top-session rows, JSON session telemetry, and activity-by-project rollups.

## Content Exclusions

Do not surface any of the following in Atlas output:

- `first_message`
- `title`
- message text
- search hits
- raw exports
- tool-call arguments

Session ids, project names, agent names, model names, dates, token totals, costs, health grades, outcomes, and counts are allowed.

## Window Notes

- `usage daily --all` can cover all synced history.
- `stats` is run over `365d` for stable analytics.
- `activity report` is clipped to a maximum one-year window because upstream rejects larger ranges.
