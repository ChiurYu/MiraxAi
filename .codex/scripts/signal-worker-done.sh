#!/usr/bin/env bash
# 工位在报告 STATUS: DONE 后调用，写入 wake 文件供总控 / heartbeat 检测。
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
STATE_FILE="$REPO_ROOT/.codex/dispatch-state.json"
WAKE_DIR="$REPO_ROOT/.codex/wake"
WAKE_FILE="$WAKE_DIR/pending.json"

mkdir -p "$WAKE_DIR"

TASK_ID="$(python3 -c "import json; print(json.load(open('$STATE_FILE')).get('current_task',{}).get('id','unknown'))")"
TASK_TITLE="$(python3 -c "import json; print(json.load(open('$STATE_FILE')).get('current_task',{}).get('title',''))")"
NOW="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

python3 - <<PY
import json
from pathlib import Path

wake = {
    "version": 1,
    "signal": "worker_done",
    "task_id": "$TASK_ID",
    "task_title": "$TASK_TITLE",
    "signaled_at": "$NOW",
    "repo": "$REPO_ROOT",
}
Path("$WAKE_FILE").write_text(json.dumps(wake, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
PY

# 更新 state：工位已报告完成，等待总控验收
python3 - <<'PY'
import json
from pathlib import Path

state_path = Path("$STATE_FILE")
state = json.loads(state_path.read_text(encoding="utf-8"))
state.setdefault("current_task", {})["status"] = "worker_done"
state["current_task"]["worker_reported_at"] = "$NOW"
state_path.write_text(json.dumps(state, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
PY

echo "wake signal written: $WAKE_FILE"
