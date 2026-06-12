# Mirax AI — Agent 约定

## 自动调度（Codex 总控）

在本仓库，当用户要求自动推进开发（「开始干活」「继续执行」等）时：

- **Codex** 是总控：读 `.codex/dispatch-state.json`，经 cmux 向 Claude/Kimi 工位派工，验收后 commit，自动续派下一项。
- **工位** 遵守 `CLAUDE.md`，不自行 commit/push。
- 完整流程：`~/.codex/skills/cmux-agent-dispatch/SKILL.md`

## CodeGraph

结构型代码问题优先用 CodeGraph MCP（`codegraph_*`）。详见用户级 `~/.codex/AGENTS.md` 中 CodeGraph 段。
