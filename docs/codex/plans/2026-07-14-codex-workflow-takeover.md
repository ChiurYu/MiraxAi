# Mirax AI Codex 工作流接管实施计划

> **执行方式：** 按 Task 顺序在当前 Codex 会话内逐项执行和验证。不得使用子代理，不得修改产品源码，不得提交或推送工作区既有无关改动。步骤使用 checkbox（`- [ ]`）跟踪。

**Goal:** 卸载 Superpowers 插件，并把 Mirax AI 的活动恢复入口、项目进度和总控规则迁移到 Codex 自有文档体系。

**Architecture:** 保留 `docs/superpowers/plans/` 与 `docs/superpowers/specs/` 作为历史证据；把唯一活动状态源迁移到 `docs/codex/PROJECT-STATE.md`，未来计划写入 `docs/codex/plans/`。Codex 本地 Memories 只辅助召回，仓库状态文件始终优先。

**Tech Stack:** Markdown、Codex CLI、TOML、Git、`rg`、`git diff --check`。

## Global Constraints

- 不修改 `apps/`、`packages/` 或其它产品源码。
- 不覆盖、回滚、暂存或提交工作区既有无关改动。
- 不删除或批量改写 `docs/superpowers/plans/`、`docs/superpowers/specs/`。
- 不编辑 `~/.codex/memories/` 生成文件。
- 不删除 `openai-curated` marketplace；GitHub 插件仍依赖它。
- 不手工删除插件缓存目录；插件卸载必须使用 Codex CLI。
- 当前产品进度仍是声音克隆真实 BYOK dogfood，不得改写为已验收。
- 每次提交前必须用 `git diff --cached --name-only` 确认只包含本 Task 的文件。

---

### Task 1: 迁移唯一项目状态源

**Files:**

- Create: `docs/codex/PROJECT-STATE.md`
- Modify: `docs/superpowers/PROJECT-STATE.md`

**Interfaces:**

- Consumes: 当前 `docs/superpowers/PROJECT-STATE.md` 的完整未提交内容。
- Produces: `docs/codex/PROJECT-STATE.md` 作为唯一活动状态源；旧路径只提供兼容跳转。

- [x] **Step 1: 记录迁移前状态结构**

Run:

```bash
rg -n '^## (当前口径|已完成|当前仍是 mock / 未完整真实接入|下一步|后续路线|恢复入口|工作区注意事项)$' docs/superpowers/PROJECT-STATE.md
```

Expected: 七个现有一级状态区段都能找到；如果缺失，停止迁移并先汇报冲突。

- [x] **Step 2: 无损移动状态文件并创建兼容入口**

Use `apply_patch` with a file move so the current dirty working-tree content is preserved:

```diff
*** Begin Patch
*** Update File: docs/superpowers/PROJECT-STATE.md
*** Move to: docs/codex/PROJECT-STATE.md
@@
 # Mirax AI 项目状态
+
+> **活动进度唯一入口：** 本文件由 Codex 维护。`docs/superpowers/` 仅保留历史计划与设计；Codex Memories 只用于辅助召回，冲突时以本文件和当前仓库状态为准。
*** End Patch
```

Then use a second `apply_patch` call to create the compatibility file at the old path:

```diff
*** Begin Patch
*** Add File: docs/superpowers/PROJECT-STATE.md
+# 历史兼容入口
+
+Mirax AI 的活动项目状态已经迁移到 `docs/codex/PROJECT-STATE.md`。
+
+本目录中的 `plans/` 与 `specs/` 作为历史证据保留；不要在本文件继续记录进度。
*** End Patch
```

- [x] **Step 3: 更新新状态文件的恢复入口**

Replace the recovery section with:

