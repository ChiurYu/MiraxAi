# Mirax AI Codex 工作流接管设计

## 目标

卸载本机 Codex 中的 `superpowers@openai-curated` 插件，把 Mirax AI 的活动任务进度、恢复入口和总控规则迁移到 Codex 自有文档体系，同时完整保留既有 Superpowers 计划与设计作为历史证据。

本次只迁移工作流和文档入口，不改产品源码，不重写历史计划，不处理当前工作区中的其它未提交改动。

## 已确认方案

采用“保留历史档案、迁移活动入口”的方式：

- `docs/superpowers/plans/` 与 `docs/superpowers/specs/` 保留为历史档案。
- 当前项目状态迁移到 `docs/codex/PROJECT-STATE.md`，该文件成为唯一进度事实源。
- 后续新计划写入 `docs/codex/plans/`；当前尚未完成的旧计划可以继续从历史目录引用，不复制内容。
- 原 `docs/superpowers/PROJECT-STATE.md` 改为兼容提示，只指向新入口，不再维护两份状态。
- Codex 本地 Memories 仅作为辅助召回层；受 Git 管理的项目状态和计划始终优先。

## 入口与职责

### `AGENTS.md`

- 新会话恢复顺序改为：`AGENTS.md` → `CLAUDE.md` → `docs/codex/PROJECT-STATE.md` → 当前计划。
- 当前计划只从 `PROJECT-STATE.md` 读取，不再根据目录中文件名自动猜测。
- 删除对不存在的 `~/.codex/skills/cmux-agent-dispatch/SKILL.md` 和 Superpowers skills 的依赖。
- Codex 默认直接负责规划、实现、验证和进度同步；只有用户明确要求 cmux/Claude 派工时才切换为总控委派。
- 委派时使用当前可用的 `cmux` / `cmux-workspace` 能力和普通终端 Claude Code 路由，不恢复旧 agent-session 路线。

### `CLAUDE.md`

- Claude/Kimi 仍可作为显式委派的 worker，但不再拥有项目进度事实源。
- Worker 默认只汇报完成项、验证结果和阻塞；由 Codex review 后更新 `docs/codex/PROJECT-STATE.md`。
- 只有任务明确授权时，worker 才修改计划 checkbox 或项目状态。

### `docs/codex/PROJECT-STATE.md`

- 原状态内容无损迁移，保留“已完成、当前阶段、下一步、仍需规划、恢复入口”等现有结构。
- 当前产品任务仍指向真实 BYOK dogfood，不因工作流迁移改变产品优先级或完成口径。
- 新增工作流说明：历史 Superpowers 文档只读、未来计划目录、Codex Memories 的辅助地位。

### `docs/人工提示词.md` 与 `README.md`

- 所有活动恢复路径改为 `docs/codex/PROJECT-STATE.md`。
- 日常入口改为 Codex-first；Claude Code 和 cmux 提示词保留为显式委派的备用路径。
- 删除 `cmux-agent-dispatch`、`superpowers:writing-plans`、`superpowers:executing-plans` 等不可用依赖。
- 历史文档路径只在明确标注“历史档案”时保留。

## 进度与记忆数据流

1. 新任务先读取仓库指令与 `docs/codex/PROJECT-STATE.md`。
2. `PROJECT-STATE.md` 给出当前计划、当前未完成事项和下一步。
3. Codex 按需使用本地 Memories 找回旧决策，但必须用当前仓库状态验证可能过期的信息。
4. 实现或验收完成后，Codex 先更新当前计划，再同步 `PROJECT-STATE.md`。
5. 历史 `docs/superpowers/` 文档不再作为自动选择队列，只作为证据和旧任务记录。

`.codex/dispatch-state.json` 只是临时调度状态，不是记忆或项目进度源。恢复 cmux 调度时应根据当前状态文件重新生成，不能依赖其中的旧计划路径。

## 插件卸载

使用 Codex CLI 执行：

```bash
codex plugin remove superpowers@openai-curated --json
```

卸载后：

- 保留 `openai-curated` marketplace，因为 GitHub 等其它插件仍在使用。
- 检查并删除 `~/.codex/config.toml` 中遗留的 Superpowers plugin 配置。
- 如果旧的 `superpowers@claude-plugins-official` hook 信任记录仍存在，只删除该 Superpowers 记录，不触碰其它 hook。
- 不编辑 `~/.codex/memories/` 生成文件；后续记忆自然从新工作流产生。

当前任务在启动时已加载旧插件指令，因此卸载结果以 CLI/config 状态为准；新的 Codex 任务或应用重启后才验证 Superpowers 不再注入。

## 失败与回滚

- 如果 CLI 卸载失败，停止修改全局配置并保留完整错误信息，不手工删除插件缓存目录。
- 如果活动入口迁移后仍存在旧路径，修正引用，不删除历史 plans/specs。
- 如果新状态文件与迁移前内容不一致，以迁移前 `docs/superpowers/PROJECT-STATE.md` 为准恢复。
- 如需回滚插件，可重新执行 `codex plugin add superpowers@openai-curated`；项目文档迁移不依赖插件是否安装。

## 验证标准

1. `codex plugin list` 显示 Superpowers 未安装，GitHub 等其它插件状态不受影响。
2. `~/.codex/config.toml` 不再包含启用的 Superpowers plugin 或 Superpowers hook 信任记录。
3. 活动入口不再要求任何 `superpowers:*` skill 或不存在的 `cmux-agent-dispatch` skill。
4. `AGENTS.md`、`CLAUDE.md`、`README.md`、`docs/人工提示词.md` 均指向 `docs/codex/PROJECT-STATE.md`。
5. 新状态文件完整保留当前真实能力、未完成能力、安全边界和下一步，不把待 dogfood 能力误写为已验收。
6. `docs/superpowers/plans/` 与 `docs/superpowers/specs/` 内容保留，历史证据链没有丢失。
7. `git diff --check` 通过，且本次提交不包含产品源码或工作区既有无关改动。
