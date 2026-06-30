# Avatar 阶段接入 HeyGem Provider 实施规划

## 范围

本计划只处理 Workbench `avatar` 阶段：真实输入 `audioPath + avatarId`，真实输出 `avatarVideoPath` 与可信 `durationSeconds`。不处理 `voice-clone / speech / transcribe / compose / publish`，不接入形象训练、素材上传、FFmpeg、本地 HeyGem 安装或 keychain / OS 安全存储。

默认仍使用 mock；只有用户配置并启用 HeyGem provider，且阶段运行模式为 real 时才走真实调用。真实失败必须诚实失败，不 fallback 到 mock；不得伪造视频路径、时长、文件大小、缩略图或波形。`apiKey` / token / `baseUrl` 不进入日志、snapshot 或任务 payload。测试全部使用 fake transport / fake service，不联网、不依赖真实 HeyGem。

## Task 1：确认 HeyGem provider 调用契约与结构化错误

状态：已完成。

- 在 `@mirax/provider-ai` 增加 `HeyGemProvider` / `createHeyGemProvider`。
- `generateAvatarVideo` 请求体仅包含业务输入：`audioPath`、`avatarId`、`projectId`、可选 `outputPath`、可选 `model`。
- 响应必须包含非空 `videoPath` 与大于 0 的 `durationSeconds`；缺失则抛出 `avatar-failed`。
- `audioPath` / `avatarId` 缺失时在本地抛出 `not-configured`，不得触发 transport。
- 401 / 403 映射为 `unauthorized`，非 2xx 映射为 `avatar-failed`，解析失败映射为 `bad-response`，网络失败映射为 `network`。
- `testAiProviderConnection({ mode: "heygem" })` 只打 `/health`，使用 fake transport 测试。

完成摘要：已实现 `HeyGemProvider` / `createHeyGemProvider`、`avatar-failed` 错误码与 HeyGem 连接测试分支；fake transport 覆盖成功、缺输入、401、缺 `videoPath`、缺可信时长和凭证泄露边界。

## Task 2：设计 avatar executor 从 mock 切到 real 的路由

状态：已完成。

- 在 desktop 设置选择边界增加 `findEnabledAvatarProviderConfig`，只接受启用的 `provider === "heygem"`。
- 增加 `selectAvatarProvider`：mock 模式返回 mock provider；not-connected 诚实失败；real 模式只构造 HeyGem provider，不 fallback。
- 构造真实 provider 前清洗 `baseUrl`，`apiKey` 只作为内存参数传入。
- 增加 `buildAvatarOutputPath(videoOutputRoot, projectId)`，用于生成建议输出路径，不作为成功证明。
- App avatar 分支在 real 模式开始前清空旧 `generatedAvatarPath` / `generatedAvatarDuration`，成功后才写入新结果。

完成摘要：已实现 `findEnabledAvatarProviderConfig`、`selectAvatarProvider` 与 `buildAvatarOutputPath`；real 模式只接受启用的 HeyGem provider，未配置或 not-connected 均诚实失败。

## Task 3：设计 `audioPath` 产物路径、安全边界与失败状态

状态：已完成。

- avatar 阶段必须依赖 speech 阶段产出的非空 `audioPath`，没有音频时抛出 `not-configured`。
- provider 返回的 `videoPath` 是唯一可信产物路径；不得根据建议路径自行伪造成功。
- `durationSeconds` 必须来自 provider 响应且大于 0；不得从 UI 或本地估算。
- 错误信息不得包含 `apiKey`、token 或带凭证的 `baseUrl`。

完成摘要：App avatar 分支依赖非空 `generatedAudioPath`，真实模式开始前清理旧 avatar 结果；provider 返回的 `videoPath` / `durationSeconds` 是唯一成功写入来源。

## Task 4：设计 `AvatarGenerationStage` 的 mock / real / not-configured / failed / success UI 状态

状态：已完成。

- mock 模式明确显示“Mock 数字人”。
- real 模式显示真实 provider 提示：将使用设置中启用的 provider 生成 `avatarVideoPath`。
- not-connected 模式显示“真实数字人未连接”，提示配置并启用 HeyGem provider，并禁用生成按钮。
- failed 状态显示错误横幅，只显示安全错误信息。
- success 状态只展示真实 provider 或 mock provider 返回的 `avatarPath` 与可信时长。

完成摘要：`AvatarGenerationStage` 已接入 `mode` / `errorMessage` props，显示 Mock 数字人、真实数字人提示、未连接提示、失败横幅与成功结果；not-connected 禁用生成按钮。

## Task 5：整体验收与测试计划

状态：已完成。

- `packages/provider-ai/tests/heygem-provider.test.ts`
- `packages/provider-ai/tests/connection-test.test.ts`
- `apps/desktop/src/composables/useAppSettings.test.ts`
- `apps/desktop/src/composables/useAvatarProvider.test.ts`
- `apps/desktop/src/components/workbench/stages/AvatarGenerationStage.test.ts`
- 全仓 `vitest`、provider-ai `tsc`、desktop `vue-tsc`、desktop Vite build。
- `git diff --check`。
- 受保护文件 diff 检查：`docs/reverse-engineering/legacy-ui-gap-list.md`、`.codex/dispatch-state.json`、`docs/人工提示词.md` 必须为空。

完成摘要：目标 provider / desktop / UI 测试通过，相关测试集合 22 files / 219 tests 通过；全仓 36 files / 301 tests 通过；provider-ai `tsc`、desktop `vue-tsc` 与 desktop Vite build 均通过。未联网、未依赖真实 HeyGem、未实现形象训练/上传/FFmpeg/keychain，未 commit / push。