```markdown
## 恢复入口

新任务先读：

1. `AGENTS.md`
2. `CLAUDE.md`
3. `docs/codex/PROJECT-STATE.md`
4. 本文件「当前进行中」或「下一步」明确指向的计划

补充规则：

- 后续新计划写入 `docs/codex/plans/`。
- `docs/superpowers/plans/` 与 `docs/superpowers/specs/` 只作为历史证据和仍在收尾的旧计划引用。
- Codex 可按需使用本地 Memories 恢复旧决策，但必须用当前仓库和本文件验证可能过期的信息。
```

- [x] **Step 4: 验证进度内容没有丢失或抬高完成口径**

Run:

```bash
rg -n '^## (当前口径|已完成|当前仍是 mock / 未完整真实接入|下一步|后续路线|恢复入口|工作区注意事项)$' docs/codex/PROJECT-STATE.md
rg -n '声音克隆真实 BYOK dogfood|尚未使用用户的真实百炼 Key|不能宣称远端调用已验收' docs/codex/PROJECT-STATE.md
git diff --check -- docs/codex/PROJECT-STATE.md docs/superpowers/PROJECT-STATE.md
```

Expected: 原状态区段全部存在；BYOK 仍明确为待验收；空白检查无输出。

- [x] **Step 5: 提交状态源迁移**

Run:

```bash
git add -- docs/codex/PROJECT-STATE.md docs/superpowers/PROJECT-STATE.md
git diff --cached --name-only
git commit -m 'docs(进度): 迁移项目状态到 Codex'
```

Expected: 暂存清单只有上述两个文件；提交成功，不包含产品源码或历史 plans/specs。

---

### Task 2: 更新活动说明与恢复路径

**Files:**

- Modify: `AGENTS.md`
- Modify: `CLAUDE.md`
- Modify: `README.md`
- Modify: `docs/人工提示词.md`
- Modify: `docs/product-architecture/stage-3-source-inventory.md`

**Interfaces:**

- Consumes: Task 1 产生的 `docs/codex/PROJECT-STATE.md`。
- Produces: Codex-first 的活动规则；Claude/cmux 仅作为用户明确要求时的委派路径。

- [x] **Step 1: 重写 `AGENTS.md` 的总控与进度规则**

The active rules must state exactly:

```markdown
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
- Codex Memories 只辅助召回；与仓库状态冲突时，以仓库和 `PROJECT-STATE.md` 为准。
- 只有验收证据明确时才更新 `docs/reverse-engineering/legacy-ui-gap-list.md` 状态列。
```

Keep the existing CodeGraph rules and verified terminal Claude Code routing contract unchanged.

- [x] **Step 2: 收紧 `CLAUDE.md` 的 worker 权限**

Replace the obsolete first-release progress line with:

```markdown
- Claude/Kimi 默认只汇报完成项、验证结果、修改文件和阻塞；由 Codex review 后同步 `docs/codex/PROJECT-STATE.md`。
- 只有任务明确授权时，worker 才修改计划 checkbox 或项目状态文件。
```

- [x] **Step 3: 更新 `README.md` 的文档树和恢复链接**

The documentation tree must distinguish active and historical records:

```text
codex/            Codex 活动项目状态、后续计划与迁移设计
superpowers/      历史计划与设计档案
```

Replace the active state link with `docs/codex/PROJECT-STATE.md`. Do not rewrite links that intentionally point to a historical plan or spec.

- [x] **Step 4: 把 `docs/人工提示词.md` 改为 Codex-first**

Apply these exact behavior changes:

```markdown
- 日常推荐入口改为「让 Codex 读取 `docs/codex/PROJECT-STATE.md`，直接完成下一项并验证」。
- Claude Code 继续实现提示词标记为「显式委派备用」。
- 所有活动状态路径改为 `docs/codex/PROJECT-STATE.md`。
- 当前计划从状态文件读取，不扫描目录选择最新文件。
- 所有 `cmux-agent-dispatch` 表述改为使用 `cmux` / `cmux-workspace` 按当前能力重新建立普通 terminal Claude Code 路由。
- 不新增任何 `superpowers:*` skill 要求。
```

