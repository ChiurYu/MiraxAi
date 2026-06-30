# P1 AI Service Readiness Display Fix

## 背景

`first-real-chain-dogfood-regression-acceptance` 已通过，P0 compose 失败伪造成品问题已关闭。

仍开放 P1：AI 服务设置页的 provider 卡片在缺少凭证、模型或 baseUrl 时仍显示“已启用”，用户必须点击“测试连接”后才知道不可用。这会让正常 UI 入口看起来比实际能力更 ready。

证据：

- `/tmp/mirax-first-real-chain-dogfood-regression/report.json`
- `/tmp/mirax-first-real-chain-dogfood-regression/summary.md`
- `/tmp/mirax-first-real-chain-dogfood-regression/ai-services-enabled.png`

## 目标

- AI 服务卡片不要只凭 `enabled` 显示“已启用”。
- 卡片状态应表达当前配置是否可执行：
  - disabled：显示已停用。
  - enabled 且缺必要配置：显示需要配置 / not-ready。
  - enabled 且具备必要配置：才显示已就绪或等价明确 ready 文案。
- 过滤器中的“需要配置”应能筛出 enabled 但缺必要配置的 provider。
- 测试连接仍保留现有行为：custom provider 缺 baseUrl 时直接失败，不 fallback 到默认 OpenAI URL。

## 非目标

- 不修 P2：`VideoCompositionStage` 的 `convertFileSrc` web dev 降级。
- 不接入真实 provider 网络测试。
- 不实现 keychain / OS 安全存储。
- 不改变 provider 持久化策略；apiKey 仍不进入 snapshot。
- 不修改 Workbench stage mode 逻辑，除非测试证明设置页状态必须复用现有 helper。
- 不 commit / push。

## 允许修改

尽量只改：

- `apps/desktop/src/components/settings/AiServicesSettings.vue`
- `apps/desktop/src/components/settings/AiServicesSettings.test.ts`

如确有必要复用既有 helper，可最小触及：

- `apps/desktop/src/composables/useAppSettings.ts`
- `apps/desktop/src/composables/useAppSettings.test.ts`

浏览器验收产物只能写入：

- `/tmp/mirax-p1-ai-service-readiness-display-fix/`

## 禁止修改

- `docs/reverse-engineering/legacy-ui-gap-list.md`
- `.codex/dispatch-state.json`
- `docs/人工提示词.md`
- `docs/superpowers/PROJECT-STATE.md`
- P2 相关源码

## 实现要求

1. 先补失败测试，再实现。
2. 不引入新依赖。
3. 不联网测试真实 provider；测试使用静态/假数据或 fake browser state。
4. readiness 规则与当前 Workbench real 路由保持一致：
   - `openai` / `custom` rewrite：需要 enabled、非空 `apiKey`、非空 `model`；`custom` 还需要非空 `baseUrl`。
   - `whisper`：需要 enabled、非空 `baseUrl`、非空 `model`。
   - `cosyvoice` / `heygem`：需要 enabled、非空 `baseUrl`；apiKey 可选。
5. provider 类型和名称显示不要回退为 `openai` / `未命名配置`，除非真实数据本身如此。
6. 不把“测试连接成功”作为唯一 ready 来源；ready 应来自配置完整性。

## 验证命令

必须运行：

```bash
./node_modules/.bin/vitest run apps/desktop/src/components/settings/AiServicesSettings.test.ts apps/desktop/src/App.provider-runtime.test.ts apps/desktop/src/composables/useAppSettings.test.ts
./apps/desktop/node_modules/.bin/vue-tsc --noEmit -p apps/desktop/tsconfig.json
git diff --check
git diff -- docs/reverse-engineering/legacy-ui-gap-list.md docs/人工提示词.md docs/superpowers/PROJECT-STATE.md .codex/dispatch-state.json
```

并做 Playwright/browser 验收：

- 使用 `/tmp/mirax-p1-ai-service-readiness-display-fix/` 保存 report 和截图。
- 注入缺 `apiKey` / `model` / `baseUrl` 的 enabled provider。
- 验证卡片不显示“已启用”作为最终状态，而是显示需要配置 / not-ready。
- 注入配置完整的 provider，验证卡片显示已就绪或等价 ready 文案。
- 验证 custom 缺 baseUrl 时测试连接仍诚实失败。

## 完成报告格式

```text
STATUS: DONE | BLOCKED
CHANGED FILES:
SUMMARY:
BROWSER VERIFICATION:
VERIFICATION:
NOTES:
- 未 commit / push
```
