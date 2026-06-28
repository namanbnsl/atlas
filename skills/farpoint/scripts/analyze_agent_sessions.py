#!/usr/bin/env python3
"""Farpoint AgentsView wrapper."""
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
import urllib.error
import urllib.request
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


class FarpointError(RuntimeError):
    pass


def run(cmd: list[str], check: bool = True) -> subprocess.CompletedProcess[str]:
    proc = subprocess.run(cmd, capture_output=True, text=True, errors="replace")
    if check and proc.returncode != 0:
        detail = proc.stderr.strip() or proc.stdout.strip() or f"exit {proc.returncode}"
        raise FarpointError(f"command failed: {' '.join(cmd)}\n{detail}")
    return proc


def run_json(cmd: list[str]) -> Any:
    proc = run(cmd)
    try:
        return json.loads(proc.stdout)
    except json.JSONDecodeError as exc:
        raise FarpointError(f"invalid JSON from {' '.join(cmd)}") from exc


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
    env_override = os.environ.get("FARPOINT_AGENTSVIEW_BIN")
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
        raise FarpointError(
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
    raise FarpointError("Unable to resolve or install AgentsView.")


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


def strip_content_fields(value: Any) -> Any:
    """Remove known prompt/content fields before telemetry leaves the machine."""
    banned = {"first_message", "title", "content", "text", "message", "prompt"}
    if isinstance(value, dict):
        return {key: strip_content_fields(item) for key, item in value.items() if key not in banned}
    if isinstance(value, list):
        return [strip_content_fields(item) for item in value]
    return value


def make_payload(
    resolved: ResolvedAgentsView,
    sync_summary: str,
    sessions: list[dict[str, Any]],
    usage_all: dict[str, Any],
    usage_by_agent: dict[str, dict[str, Any]],
    projects: list[dict[str, Any]],
    activity: dict[str, Any],
    activity_note: str,
    stats: dict[str, Any],
) -> dict[str, Any]:
    summary = summarize_sessions(sessions)
    telemetry = {
        "agentsview": {
            "command": resolved.command,
            "resolution_method": resolved.method,
            "installed_during_run": resolved.installed,
            "version": resolved.version,
            "sync_summary": sync_summary,
        },
        "activity_window_note": activity_note,
        "coverage": {
            "sessions": len(sessions),
            "agents": len(summary["agents"]),
            "projects": len(summary["projects"]),
            "machines": len(summary["machines"]),
            "sessions_with_output_token_data": summary["with_output"],
            "sessions_with_peak_context_data": summary["with_context"],
            "first_seen": summary["first_seen"].isoformat() if summary["first_seen"] else None,
            "last_seen": summary["last_seen"].isoformat() if summary["last_seen"] else None,
        },
        "sessions": strip_content_fields(clean_sessions(sessions)),
        "usage_all": strip_content_fields(usage_all),
        "usage_by_agent": strip_content_fields(usage_by_agent),
        "projects": strip_content_fields(project_rows(projects if isinstance(projects, list) else [])),
        "activity": strip_content_fields(activity),
        "stats_all_time": strip_content_fields(stats),
    }
    return {
        "source": "agentsview",
        "generated_at": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat(),
        "telemetry": telemetry,
    }


def post_payload(api_url: str, payload: dict[str, Any]) -> dict[str, Any]:
    data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        api_url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            raw = response.read().decode("utf-8")
    except urllib.error.URLError as exc:
        raise FarpointError(f"failed to POST Farpoint payload to {api_url}: {exc}") from exc
    try:
        return json.loads(raw) if raw else {}
    except json.JSONDecodeError:
        return {"raw": raw}


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Use AgentsView CLI to send Farpoint telemetry to the API.")
    parser.add_argument("--api-url", default="http://localhost:3000/api/ingest", help="Farpoint API endpoint")
    parser.add_argument("--print-json", action="store_true", help="Print the payload instead of posting it")
    parser.add_argument("--json", dest="json_path", help="Optional local JSON payload path for debugging")
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
    stats = run_json(av(resolved, "stats", "--format", "json"))
    agents = sorted({str(item.get("agent") or "unknown") for item in sessions})
    usage_by_agent = {
        agent: run_json(av(resolved, "usage", "daily", "--agent", agent, "--all", "--json", "--breakdown", "--offline"))
        for agent in agents
    }
    projects = run_json(av(resolved, "projects", "--json"))
    activity, activity_note = fetch_activity(resolved, sessions)
    payload = make_payload(
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
    if args.json_path:
        json_path = Path(args.json_path)
        json_path.parent.mkdir(parents=True, exist_ok=True)
        json_path.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")
    if args.print_json:
        print(json.dumps(payload, indent=2, sort_keys=True))
        return 0
    response = post_payload(args.api_url, payload)
    print(json.dumps(response, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except FarpointError as exc:
        print(f"Farpoint error: {exc}", file=sys.stderr)
        raise SystemExit(1)
