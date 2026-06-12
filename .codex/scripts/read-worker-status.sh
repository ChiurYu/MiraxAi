#!/usr/bin/env bash
# 从 dispatch-state 指向的工位 surface 读取屏幕，解析 STATUS 行。
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
STATE_FILE="$REPO_ROOT/.codex/dispatch-state.json"
CMUX="$("$REPO_ROOT/.codex/scripts/cmux-bin.sh")"

if [[ ! -f "$STATE_FILE" ]]; then
  echo "ERROR: missing $STATE_FILE" >&2
  exit 1
fi

WORKSPACE_REF="$(python3 -c "import json; print(json.load(open('$STATE_FILE'))['workspace_ref'])")"
SURFACE_REF="$(python3 -c "import json; print(json.load(open('$STATE_FILE'))['worker_surface_ref'])")"

SCREEN="$("$CMUX" read-screen --workspace "$WORKSPACE_REF" --surface "$SURFACE_REF" --lines 400 2>/dev/null || true)"

# 取最后一次出现的 STATUS（屏幕滚动后 DONE 可能在较上方）
STATUS="$(printf '%s\n' "$SCREEN" | grep -oE 'STATUS:[[:space:]]*[A-Z_]+' | tail -1 | sed 's/STATUS:[[:space:]]*//')"
TASK_ID="$(python3 -c "import json; print(json.load(open('$STATE_FILE')).get('current_task',{}).get('id',''))")"
TASK_STATUS="$(python3 -c "import json; print(json.load(open('$STATE_FILE')).get('current_task',{}).get('status',''))")"
WAKE_FILE="$REPO_ROOT/.codex/wake/pending.json"

if [[ -z "$STATUS" && -f "$WAKE_FILE" ]]; then
  STATUS="DONE"
elif [[ -z "$STATUS" && "$TASK_STATUS" == "worker_done" ]]; then
  STATUS="DONE"
elif [[ -z "$STATUS" ]]; then
  STATUS="UNKNOWN"
fi

printf 'task_id=%s\nstatus=%s\nworkspace=%s\nsurface=%s\n' \
  "$TASK_ID" "$STATUS" "$WORKSPACE_REF" "$SURFACE_REF"
