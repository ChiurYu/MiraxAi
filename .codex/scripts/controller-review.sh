#!/usr/bin/env bash
# 总控验收快捷命令：git 摘要 + 工位 STATUS + wake 文件。
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

echo "=== dispatch-state ==="
python3 -m json.tool .codex/dispatch-state.json 2>/dev/null | head -40

echo ""
echo "=== worker status ==="
bash .codex/scripts/read-worker-status.sh

echo ""
echo "=== wake pending ==="
if [[ -f .codex/wake/pending.json ]]; then
  cat .codex/wake/pending.json
else
  echo "(none)"
fi

echo ""
echo "=== git status ==="
git status --short

echo ""
echo "=== git diff stat ==="
git diff --stat HEAD
