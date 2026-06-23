#!/usr/bin/env python3
"""Atlas AgentsView wrapper."""
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import re
import shlex
import shutil
import subprocess
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any

INSTALL_URL_UNIX = "https://agentsview.io/install.sh"
TOP_N = 10
UNKNOWN_PROJECT = "unknown"


@dataclass
class ResolvedAgentsView:
    command: list[str]
    method: str
    installed: bool
    version: str


class AtlasError(RuntimeError):
    pass


def run(cmd: list[str], check: bool = True) -> subprocess.CompletedProcess[str]:
    proc = subprocess.run(cmd, capture_output=True, text=True, errors="replace")
    if check and proc.returncode != 0:
        detail = proc.stderr.strip() or proc.stdout.strip() or f"exit {proc.returncode}"
        raise AtlasError(f"command failed: {' '.join(cmd)}\n{detail}")
    return proc


def run_json(cmd: list[str]) -> Any:
    proc = run(cmd)
    try:
        return json.loads(proc.stdout)
    except json.JSONDecodeError as exc:
        raise AtlasError(f"invalid JSON from {' '.join(cmd)}") from exc


def parse_iso(value: Any) -> dt.datetime | None:
    if not isinstance(value, str) or not value:
        return None
    text = value[:-1] + "+00:00" if value.endswith("Z") else value
    try:
        return dt.datetime.fromisoformat(text)
    except ValueError:
        return None


def num(value: Any) -> int:
    return int(value) if isinstance(value, (int, float)) and not isinstance(value, bool) else 0


def dec(value: Any) -> float:
    return float(value) if isinstance(value, (int, float)) and not isinstance(value, bool) else 0.0


def fmt_int(value: Any) -> str:
    return f"{num(value):,}" if num(value) else "0"


def fmt_float(value: Any, digits: int = 2) -> str:
    x = dec(value)
    if not x:
        return "0"
    return f"{x:.{digits}f}"


def fmt_money(value: Any) -> str:
    return f"${dec(value):,.4f}" if dec(value) else "$0.0000"


def fmt_minutes(value: Any) -> str:
    return fmt_float(value, 2)


def short_id(session_id: str) -> str:
    if ":" not in session_id:
        return session_id[:18]
    agent, rest = session_id.split(":", 1)
    return f"{agent}:{rest[:8]}"


def canonical_project_name(value: Any) -> str:
    """Collapse absolute workspace paths and bare names into one stable project key."""
    if not isinstance(value, str) or not value.strip():
        return UNKNOWN_PROJECT
    text = value.strip().replace("\\", "/").rstrip("/")
    if not text or text.lower() in {"unknown", "none", "null"}:
        return UNKNOWN_PROJECT
    if re.match(r"^[a-zA-Z]:/", text):
        text = text[3:]
    marker = "/code/"
    if marker in text:
        return text.rsplit(marker, 1)[1].strip("/") or UNKNOWN_PROJECT
    if text.startswith("/"):
        return Path(text).name or UNKNOWN_PROJECT
    return text


def project_value(item: dict[str, Any]) -> str:
    return canonical_project_name(item.get("project"))


def version_for(command: list[str]) -> str:
    proc = run(command + ["version"])
    return proc.stdout.strip() or proc.stderr.strip() or "unknown"


def resolve_agentsview(explicit: str | None, allow_install: bool) -> ResolvedAgentsView:
    env_override = os.environ.get("ATLAS_AGENTSVIEW_BIN")
    if explicit:
        cmd = shlex.split(explicit)
        return ResolvedAgentsView(cmd, "explicit", False, version_for(cmd))
    if env_override:
        cmd = shlex.split(env_override)
        return ResolvedAgentsView(cmd, "env", False, version_for(cmd))
    direct = shutil.which("agentsview")
    if direct:
        cmd = [direct]
        return ResolvedAgentsView(cmd, "path", False, version_for(cmd))
    uvx = shutil.which("uvx")
    if uvx:
        cmd = [uvx, "agentsview"]
        return ResolvedAgentsView(cmd, "uvx", False, version_for(cmd))
    if not allow_install:
        raise AtlasError(
            "AgentsView is unavailable. Try `uvx agentsview`, `python -m pip install agentsview`, or `curl -fsSL https://agentsview.io/install.sh | bash`."
        )
    if run([sys.executable, "-m", "pip", "install", "agentsview"], check=False).returncode == 0:
        direct = shutil.which("agentsview")
        if direct:
            cmd = [direct]
            return ResolvedAgentsView(cmd, "pip", True, version_for(cmd))
    if os.name != "nt" and shutil.which("curl"):
        install_cmd = ["bash", "-lc", f"curl -fsSL {shlex.quote(INSTALL_URL_UNIX)} | bash"]
        if subprocess.run(install_cmd, capture_output=True, text=True).returncode == 0:
            direct = shutil.which("agentsview")
            if direct:
                cmd = [direct]
                return ResolvedAgentsView(cmd, "curl", True, version_for(cmd))
    raise AtlasError("Unable to resolve or install AgentsView.")


