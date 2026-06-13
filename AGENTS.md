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
