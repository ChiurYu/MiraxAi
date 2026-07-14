# Mirax AI — Codex 总控约定

## Codex 默认工作流

Codex 默认直接负责规划、实现、验证和进度同步。新任务按以下顺序恢复上下文：

1. `AGENTS.md`
2. `CLAUDE.md`
3. `docs/codex/PROJECT-STATE.md`
4. `PROJECT-STATE.md` 明确指向的当前计划

当前计划只从 `PROJECT-STATE.md` 读取，不按目录中的最新日期自动猜测。后续新计划写入 `docs/codex/plans/`；`docs/superpowers/` 只作为历史档案。

只有用户明确要求「用 cmux 派工」「交给 Claude Code」或「只负责下任务和验收」时，Codex 才切换为总控委派。委派使用当前可用的 `cmux` / `cmux-workspace` 能力和普通 terminal Claude Code；不得依赖额外的自动调度 skill，不得使用 `Claude Code · React` agent-session 路线。

## 进度管理

- `docs/codex/PROJECT-STATE.md` 是活动进度唯一事实源。
- 完成实现或验收后，由 Codex 更新当前计划与项目状态，明确区分「已完成」「当前阶段」「下一步」「仍需规划」。
- 已完成的能力不要继续作为下一步安排；例如 SQLite、rewrite provider selection、已验收的 mock 链路等完成后应从待办中移除或标记为已完成。
- 新发现但未实现的能力缺口，只记录为待规划/下一步候选；不要写成已完成。
- Codex Memories 只辅助召回；与仓库状态冲突时，以仓库和 `PROJECT-STATE.md` 为准。
- 只有验收证据明确时才更新 `docs/reverse-engineering/legacy-ui-gap-list.md` 状态列；不确定时保留原状态。

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
