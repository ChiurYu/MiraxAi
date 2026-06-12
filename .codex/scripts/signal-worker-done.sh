#!/usr/bin/env bash
# 工位在报告 STATUS: DONE 后调用，写入 wake 文件供总控 / heartbeat 检测。
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
STATE_FILE="$REPO_ROOT/.codex/dispatch-state.json"
WAKE_DIR="$REPO_ROOT/.codex/wake"
WAKE_FILE="$WAKE_DIR/pending.json"

mkdir -p "$WAKE_DIR"

NOW="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

python3 - "$STATE_FILE" "$WAKE_FILE" "$REPO_ROOT" "$NOW" <<'PY'
import json
import sys
from pathlib import Path

state_file, wake_file, repo_root, now = sys.argv[1:5]
state = json.loads(Path(state_file).read_text(encoding="utf-8"))
task = state.get("current_task", {})

wake = {
    "version": 1,
    "signal": "worker_done",
    "task_id": task.get("id", "unknown"),
    "task_title": task.get("title", ""),
    "signaled_at": now,
    "repo": repo_root,
}
Path(wake_file).write_text(json.dumps(wake, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

state.setdefault("current_task", {})["status"] = "worker_done"
state["current_task"]["worker_reported_at"] = now
Path(state_file).write_text(json.dumps(state, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
PY

echo "wake signal written: $WAKE_FILE"
