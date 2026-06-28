---
name: farpoint-agent-info
description: Send Farpoint coding-agent telemetry and behavioral insights from local AgentsView data to the Farpoint API. Use for Farpoint agent analytics, costs/tokens, health/outcomes, activity, prompt patterns, failure modes, success patterns, common phrases, and developer-agent workflow insights across Codex, Claude Code, Cursor, OpenCode, Antigravity, Amp, Gemini CLI, and related coding agents.
---

# Farpoint Agent Telemetry

Farpoint uses AgentsView as the data layer. Do not parse raw agent transcript files yourself. Use AgentsView commands/package surfaces for discovery, stats, search, health, usage, tool calls, and bounded message reads.

Send results to the Farpoint API as structured JSON. Do not create Markdown reports.

Default local endpoint:

```text
http://localhost:3000/api/ingest
```

## Telemetry Workflow

Run from the workspace where Farpoint should collect data:

```bash
python <skill-dir>/scripts/analyze_agent_sessions.py \
  --api-url http://localhost:3000/api/ingest
```

The script syncs AgentsView, collects all-time content-free telemetry from all synced sessions, and POSTs one JSON payload to the API. Do not infer developer quality from content-free metrics.

## Behavioral Insight Workflow

The goal is not another report full of numbers. The goal is to discover non-obvious, operational truths that change how future agents should work with this developer.

Run one **Farpoint Insight Pass** across all synced history and send behavioral insight data to the API in the same payload shape. The payload should include compact exact quote evidence, compact case notes, candidate review, and final surviving insights.

Do not ask the user for a second synthesis prompt. In chat, only say whether the API accepted the payload and name the 2-3 sharpest findings.

### Gather Evidence With AgentsView

Use AgentsView for orientation and discovery:

```bash
agentsview sync
agentsview stats --format json
agentsview health --json --limit 50
agentsview projects --json
```

Find contrasting cases across all synced history rather than ranked winners:

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

## API Payload Shape

Send one JSON object:

```json
{
  "source": "agentsview",
  "generated_at": "2026-06-26T00:00:00+00:00",
  "telemetry": {},
  "insights": {
    "evidence": [],
    "case_notes": [],
    "candidate_review": [],
    "read_this_first": [],
    "final_insights": [],
    "rules_for_future_agents": []
  }
}
```

Telemetry payloads may omit `insights`. Behavioral runs should include both telemetry and insights.

### Evidence

Quote ledger. Every final insight must trace back here.

```json
{
  "label": "Q1",
  "session_id": "<session id>",
  "role": "<role>",
  "ordinal": 12,
  "actual_text": "<short exact quote>",
  "context": "<what happened before/after>",
  "potential_signal": "<tentative meaning>",
  "use": "yes"
}
```

Rules:

- Use exact quoted session text. Paraphrase is not enough.
- Keep quotes short and necessary.
- Include counterexample quotes, not just confirming quotes.
- Discard self-referential hits from Farpoint docs, prior reports, command examples, or prompt templates.

### Case Notes

Case notes are working notes, not polished insight prose.

```json
{
  "session_id": "<session id>",
  "label": "<short label>",
  "user_wanted": "<one sentence>",
  "agent_did": "<one sentence>",
  "turning_point": "<correction, approval, rejection, or redirect>",
  "outcome": "<what happened, not a metric dump>",
  "tentative_lesson": "<may be wrong>",
  "evidence": ["Q1", "Q4"]
}
```

Write at least 8 case notes if enough useful sessions exist. Include successes, failures, corrections, and counterexamples.

### Final Insights

Final insight data must include candidate review and final insights.

```json
{
  "candidate_review": [
    {
      "status": "keep",
      "claim": "<claim>",
      "evidence": ["Q1"],
      "counterevidence_or_missing_evidence": "<text>",
      "future_agent_implication": "<text>"
    }
  ],
  "read_this_first": ["<3-5 bullets from kept candidates only>"],
  "final_insights": [
    {
      "hidden_pattern": "<text>",
      "why_it_matters": "<text>",
      "evidence": ["Q1"],
      "agent_rule": "<text>",
      "prompt_leverage": "<text>"
    }
  ],
  "rules_for_future_agents": ["<specific do/don't rule>"],
  "evidence_index": []
}
```

Include 3-7 final insights. Fewer sharp insights are better than many safe observations.

## Insight Quality Bar

A final insight must pass these tests:

- **Evidence:** cites exact quotes from the evidence array.
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

## Reference

Read `references/source-map.md` for command details, install behavior, project normalization, and additional AgentsView notes.
