检查 Mirax AI 项目的 cmux 工位进度，严格按 `~/.codex/skills/cmux-agent-dispatch/SKILL.md` 执行总控验收循环。

## 必读

1. 读取 `<repo>/.codex/dispatch-state.json`
2. 运行 `bash <repo>/.codex/scripts/controller-review.sh`
3. 用 dispatch-state 中的 `workspace_ref` / `worker_surface_ref` 读取工位屏幕（不要用硬编码 ID）

## 分支

| 条件 | 动作 |
|------|------|
| 工位 STATUS 为 IN_PROGRESS / UNKNOWN，或屏幕显示仍在执行 | 返回 `DONT_NOTIFY` |
| `.codex/wake/pending.json` 存在，或 STATUS 为 DONE，且 `current_task.status` 为 `worker_done` 或 `dispatched` | 进入验收 |
| 验收不通过 | 向同一 `worker_surface_ref` 发送聚焦返修 prompt；更新 state 为 `fix_requested`；返回 `DONT_NOTIFY` |
| 验收通过 | 更新 gap-list 对应行状态；`git commit`（仅任务相关文件）；可选 `git push`；清空 wake 文件；派发 queue 下一项；更新 state |
| queue 为空且 worktree 干净 | 删除 automation `mirax-dispatch`；将 `wake.mode` 设为 `idle` |

## 禁止

- 禁止总控直接修改 `apps/`、`packages/` 源码（返修 prompt 除外）
- 禁止与 skill 矛盾的 commit 规则：验收通过后由总控 commit，不是「永远不 commit」
- 禁止提交临时截图或未请求的验证产物

## 工位 prompt 模板

见 `<repo>/.codex/worker-prompt-template.md` 或 skill 内 `worker-prompt.md`。
