# 演示视频覆盖矩阵

本文把 `docs/reverse-engineering/demo-video-timeline.md` 中的可见功能点映射到当前桌面端第一版实现。当前版本使用 mock provider 打通完整流程，真实 Whisper、CosyVoice、HeyGem、FFmpeg 渲染和平台自动发布会在后续分支替换。

| 演示功能 | 当前实现 | 代码位置 | 覆盖状态 |
| --- | --- | --- | --- |
| 对标视频导入 / 输入 | 左侧「项目素材」支持项目名、对标视频路径、声音样本路径输入，选择按钮可填入路径 | `apps/desktop/src/App.vue` | 已覆盖，mock 输入 |
| 对标文案提取 | 「对标视频文案提取」步骤调用 mock AI transcribe，写入执行记录 | `packages/provider-ai/src/mock.ts` | 已覆盖，mock 文案 |
| AI 文案仿写 | 「爆款文案仿写」步骤调用 mock rewriteScript，生成标题方向 | `packages/provider-ai/src/mock.ts` | 已覆盖，mock 文案 |
| 用户配置密钥 | 右侧「密钥配置」支持 label、Base URL、API Key、model，并有中文校验 | `packages/core/src/validation.ts` | 已覆盖，未持久化密钥 |
| 声音克隆 | 「声音克隆」步骤生成稳定 voiceId | `packages/provider-ai/src/mock.ts` | 已覆盖，mock 音色 |
| 语音合成 | 「语音合成」步骤生成音频路径并展示到「生成产物」 | `packages/provider-ai/src/mock.ts` | 已覆盖，mock 音频 |
| 数字人口播 | 「数字人口播」步骤生成数字人视频路径 | `packages/provider-ai/src/mock.ts` | 已覆盖，mock 视频 |
| 字幕 / 竖屏视频合成 | `@mirax/media-pipeline` 提供 FFmpeg 命令 builder 和 mock renderer，桌面端生成成片、封面、字幕路径 | `packages/media-pipeline/src/*` | 已覆盖，mock 渲染 |
| 标题、封面、描述、话题 | 当前项目名和卖点备注作为发布元信息；封面路径由 mock renderer 生成 | `apps/desktop/src/App.vue` | 已覆盖第一版输入 |
| 发布平台选择 | 左侧平台复选框支持抖音、小红书、快手、视频号 | `apps/desktop/src/App.vue` | 已覆盖 |
| 发布账号状态 | 右侧「发布账号」展示 mock 账号，并随发布平台选择变化 | `packages/provider-publish/src/mockPublisher.ts` | 已覆盖，mock 账号 |
| 自动发布 / 草稿交接 | 「多平台发布」步骤创建 mock 草稿任务，执行记录显示任务 id | `packages/provider-publish/src/mockPublisher.ts` | 已覆盖，mock 交接 |
| 一键跑完整流程 | 顶部「运行全部」可从当前步骤跑到发布交接完成 | `apps/desktop/src/App.vue` | 已覆盖 |
| 本地草稿恢复 | 项目、素材路径、卖点备注、平台和非敏感 provider 配置保存到 localStorage | `apps/desktop/src/App.vue` | 已覆盖 |
| 本地数据设计 | `@mirax/local-store` 定义 SQLite schema 和仓储接口 | `packages/local-store/src/*` | 已覆盖设计 stub |
| 本地服务依赖检查 | `@mirax/sidecar-manager` 定义 FFmpeg、Playwright、Python、HeyGem、CosyVoice 检查 | `packages/sidecar-manager/src/*` | 已覆盖设计 stub |

## 第一版验收命令

```bash
pnpm lint
pnpm test
pnpm typecheck
pnpm build
pnpm --filter @mirax/desktop build
```

## 第一版运行验证

在 `http://127.0.0.1:1420/` 中点击「运行全部」，预期结果：

- 进度显示 `100%`，`8/8 已完成`。
- 「生成产物」显示音频、数字人视频、成片和封面路径。
- 「执行记录」出现 mock 发布任务，例如 `mock-publish-demo-project-douyin`。
- 「发布账号」显示已选平台对应的 mock 账号。
- 修改项目名称、对标视频路径和卖点备注后刷新页面，草稿会自动恢复。