Update the terminal progress command to:

```bash
sed -n '1,240p' docs/codex/PROJECT-STATE.md
PLAN="$(rg -o 'docs/(codex|superpowers)/plans/[0-9]{4}-[0-9]{2}-[0-9]{2}-[^` ]+\.md' docs/codex/PROJECT-STATE.md | tail -1)"
[ -n "$PLAN" ] && rg -n "^- \[ \]|^- \[x\]" "$PLAN"
```

- [x] **Step 5: 更新架构清单中的活动状态链接**

In `docs/product-architecture/stage-3-source-inventory.md`, change only the project-state row:

```markdown
| 项目状态 | `docs/codex/PROJECT-STATE.md` | 当前阶段、已完成阶段和下一步。 |
```

Keep the roadmap spec row pointing to its historical `docs/superpowers/specs/...` evidence.

- [x] **Step 6: 验证活动文件不再依赖 Superpowers**

Run:

```bash
rg -n 'docs/superpowers/PROJECT-STATE|cmux-agent-dispatch|superpowers:(writing-plans|executing-plans|subagent-driven-development)' AGENTS.md CLAUDE.md README.md docs/人工提示词.md docs/product-architecture/stage-3-source-inventory.md
rg -n 'docs/codex/PROJECT-STATE.md' AGENTS.md CLAUDE.md README.md docs/人工提示词.md docs/product-architecture/stage-3-source-inventory.md
git diff --check -- AGENTS.md CLAUDE.md README.md docs/人工提示词.md docs/product-architecture/stage-3-source-inventory.md
```

Expected: first command has no output; second command finds all five activity files; whitespace check has no output.

- [x] **Step 7: 提交活动入口迁移**

Run:

```bash
git add -- AGENTS.md CLAUDE.md README.md docs/人工提示词.md docs/product-architecture/stage-3-source-inventory.md
git diff --cached --name-only
git commit -m 'docs(工作流): 切换到 Codex 活动入口'
```

Expected: 暂存清单只有上述五个文件。

---

### Task 3: 卸载 Superpowers 并清理全局残留

**Files:**

- Modify through CLI: `~/.codex/config.toml`

**Interfaces:**

- Consumes: 已安装的 `superpowers@openai-curated` plugin 配置。
- Produces: Superpowers 未安装；其它 marketplace、plugin 和 hook 状态保持不变。

- [x] **Step 1: 记录目标 plugin 与关联 plugin 当前状态**

Run:

```bash
codex plugin list | rg 'superpowers@openai-curated|github@openai-curated'
rg -n 'superpowers' ~/.codex/config.toml
```

Expected: Superpowers 与 GitHub 均显示 installed/enabled；配置只输出 Superpowers plugin/hook 相关行，不输出其它配置内容。

- [x] **Step 2: 使用 Codex CLI 卸载插件**

Run:

```bash
codex plugin remove superpowers@openai-curated --json
```

Expected: JSON 返回成功删除 `superpowers@openai-curated`。如果失败，停止，不手工删除缓存。

- [x] **Step 3: 只在仍存在时删除旧 Superpowers hook 信任块**

First run:

```bash
rg -n -C 2 'superpowers' ~/.codex/config.toml
```

If this exact stale block remains, remove it with `apply_patch`:

```toml
[hooks.state."superpowers@claude-plugins-official:hooks/hooks.json:session_start:0:0"]
trusted_hash = "sha256:62acbaff2b2f55f41971e21a164990aaa53c96919baa0a5eae2eb5db73b9e6e6"
```

Do not alter `[hooks.state]`, Ponytail hook records, marketplaces, projects, providers, or secrets.

- [x] **Step 4: 验证卸载没有影响其它插件**

Run:

```bash
codex plugin list | rg 'superpowers@openai-curated|github@openai-curated'
if rg -n 'superpowers' ~/.codex/config.toml; then exit 1; fi
```

Expected: Superpowers shows `not installed` or is absent; GitHub remains `installed, enabled`; config search has no output.

---

### Task 4: 同步接管完成状态并做全量验收

**Files:**

- Modify: `docs/codex/PROJECT-STATE.md`
- Modify: `docs/codex/plans/2026-07-14-codex-workflow-takeover.md`

**Interfaces:**

- Consumes: Tasks 1–3 的仓库和全局配置结果。
- Produces: 可从新任务恢复的已完成记录；产品当前优先级保持不变。

- [x] **Step 1: 在项目状态中记录工作流接管完成**

Add this checked item under the completed section:

```markdown
- [x] **Codex 工作流接管**
  - 活动状态源已迁移到 `docs/codex/PROJECT-STATE.md`，未来计划写入 `docs/codex/plans/`。
  - `docs/superpowers/plans/` 与 `docs/superpowers/specs/` 作为历史证据保留。
  - Superpowers plugin 已卸载，活动入口不再依赖 Superpowers skills 或已缺失的 `cmux-agent-dispatch` skill。
  - Codex Memories 只作为辅助召回；项目状态与当前仓库事实优先。
