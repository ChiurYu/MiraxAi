#!/usr/bin/env bash
# 返回 cmux 可执行文件路径；优先 PATH，其次 macOS 默认安装位置。
set -euo pipefail

if command -v cmux >/dev/null 2>&1; then
  command -v cmux
  exit 0
fi

DEFAULT="/Applications/cmux.app/Contents/Resources/bin/cmux"
if [[ -x "$DEFAULT" ]]; then
  echo "$DEFAULT"
  exit 0
fi

echo "cmux binary not found" >&2
exit 1