def av(resolved: ResolvedAgentsView, *args: str) -> list[str]:
    return resolved.command + list(args)


def fetch_sessions(resolved: ResolvedAgentsView) -> list[dict[str, Any]]:
    sessions: list[dict[str, Any]] = []
    cursor: str | None = None
    while True:
        cmd = av(
            resolved,
            "session",
            "list",
            "--json",
            "--limit",
            "500",
            "--include-one-shot",
            "--include-automated",
            "--include-children",
        )
        if cursor:
            cmd.extend(["--cursor", cursor])
        payload = run_json(cmd)
        batch = payload.get("sessions", []) if isinstance(payload, dict) else []
        sessions.extend(item for item in batch if isinstance(item, dict))
        cursor = payload.get("next_cursor") if isinstance(payload, dict) else None
        if not cursor:
            break
    return sessions


def fetch_activity(resolved: ResolvedAgentsView, sessions: list[dict[str, Any]]) -> tuple[dict[str, Any], str]:
    now = dt.datetime.now(dt.timezone.utc).replace(microsecond=0)
    floor = now - dt.timedelta(days=365)
    started_values = [parse_iso(item.get("started_at")) for item in sessions]
    oldest = min((value for value in started_values if value is not None), default=floor)
    since_dt = max(oldest, floor)
    note = (
        "activity window covers all synced sessions"
        if oldest >= floor
        else "activity window clipped to the most recent 365 days by AgentsView"
    )
    payload = run_json(
        av(
            resolved,
            "activity",
            "report",
            "--preset",
            "custom",
            "--from",
            since_dt.isoformat().replace("+00:00", "Z"),
            "--to",
            now.isoformat().replace("+00:00", "Z"),
            "--bucket",
            "1d",
            "--json",
            "--offline",
        )
    )
    return (payload if isinstance(payload, dict) else {}), note