```

Do not change the existing BYOK dogfood current task or product roadmap order.

- [x] **Step 2: 勾选本计划已完成步骤**

Change every completed checkbox in this plan from `- [ ]` to `- [x]` only after its command has succeeded. Leave no checkbox checked on partial or failed work.

- [x] **Step 3: 验证历史档案仍完整存在**

Run:

```bash
test -d docs/superpowers/plans
test -d docs/superpowers/specs
test -f docs/superpowers/specs/2026-06-13-mirax-evidence-driven-roadmap-design.md
test -f docs/superpowers/plans/2026-07-13-bailian-qwen-cosyvoice.md
```

Expected: all commands exit 0.

- [x] **Step 4: 验证活动入口、产品口径和插件状态**

Run:

```bash
rg -n 'docs/superpowers/PROJECT-STATE|cmux-agent-dispatch|superpowers:(writing-plans|executing-plans|subagent-driven-development)' AGENTS.md CLAUDE.md README.md docs/人工提示词.md docs/product-architecture/stage-3-source-inventory.md
rg -n '声音克隆真实 BYOK dogfood|不能宣称远端调用已验收' docs/codex/PROJECT-STATE.md
codex plugin list | rg 'superpowers@openai-curated|github@openai-curated'
git diff --check
```

Expected: obsolete activity-reference search has no output; BYOK safeguards remain; Superpowers is not installed; GitHub remains enabled; whitespace check has no output.

- [x] **Step 5: 审核本任务改动范围**

Run:

```bash
git status --short
git diff --name-only HEAD~2..HEAD
git diff -- docs/codex/PROJECT-STATE.md docs/codex/plans/2026-07-14-codex-workflow-takeover.md
```

Expected: existing product-source changes remain untouched; committed migration files only come from Tasks 1–2; final diff only contains completion status and plan checkboxes.

- [x] **Step 6: 提交最终状态同步**

Run:

```bash
git add -- docs/codex/PROJECT-STATE.md docs/codex/plans/2026-07-14-codex-workflow-takeover.md
git diff --cached --name-only
git commit -m 'docs(工作流): 完成 Codex 接管验收'
```

Expected: 暂存清单只有新项目状态和本实施计划；提交成功。

## 完成定义

- Superpowers plugin 已通过 CLI 卸载，全局配置无 Superpowers plugin/hook 残留。
- `docs/codex/PROJECT-STATE.md` 是唯一活动状态源，当前 BYOK dogfood 口径完整保留。
- 活动说明不再依赖 Superpowers skills 或不存在的 `cmux-agent-dispatch` skill。
- 历史 `docs/superpowers/plans/` 与 `docs/superpowers/specs/` 完整保留。
- Codex Memories 保持生成态，不进行人工写入。
- 现有产品源码和无关工作区改动未被覆盖、暂存或提交。
