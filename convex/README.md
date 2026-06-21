# Atlas Convex Backend

This directory contains the v1 Atlas product backend: app data, live queries,
mutations, and HTTP ingest.

Start it with:

```bash
pnpm dev:convex
```

The `/ingest` HTTP action accepts a minimal telemetry event:

```json
{
  "source": "codex",
  "type": "agent.run.started",
  "timestamp": 1760000000000,
  "payload": {
    "task": "Fix checkout retry bug"
  }
}
```