def build_model_rows(daily: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_model: dict[str, dict[str, Any]] = {}
    for day in daily:
        for item in day.get("modelBreakdowns", []) or []:
            if not isinstance(item, dict):
                continue
            name = str(item.get("modelName") or "unknown")
            row = by_model.setdefault(
                name,
                {
                    "model": name,
                    "days": 0,
                    "input": 0,
                    "output": 0,
                    "cache_create": 0,
                    "cache_read": 0,
                    "cost": 0.0,
                },
            )
            row["days"] += 1
            row["input"] += num(item.get("inputTokens"))
            row["output"] += num(item.get("outputTokens"))
            row["cache_create"] += num(item.get("cacheCreationTokens"))
            row["cache_read"] += num(item.get("cacheReadTokens"))
            row["cost"] += dec(item.get("cost"))
    rows = list(by_model.values())
    rows.sort(key=lambda item: (item["cost"], item["output"], item["input"]), reverse=True)
    return rows


def summarize_sessions(sessions: list[dict[str, Any]]) -> dict[str, Any]:
    agents = Counter()
    outcomes = Counter()
    grades = Counter()
    projects = Counter()
    machines = Counter()
    per_agent: dict[str, dict[str, Any]] = defaultdict(
        lambda: {
            "sessions": 0,
            "human": 0,
            "automated": 0,
            "projects": set(),
            "messages": 0,
            "user_messages": 0,
            "peak_context": 0,
            "retries": 0,
            "tool_failures": 0,
            "compactions": 0,
            "secret_leaks": 0,
            "health_sum": 0.0,
            "health_count": 0,
            "outcomes": Counter(),
            "grades": Counter(),
            "first_seen": None,
            "last_seen": None,
        }
    )
    first_seen = None
    last_seen = None
    with_output = 0
    with_context = 0
    for item in sessions:
        agent = str(item.get("agent") or "unknown")
        project = project_value(item)
        outcome = str(item.get("outcome") or "unknown")
        grade = str(item.get("health_grade") or "unknown")
        started = parse_iso(item.get("started_at"))
        ended = parse_iso(item.get("ended_at"))
        agents[agent] += 1
        outcomes[outcome] += 1
        grades[grade] += 1
        projects[project] += 1
        machines[str(item.get("machine") or "unknown")] += 1
        with_output += 1 if item.get("has_total_output_tokens") else 0
        with_context += 1 if item.get("has_peak_context_tokens") else 0
        row = per_agent[agent]
        row["sessions"] += 1
        row["human"] += 0 if item.get("is_automated") else 1
        row["automated"] += 1 if item.get("is_automated") else 0
        row["projects"].add(project)
        row["messages"] += num(item.get("message_count"))
        row["user_messages"] += num(item.get("user_message_count"))
        row["peak_context"] = max(row["peak_context"], num(item.get("peak_context_tokens")))
        row["retries"] += num(item.get("tool_retry_count"))
        row["tool_failures"] += num(item.get("tool_failure_signal_count"))
        row["compactions"] += num(item.get("compaction_count")) + num(item.get("mid_task_compaction_count"))
        row["secret_leaks"] += num(item.get("secret_leak_count"))
        if item.get("health_score") is not None:
            row["health_sum"] += dec(item.get("health_score"))
            row["health_count"] += 1
        row["outcomes"][outcome] += 1
        row["grades"][grade] += 1
        if started and (row["first_seen"] is None or started < row["first_seen"]):
            row["first_seen"] = started
        if ended and (row["last_seen"] is None or ended > row["last_seen"]):
            row["last_seen"] = ended
        for current in (started, ended):
            if current and (first_seen is None or current < first_seen):
                first_seen = current
            if current and (last_seen is None or current > last_seen):
                last_seen = current
    return {
        "agents": agents,
        "outcomes": outcomes,
        "grades": grades,
        "projects": projects,
        "machines": machines,
        "per_agent": per_agent,
        "first_seen": first_seen,
        "last_seen": last_seen,
        "with_output": with_output,
        "with_context": with_context,
    }


def clean_sessions(sessions: list[dict[str, Any]]) -> list[dict[str, Any]]:
    fields = [
        "id",
        "agent",
        "project",
        "machine",
        "started_at",
        "ended_at",
        "message_count",
        "user_message_count",
        "total_output_tokens",
        "peak_context_tokens",
        "has_total_output_tokens",
        "has_peak_context_tokens",
        "is_automated",
        "tool_failure_signal_count",
        "tool_retry_count",
        "compaction_count",
        "mid_task_compaction_count",
        "outcome",
        "health_score",
        "health_grade",
        "secret_leak_count",
    ]
    cleaned = []
    for item in sessions:
        row = {field: item.get(field) for field in fields}
        row["project"] = project_value(item)
        cleaned.append(row)
    return cleaned


def bucket_edge_label(start: Any, end: Any) -> str:
    left = fmt_float(start, 0) if isinstance(start, (int, float)) else str(start)
    if end is None:
        return f">= {left}"
    right = fmt_float(end, 0) if isinstance(end, (int, float)) else str(end)
    return f"{left} to <{right}"


def bucket_rows(section: dict[str, Any]) -> list[tuple[str, int]]:
    scope = section.get("scope_all", {}) if isinstance(section, dict) else {}
    rows = []
    for item in scope.get("buckets", []) or []:
        if not isinstance(item, dict):
            continue
        edge = item.get("edge")
        if not isinstance(edge, list) or len(edge) != 2:
            continue
        rows.append((bucket_edge_label(edge[0], edge[1]), num(item.get("count"))))
    return rows


def hourly_rollup(stats: dict[str, Any]) -> list[dict[str, Any]]:
    rollup: dict[int, dict[str, Any]] = {}
    temporal = stats.get("temporal", {}) if isinstance(stats, dict) else {}
    for item in temporal.get("hourly_utc", []) or []:
        if not isinstance(item, dict):
            continue
        stamp = parse_iso(item.get("ts"))
        if stamp is None:
            continue
        row = rollup.setdefault(stamp.hour, {"hour": stamp.hour, "sessions": 0, "user_messages": 0})
        row["sessions"] += num(item.get("sessions"))
        row["user_messages"] += num(item.get("user_messages"))
    rows = list(rollup.values())
    rows.sort(key=lambda item: item["hour"])
    return rows


def project_rows(projects: list[dict[str, Any]]) -> list[dict[str, Any]]:
    totals: dict[str, int] = Counter()
    for row in projects:
        if not isinstance(row, dict):
            continue
        totals[canonical_project_name(row.get("name"))] += num(row.get("session_count"))
    rows = [{"name": name, "session_count": count} for name, count in totals.items()]
    rows.sort(key=lambda row: num(row.get("session_count")), reverse=True)
    return rows


def activity_project_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    totals: dict[str, dict[str, Any]] = {}
    for row in rows:
        if not isinstance(row, dict):
            continue
        key = canonical_project_name(row.get("key"))
        target = totals.setdefault(
            key,
            {
                "key": key,
                "agent_minutes": 0.0,
                "cost": 0.0,
                "interactive_agent_minutes": 0.0,
                "automated_agent_minutes": 0.0,
            },
        )
        target["agent_minutes"] += dec(row.get("agent_minutes"))
        target["cost"] += dec(row.get("cost"))
        target["interactive_agent_minutes"] += dec(row.get("interactive_agent_minutes"))
        target["automated_agent_minutes"] += dec(row.get("automated_agent_minutes"))
    result = list(totals.values())
    result.sort(key=lambda row: (dec(row.get("agent_minutes")), dec(row.get("cost"))), reverse=True)
    return result


def write_distribution(lines: list[str], title: str, section: dict[str, Any], unit: str) -> None:
    rows = bucket_rows(section)
    if not rows:
        return
    mean = section.get("scope_all", {}).get("mean") if isinstance(section, dict) else None
    null_count = section.get("null_count") if isinstance(section, dict) else None
    lines.extend(["", f"## {title}", "", f"- Mean: {fmt_float(mean, 2)} {unit}" if mean is not None else f"- Mean: unknown"])
    if null_count is not None:
        lines.append(f"- Null count: {fmt_int(null_count)}")
    lines.extend(["", "| Bucket | Sessions |", "| --- | ---: |"])
    for label, count in rows:
        lines.append(f"| {label} | {count:,} |")



def strip_content_fields(value: Any) -> Any:
    banned = {"first_message", "title"}
    if isinstance(value, dict):
        return {key: strip_content_fields(item) for key, item in value.items() if key not in banned}
    if isinstance(value, list):
        return [strip_content_fields(item) for item in value]
    return value
def make_report(
    resolved: ResolvedAgentsView,
    sync_summary: str,
    sessions: list[dict[str, Any]],
    usage_all: dict[str, Any],
    usage_by_agent: dict[str, dict[str, Any]],
    projects: list[dict[str, Any]],
    activity: dict[str, Any],
    activity_note: str,
    stats: dict[str, Any],
) -> str:
    generated = dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()
    summary = summarize_sessions(sessions)
    daily = [row for row in usage_all.get("daily", []) if isinstance(row, dict)]
    models = build_model_rows(daily)
    projects_sorted = project_rows(projects)
    top_days = sorted(daily, key=lambda row: dec(row.get("totalCost")), reverse=True)[:TOP_N]
    top_output = sorted(sessions, key=lambda row: num(row.get("total_output_tokens")), reverse=True)[:TOP_N]
    top_context = sorted(sessions, key=lambda row: num(row.get("peak_context_tokens")), reverse=True)[:TOP_N]
    top_retry = sorted(sessions, key=lambda row: num(row.get("tool_retry_count")), reverse=True)[:TOP_N]
    stats_window = stats.get("window", {}) if isinstance(stats, dict) else {}
    stats_totals = stats.get("totals", {}) if isinstance(stats, dict) else {}
    velocity = stats.get("velocity", {}) if isinstance(stats, dict) else {}
    tool_mix = stats.get("tool_mix", {}) if isinstance(stats, dict) else {}
    outcomes = stats.get("outcomes", {}) if isinstance(stats, dict) else {}
    archetypes = stats.get("archetypes", {}) if isinstance(stats, dict) else {}
    cache = stats.get("cache_economics", {}) if isinstance(stats, dict) else {}
    adoption = stats.get("adoption", {}) if isinstance(stats, dict) else {}
    portfolio = stats.get("agent_portfolio", {}) if isinstance(stats, dict) else {}
    model_mix = stats.get("model_mix", {}) if isinstance(stats, dict) else {}
    lines = [
        "# Atlas Agent Report",
        "",
        f"Generated: {generated}",
        "",
        "## Installation",
        "",
        f"- AgentsView command: `{' '.join(resolved.command)}`",
        f"- Resolution method: {resolved.method}",
        f"- Installed during run: {'yes' if resolved.installed else 'no'}",
        f"- Version: {resolved.version}",
        f"- Sync: {sync_summary}",
        "",
        "## Coverage",
        "",
        f"- Sessions: {len(sessions):,}",
        f"- Agents: {len(summary['agents']):,}",
        f"- Projects: {len(summary['projects']):,}",
        f"- Machines: {len(summary['machines']):,}",
        f"- Sessions with output-token data: {summary['with_output']:,}",
        f"- Sessions with peak-context data: {summary['with_context']:,}",
        f"- First seen: {summary['first_seen'].isoformat() if summary['first_seen'] else 'unknown'}",
        f"- Last seen: {summary['last_seen'].isoformat() if summary['last_seen'] else 'unknown'}",
        f"- Usage days with token data: {len(daily):,}",
        f"- Activity window note: {activity_note}",
        "",
        "## All-Time Usage Totals",
        "",
        f"- Input tokens: {fmt_int(usage_all.get('totals', {}).get('inputTokens'))}",
        f"- Output tokens: {fmt_int(usage_all.get('totals', {}).get('outputTokens'))}",
        f"- Cache creation tokens: {fmt_int(usage_all.get('totals', {}).get('cacheCreationTokens'))}",
        f"- Cache read tokens: {fmt_int(usage_all.get('totals', {}).get('cacheReadTokens'))}",
        f"- Total cost: {fmt_money(usage_all.get('totals', {}).get('totalCost'))}",
        f"- Cache savings: {fmt_money(usage_all.get('totals', {}).get('cacheSavings'))}",
        "",
        "## Agent Breakdown",
        "",
        "| Agent | Sessions | Human | Automated | Projects | Messages | User msgs | Output tokens | Peak context max | Cost | Avg health | First seen | Last seen |",
        "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |",
    ]
    for agent, _count in summary["agents"].most_common():
        row = summary["per_agent"][agent]
        usage = usage_by_agent.get(agent, {}).get("totals", {})
        avg_health = row["health_sum"] / row["health_count"] if row["health_count"] else 0.0
        lines.append(
            f"| {agent} | {row['sessions']:,} | {row['human']:,} | {row['automated']:,} | {len(row['projects']):,} | {row['messages']:,} | {row['user_messages']:,} | {fmt_int(usage.get('outputTokens'))} | {row['peak_context']:,} | {fmt_money(usage.get('totalCost'))} | {avg_health:.1f} | {(row['first_seen'].date().isoformat() if row['first_seen'] else '')} | {(row['last_seen'].date().isoformat() if row['last_seen'] else '')} |"
        )
    lines.extend([
        "",
        "## Agent Signals",
        "",
        "| Agent | Retries | Tool failures | Compactions | Secret leaks | Outcomes | Health grades |",
        "| --- | ---: | ---: | ---: | ---: | --- | --- |",
    ])
    for agent, _count in summary["agents"].most_common():
        row = summary["per_agent"][agent]
        outcome_text = ", ".join(f"{key}:{value}" for key, value in row["outcomes"].most_common())
        grade_text = ", ".join(f"{key}:{value}" for key, value in row["grades"].most_common())
        lines.append(
            f"| {agent} | {row['retries']:,} | {row['tool_failures']:,} | {row['compactions']:,} | {row['secret_leaks']:,} | {outcome_text} | {grade_text} |"
        )
    lines.extend([
        "",
        "## Models",
        "",
        "| Model | Days | Input tokens | Output tokens | Cache create | Cache read | Cost |",
        "| --- | ---: | ---: | ---: | ---: | ---: | ---: |",
    ])
    for row in models:
        lines.append(
            f"| {row['model']} | {row['days']:,} | {row['input']:,} | {row['output']:,} | {row['cache_create']:,} | {row['cache_read']:,} | {fmt_money(row['cost'])} |"
        )
    lines.extend(["", "## Projects", "", "| Project | Sessions |", "| --- | ---: |"])
    for row in projects_sorted:
        lines.append(f"| {str(row.get('name') or 'unknown')} | {num(row.get('session_count')):,} |")
    lines.extend([
        "",
        "## Stats Window (365d)",
        "",
        f"- Since: {stats_window.get('since', 'unknown')}",
        f"- Until: {stats_window.get('until', 'unknown')}",
        f"- Days: {fmt_int(stats_window.get('days'))}",
        f"- Sessions: {fmt_int(stats_totals.get('sessions_all'))}",
        f"- Human sessions: {fmt_int(stats_totals.get('sessions_human'))}",
        f"- Automation sessions: {fmt_int(stats_totals.get('sessions_automation'))}",
        f"- Messages: {fmt_int(stats_totals.get('messages_total'))}",
        f"- User messages: {fmt_int(stats_totals.get('user_messages_total'))}",
        "",
        "## Stats Summary (365d)",
        "",
        f"- Primary archetype: {archetypes.get('primary', 'unknown')}",
        f"- Quick sessions: {fmt_int(archetypes.get('quick'))}",
        f"- Standard sessions: {fmt_int(archetypes.get('standard'))}",
        f"- Deep sessions: {fmt_int(archetypes.get('deep'))}",
        f"- Marathon sessions: {fmt_int(archetypes.get('marathon'))}",
        f"- Turn cycle p50 seconds: {fmt_float(velocity.get('turn_cycle_seconds', {}).get('p50'), 1)}",
        f"- Turn cycle p90 seconds: {fmt_float(velocity.get('turn_cycle_seconds', {}).get('p90'), 1)}",
        f"- First response p50 seconds: {fmt_float(velocity.get('first_response_seconds', {}).get('p50'), 1)}",
        f"- First response p90 seconds: {fmt_float(velocity.get('first_response_seconds', {}).get('p90'), 1)}",
        f"- Messages per active hour: {fmt_float(velocity.get('messages_per_active_hour'), 2)}",
        f"- Distinct skills: {fmt_int(adoption.get('distinct_skills'))}",
        f"- Plan mode rate: {fmt_float(adoption.get('plan_mode_rate'), 4)}",
        f"- Subagents per session: {fmt_float(adoption.get('subagents_per_session'), 2)}",
        f"- Cache dollars spent: {fmt_money(cache.get('dollars_spent'))}",
        f"- Cache dollars saved vs uncached: {fmt_money(cache.get('dollars_saved_vs_uncached'))}",
        f"- Cache hit ratio overall: {fmt_float(cache.get('cache_hit_ratio', {}).get('overall'), 4)}",
        f"- Success count: {fmt_int(outcomes.get('success'))}",
        f"- Failure count: {fmt_int(outcomes.get('failure'))}",
        f"- Unknown outcome count: {fmt_int(outcomes.get('unknown'))}",
        f"- Tool retry rate: {fmt_float(outcomes.get('tool_retry_rate'), 4)}",
        f"- Compactions per session: {fmt_float(outcomes.get('compactions_per_session'), 2)}",
        f"- Average edit churn: {fmt_float(outcomes.get('avg_edit_churn'), 2)}",
    ])
    model_mix_rows = sorted((model_mix.get("by_tokens") or {}).items(), key=lambda item: num(item[1]), reverse=True)
    if model_mix_rows:
        lines.extend(["", "## Stats Model Tokens (365d)", "", "| Model | Tokens |", "| --- | ---: |"])
        for name, value in model_mix_rows:
            lines.append(f"| {name} | {num(value):,} |")
    portfolio_rows = sorted((portfolio.get("by_sessions") or {}).items(), key=lambda item: num(item[1]), reverse=True)
    if portfolio_rows:
        lines.extend(["", "## Stats Agent Portfolio (365d)", "", "| Agent | Sessions | Tokens | Messages |", "| --- | ---: | ---: | ---: |"])
        by_tokens = portfolio.get("by_tokens") or {}
        by_messages = portfolio.get("by_messages") or {}
        for name, value in portfolio_rows:
            lines.append(f"| {name} | {num(value):,} | {num(by_tokens.get(name)):,} | {num(by_messages.get(name)):,} |")
    tool_rows = sorted((tool_mix.get("by_category") or {}).items(), key=lambda item: num(item[1]), reverse=True)
    if tool_rows:
        lines.extend(["", "## Stats Tool Mix (365d)", "", f"- Total tool calls: {fmt_int(tool_mix.get('total_calls'))}", "", "| Category | Calls |", "| --- | ---: |"])
        for name, value in tool_rows:
            lines.append(f"| {name} | {num(value):,} |")
    write_distribution(lines, "Session Duration Distribution (365d)", stats.get("distributions", {}).get("duration_minutes", {}), "minutes")
    write_distribution(lines, "User Message Distribution (365d)", stats.get("distributions", {}).get("user_messages", {}), "messages")
    write_distribution(lines, "Peak Context Distribution (365d)", stats.get("distributions", {}).get("peak_context_tokens", {}), "tokens")
    write_distribution(lines, "Tools Per Turn Distribution (365d)", stats.get("distributions", {}).get("tools_per_turn", {}), "tools")
    hourly = hourly_rollup(stats)
    if hourly:
        lines.extend(["", "## Hourly UTC Activity (365d)", "", "| Hour (UTC) | Sessions | User messages |", "| --- | ---: | ---: |"])
        for row in hourly:
            lines.append(f"| {row['hour']:02d}:00 | {row['sessions']:,} | {row['user_messages']:,} |")
    activity_totals = activity.get("totals", {}) if isinstance(activity, dict) else {}
    peak = activity.get("peak", {}) if isinstance(activity, dict) else {}
    lines.extend([
        "",
        "## Activity Window",
        "",
        f"- Activity range start: {activity.get('range_start', 'unknown')}",
        f"- Activity range end: {activity.get('effective_end', activity.get('range_end', 'unknown'))}",
        f"- Active minutes: {fmt_minutes(activity_totals.get('active_minutes'))}",
        f"- Idle minutes: {fmt_minutes(activity_totals.get('idle_minutes'))}",
        f"- Agent minutes: {fmt_minutes(activity_totals.get('agent_minutes'))}",
        f"- Interactive sessions: {fmt_int(activity_totals.get('interactive_sessions'))}",
        f"- Automated sessions: {fmt_int(activity_totals.get('automated_sessions'))}",
        f"- Distinct projects: {len(summary['projects']):,}",
        f"- Distinct models: {fmt_int(activity_totals.get('distinct_models'))}",
        f"- Output tokens: {fmt_int(activity_totals.get('output_tokens'))}",
        f"- Cost: {fmt_money(activity_totals.get('cost'))}",
        f"- Peak concurrent agents: {fmt_int(peak.get('agents'))}",
        f"- Peak concurrency at: {peak.get('at', 'unknown')}",
    ])
    for title, rows in [
        ("Activity By Agent", activity.get("by_agent", [])),
        ("Activity By Model", activity.get("by_model", [])),
        ("Activity By Project", activity.get("by_project", [])),
    ]:
        if not isinstance(rows, list) or not rows:
            continue
        display_rows = activity_project_rows(rows) if title == "Activity By Project" else rows
        lines.extend(["", f"## {title}", "", "| Key | Agent minutes | Cost | Interactive minutes | Automated minutes |", "| --- | ---: | ---: | ---: | ---: |"])
        for row in display_rows:
            lines.append(
                f"| {str(row.get('key') or 'unknown')} | {fmt_minutes(row.get('agent_minutes'))} | {fmt_money(row.get('cost'))} | {fmt_minutes(row.get('interactive_agent_minutes'))} | {fmt_minutes(row.get('automated_agent_minutes'))} |"
            )
    lines.extend(["", "## Top Cost Days", "", "| Date | Input tokens | Output tokens | Cost | Models |", "| --- | ---: | ---: | ---: | --- |"])
    for row in top_days:
        models_used = ", ".join(str(x) for x in (row.get("modelsUsed") or [])[:6])
        lines.append(
            f"| {str(row.get('date') or 'unknown')} | {num(row.get('inputTokens')):,} | {num(row.get('outputTokens')):,} | {fmt_money(row.get('totalCost'))} | {models_used} |"
        )

    def add_sessions(title: str, rows: list[dict[str, Any]]) -> None:
        lines.extend(["", f"## {title}", "", "| Session | Agent | Project | Started | Ended | Output tokens | Peak context | Health | Outcome | Retries |", "| --- | --- | --- | --- | --- | ---: | ---: | --- | --- | ---: |"])
        for row in rows:
            lines.append(
                f"| {short_id(str(row.get('id') or 'unknown'))} | {str(row.get('agent') or 'unknown')} | {project_value(row)} | {str(row.get('started_at') or '')} | {str(row.get('ended_at') or '')} | {num(row.get('total_output_tokens')):,} | {num(row.get('peak_context_tokens')):,} | {str(row.get('health_grade') or '')} | {str(row.get('outcome') or '')} | {num(row.get('tool_retry_count')):,} |"
            )

    add_sessions("Top Output Sessions", top_output)
    add_sessions("Top Context Sessions", top_context)
    add_sessions("Top Retry Sessions", top_retry)
    return "\n".join(lines).rstrip() + "\n"


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Use AgentsView CLI to generate an Atlas Markdown telemetry report.")
    parser.add_argument("--output", default="atlas-agent-report.md", help="Markdown report path")
    parser.add_argument("--json", dest="json_path", help="Optional JSON report path")
    parser.add_argument("--agentsview-bin", help="Explicit AgentsView command or binary path")
    parser.add_argument("--no-install", action="store_true", help="Do not attempt to install AgentsView if missing")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    resolved = resolve_agentsview(args.agentsview_bin, allow_install=not args.no_install)
    sync_output = [line.strip() for line in run(av(resolved, "sync")).stdout.splitlines() if line.strip()]
    sync_lines = [line for line in sync_output if line.startswith("Sync complete:") or line.startswith("Database:")]
    sync_summary = " | ".join(sync_lines or sync_output[-2:]) or "Sync completed"
    sessions = fetch_sessions(resolved)
    usage_all = run_json(av(resolved, "usage", "daily", "--all", "--json", "--breakdown", "--offline"))
    stats = run_json(av(resolved, "stats", "--format", "json", "--since", "365d"))
    agents = sorted({str(item.get("agent") or "unknown") for item in sessions})
    usage_by_agent = {
        agent: run_json(av(resolved, "usage", "daily", "--agent", agent, "--all", "--json", "--breakdown", "--offline"))
        for agent in agents
    }
    projects = run_json(av(resolved, "projects", "--json"))
    activity, activity_note = fetch_activity(resolved, sessions)
    markdown = make_report(
        resolved,
        sync_summary,
        sessions,
        usage_all if isinstance(usage_all, dict) else {},
        usage_by_agent,
        projects if isinstance(projects, list) else [],
        activity,
        activity_note,
        stats if isinstance(stats, dict) else {},
    )
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(markdown, encoding="utf-8")
    if args.json_path:
        payload = {
            "generated_at": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat(),
            "agentsview": {
                "command": resolved.command,
                "resolution_method": resolved.method,
                "installed_during_run": resolved.installed,
                "version": resolved.version,
                "sync_summary": sync_summary,},
            "activity_window_note": activity_note,
            "sessions": strip_content_fields(clean_sessions(sessions)),
            "usage_all": strip_content_fields(usage_all),
            "usage_by_agent": strip_content_fields(usage_by_agent),
            "projects": strip_content_fields(project_rows(projects if isinstance(projects, list) else [])),
            "activity": strip_content_fields(activity),
            "stats_365d": strip_content_fields(stats),
        }
        json_path = Path(args.json_path)
        json_path.parent.mkdir(parents=True, exist_ok=True)
        json_path.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except AtlasError as exc:
        print(f"Atlas error: {exc}", file=sys.stderr)
        raise SystemExit(1)


