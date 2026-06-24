---
name: atlas-agent-telemetry
description: Generate Atlas coding-agent telemetry and behavioral insight reports from local AgentsView data. Use for Atlas reports, agent analytics, costs/tokens, health/outcomes, activity, prompt patterns, failure modes, success patterns, common phrases, and developer-agent workflow insights across Codex, Claude Code, Cursor, OpenCode, Antigravity, Amp, Gemini CLI, and related coding agents.
---

# Atlas Agent Telemetry

Atlas uses AgentsView as the data layer. Do not parse raw agent transcript files yourself. Use AgentsView commands/package surfaces for discovery, stats, search, health, usage, tool calls, and bounded message reads.

Choose one workflow:

- **Telemetry:** content-free metrics and inventory. No prompt text.
- **Behavioral insights:** opt-in local Markdown files using compact quoted session text.

## Telemetry Workflow

Run from the workspace where the report should be written:

```bash
python <skill-dir>/scripts/analyze_agent_sessions.py \
  --output atlas-agent-report.md \
```

Read `atlas-agent-report.md` before answering. Summarize notable telemetry and mention saved paths. Do not infer developer quality from content-free metrics.

## Behavioral Insight Workflow

The goal is not another report full of numbers. The goal is to discover non-obvious, operational truths that change how future agents should work with this developer.

Run one **Atlas Insight Pass** and create one behavioral file:

- `atlas-developer-insights.md` - exact quote evidence, compact case notes, candidate review, and final surviving insights.

Together with the telemetry workflow, Atlas should produce only two top-level report files: `atlas-agent-report.md` for numbers and `atlas-developer-insights.md` for insights plus evidence. Do not create separate `atlas-insight-evidence.md` or `atlas-insight-case-notes.md` files.

Do not ask the user for a second synthesis prompt. In chat, only say which files were written and name the 2-3 sharpest findings.

### Gather Evidence With AgentsView

Use AgentsView for orientation and discovery:

```bash
agentsview sync
agentsview stats --format json
agentsview health --json --limit 50
agentsview projects --json
```

Find contrasting cases rather than ranked winners:

```bash
agentsview session list --json --include-one-shot --include-automated --include-children --sort user-messages:desc --limit 20
agentsview session list --json --include-one-shot --include-automated --include-children --sort failures:desc --limit 20
agentsview session list --json --include-one-shot --include-automated --include-children --sort retries:desc --limit 20
agentsview session list --json --include-one-shot --include-automated --include-children --sort edit-churn:desc --limit 20
agentsview session list --json --include-one-shot --include-automated --include-children --sort health:asc --limit 20
agentsview session list --json --include-one-shot --include-automated --include-children --outcome completed --sort recent:desc --limit 20
agentsview session list --json --include-one-shot --include-automated --include-children --outcome abandoned,errored --sort recent:desc --limit 20
```

Search for language signals, treating snippets as leads only:

```bash
agentsview session search "keep it simple" --json --exclude-system --limit 50
agentsview session search "get rid of" --json --exclude-system --limit 50
agentsview session search "doesn't work" --json --exclude-system --limit 50
agentsview session search "wrong" --json --exclude-system --limit 50
agentsview session search "I meant" --json --exclude-system --limit 50
agentsview session search "actually" --json --exclude-system --limit 50
agentsview session search "don't" --json --exclude-system --limit 50
agentsview session search "no " --json --exclude-system --limit 50
```

For promising sessions, fetch actual surrounding context:

```bash
agentsview session get <session-id> --format json
agentsview health <session-id> --json
agentsview session tool-calls <session-id> --json
agentsview session messages <session-id> --from 0 --limit 12 --direction asc --json
agentsview session messages <session-id> --limit 16 --direction desc --json
agentsview session messages <session-id> --from <ordinal-minus-4> --limit 10 --direction asc --json
```

## Required Files

### `atlas-insight-evidence.md`

Quote ledger. Every final insight must trace back here.

```markdown
# Atlas Insight Evidence

## Q1 - <short label>

Session: <session id>
Role/ordinal: <role, ordinal if available>
Actual text: "<short exact quote>"
Context: <what happened before/after>
Potential signal: <tentative meaning>
Use: yes | no | uncertain
```

Rules:

- Use exact quoted session text. Paraphrase is not enough.
- Keep quotes short and necessary.
- Include counterexample quotes, not just confirming quotes.
- Discard self-referential hits from Atlas docs, prior reports, command examples, or prompt templates.

### `atlas-insight-case-notes.md`

Case notes are working notes, not polished insight prose.

```markdown
## Case: <session id> - <short label>

User wanted: <one sentence>
Agent did: <one sentence>
Turning point: <correction, approval, rejection, or redirect>
Outcome: <what happened, not a metric dump>
Tentative lesson: <may be wrong>
Evidence: Q1, Q4 - "<short quote if useful>"
```

Write at least 8 case notes if enough useful sessions exist. Include successes, failures, corrections, and counterexamples.

### `atlas-developer-insights.md`

This is the final artifact. It must include candidate review and final insights.

```markdown
# Atlas Developer Insights

## Candidate Review

- Status: keep | reject | uncertain
- Claim:
- Evidence: Q-labels plus exact quotes
- Counterevidence or missing evidence:
- Future-agent implication:

## Read This First

3-5 bullets from kept candidates only. No counts.

## Final Insights

For each insight:

- Hidden pattern:
- Why it matters:
- Evidence: Q-labels plus exact quotes
- Agent rule:
- Prompt leverage:

## Rules For Future Agents

Specific do/don't rules.

## Evidence Index

Session ids, quote labels, and one-line case summaries.
```

Include 3-7 final insights. Fewer sharp insights are better than many safe observations.

## Insight Quality Bar

A final insight must pass these tests:

- **Evidence:** cites exact quotes from the Evidence Ledger section of `atlas-developer-insights.md`.
- **Non-obviousness:** not just a visible habit or metric summary.
- **Mechanism:** explains user behavior -> agent interpretation -> consequence.
- **Leverage:** changes the first 10 minutes of a future agent run.
- **Counterfactual:** says what would have gone differently if the agent knew this.
- **Reusable rule:** can become a future-agent instruction.

Reject anything that says only:

- which agent/project/tool was common
- which session had bad health or many retries
- that the developer likes speed, quality, simplicity, or directness
- generic advice like "ask clarifying questions" or "reduce retries"
- flattering personality summaries with no operational value

## What To Look For

Prioritize hidden patterns:

- translation errors between user intent and agent optimization
- product-model drift after scope corrections
- taste-vs-correctness confusion
- silent assumptions the user expects agents to infer
- compressed phrases carrying project history
- late-bound acceptance criteria revealed only after a draft
- negative preference maps from repeated rejections
- delegation sweet spots and traps
- recovery style when the agent is wrong
- prompt leverage that would have prevented an observed failure

## Safety

`atlas-agent-report.md` is content-free. `atlas-developer-insights.md` may include compact quotes because it is part of the default combined Atlas run. Keep behavioral artifacts local by default. Do not paste raw snippets into chat unless the user asks. Do not create extra report files beyond `atlas-agent-report.md` and `atlas-developer-insights.md` unless the user explicitly asks.

If the user says telemetry-only, numbers-only, content-free, or no prompt content, produce only `atlas-agent-report.md`.

## Reference

Read `references/source-map.md` for command details, install behavior, project normalization, and additional AgentsView notes.
