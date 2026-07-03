# Mirax AI — Codex 总控约定

本文件是 **项目专用** 配置；通用流程见 `~/.codex/skills/cmux-agent-dispatch/SKILL.md`。

## 自动调度

用户说「开始干活 / 继续执行 / 继续完成工作 / 继续验收 / 自动调度 / 用 cmux 派工 / 只负责下任务和验收」→ Codex invoke `cmux-agent-dispatch`。

| 项 | 值 |
|----|-----|
| 计划目录 | `docs/superpowers/plans/` |
| 计划选取 | 文件名 `YYYY-MM-DD-*.md` 中**日期最新**者；同日期按文件名字典序；**不用 mtime** |
| 差距参考（非执行队列） | `docs/reverse-engineering/legacy-ui-gap-list.md` |
| 工位规范 | `CLAUDE.md` |
| 运行时状态 | `.codex/dispatch-state.json`（Phase 0 生成；cmux ref 在 Phase 1.5 写入） |
| Heartbeat automation id | `mirax-dispatch` |
| 产品名（UI / 新文档） | Mirax AI |

验收通过且步骤对应 gap-list 行时，更新 `legacy-ui-gap-list.md` 的「状态」列。

## 进度管理

Codex 作为总控给出 Claude / cmux 提示词、收到 worker 完成报告或完成本地提交后，必须同步项目进度文档，避免遗忘已完成与未完成事项：

- 更新 `docs/superpowers/PROJECT-STATE.md`，明确区分「已完成」「当前阶段」「下一步」「仍需规划」。
- 已完成的能力不要继续作为下一步安排；例如 SQLite、rewrite provider selection、已验收的 mock 链路等完成后应从待办中移除或标记为已完成。
- 新发现但未实现的能力缺口，只记录为待规划/下一步候选；不要写成已完成。
- 给用户下一段提示词前，先确认提示词对应的任务是否已在 `PROJECT-STATE.md` 中有状态记录。
- 只在验收证据明确时更新 `legacy-ui-gap-list.md` 状态列；不确定时保留原状态。

## cmux Claude Code 终端路由

Mirax AI 的 cmux 工位默认使用 **普通终端里的 Claude Code**，不要使用
`--type agent-session --provider claude` 打开的 React agent-session UI。用户截图中
`Claude Code · React` 标签页就是错误路线；正确路线应显示普通终端里的
`Claude Code v...`、`kimi-for-coding` 和项目 cwd。

新窗口打开 Claude 的标准命令：

```bash
CMUX="$(command -v cmux || true)"; [ -n "$CMUX" ] || CMUX="/Applications/cmux.app/Contents/Resources/bin/cmux"
WIN="$("$CMUX" new-window | awk '/^OK / {print $2}')"
"$CMUX" new-workspace \
  --window "$WIN" \
  --name "Mirax AI Claude" \
  --cwd "/Users/yuzhenzhao/code/ai/Mirax AI" \
  --command "claude" \
  --focus true
"$CMUX" list-pane-surfaces --window "$WIN" --workspace <workspace_ref> --id-format both
"$CMUX" read-screen --window "$WIN" --workspace <workspace_ref> --surface <surface_ref> --lines 40
```

同一 workspace 内追加工位时，创建 terminal surface 后启动 Claude：

```bash
CMUX="$(command -v cmux || true)"; [ -n "$CMUX" ] || CMUX="/Applications/cmux.app/Contents/Resources/bin/cmux"
"$CMUX" new-surface --workspace <workspace_ref> --type terminal --focus false
"$CMUX" send --workspace <workspace_ref> --surface <surface_ref> 'cd "/Users/yuzhenzhao/code/ai/Mirax AI" && claude'
"$CMUX" send-key --workspace <workspace_ref> --surface <surface_ref> Enter
"$CMUX" read-screen --workspace <workspace_ref> --surface <surface_ref> --lines 40
```

状态值：

- `dispatch_route`: `terminal.claude`
- `worker_surface_ref`: 承载 Claude Code 的 terminal surface
- heartbeat 检查：使用 `cmux read-screen` 读取该 terminal surface，并结合 `git diff`
  判断 worker 是否完成；不要用 `workspace.prompt_submit` latest message 作为完成依据。

只有 `read-screen` 能看到正常 Claude Code 终端界面后，才允许标记 `dispatched`
并激活 heartbeat。工位仍需遵守：不让 worker commit/push。
