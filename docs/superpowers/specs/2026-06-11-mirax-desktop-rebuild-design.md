# Mirax 桌面端重建方案设计

## 目标

将已经丢失源码的「轻语IP智能体」重建为一个新的桌面优先产品，并把核心能力设计成可复用模块，为后续 Web 端做准备。

第一版目标是复刻 `/Users/yuzhenzhao/code/ai/功能演示视频.mp4` 中所有用户可见的流程。旧 DMG 包只作为产品行为、资源、模块名和架构线索的参考，不直接复用混淆后的生产代码。

## 范围

第一版包含演示视频中可见的桌面端工作流。

旧包分析用于指导架构和资源整理，但新项目会重新实现为干净、可维护的源码，而不是尝试直接恢复或套用旧版混淆代码。

第一版不包含：

- 演示视频以外的隐藏功能全量复刻。
- 原激活、会员、支付后端的完整重建。
- 默认把所有 AI 模型打进安装包。
- Web 端交付，除共享核心结构预留外。

## 旧包分析结论

旧 macOS 包是一个 Electron 应用，应用名为 `轻语IP智能体`，版本 `5.0.0`，Bundle ID 为 `com.aigc.human`。

已观察到的架构：

- 桌面壳使用 Electron。
- 前端是 Vue 构建产物。
- 主进程被 bytenode 编译为 `electron/main/main.jsc`。
- `preload.js` 暴露了结构化 API，覆盖数据库、LLM、Python 模块、视频、音频、账号管理、发布、任务、云服务、OSS、用户激活等能力。
- 本地内置 `ffmpeg/bin/ffmpeg`，用于视频和音频处理。
- 本地内置 `chromadb/chroma-macos-arm64`，用于向量检索。
- 内置 Playwright Chromium，用于浏览器自动化和平台发布。
- 使用 `better-sqlite3` 做本地数据库。
- 使用 `openai` SDK 做 LLM 调用。
- 云端线索包括 QingYu API 域名、腾讯 COS 静态资源、火山方舟兼容模型接口。
- Python/FastAPI sidecar 架构线索包括 `python-modules`、`api.py`、端口 `8521` 和 `8527`，以及 `asrModule`、`voiceCloneModule`、`voiceV2Module`、`humanModule`、`hdModule` 等模块名。

技术栈对应关系：

- 语音识别：本地 Python `asrModule.speechRecognition`，同时有云端 `cloud:asr`。
- 语音合成 / 声音克隆：本地 Python `voiceCloneModule` 和 `voiceV2Module`，同时有云端 voice clone API。
- 数字人：本地 Python `humanModule` 和 `hdModule`，同时有云端 digital human API。
- 视频处理：本地 FFmpeg。
- 自动发布：通过 Playwright 自动化抖音、快手、小红书、视频号等平台。

## 旧废弃仓库补充结论

旧仓库 `fa1314/KrLongAI` 的 README 与入口代码对本次重建有直接参考价值。它更像是旧产品的 Python/Gradio 原型或早期工程形态，明确说明了产品定位、核心链路和模块拆分。

旧 README 中的产品定位：

- 商业级 AI 数字人口播视频自动化生成工具。
- 本地运行、模块化、可扩展。
- 重点是工程整合和流程自动化，而不是单一模型能力。

旧 README 中的核心链路：

1. 自动提取对标文案。
2. 自动进行文案仿写。
3. 自动根据文案声音克隆。
4. 自动生成数字人口播。
5. 自动添加字幕。
6. 自动添加背景音乐。
7. 自动添加视频标题。
8. 自动生成视频封面。
9. 自动发布到抖音、视频号、快手、小红书等平台。

旧代码入口 `app.py` 显示该版本使用 Gradio + FastAPI，并集成了以下模块：

- `utils.video_processor.download_and_extract_text`：对标视频文案提取。
- `ai_processing.text_rewriter`：文案仿写与优化。
- `utils.voice_processor`：声音克隆、音频生成、BGM、字幕相关能力。
- `video_tools.generate_video`：数字人视频生成。
- `video_tools.subtitle_utils`：字幕样式和字幕合成。
- `video_tools.publisher`：抖音、小红书、视频号等发布自动化。
- `utils.service_launcher`：启动数字人和 CosyVoice 服务。

旧启动器 `combined_launcher.py` 还体现了 Windows 版本的运行方式：

- 检测并启动 Chrome 调试端口。
- 使用 Playwright 连接本机 Chrome。
- 访问本地客户端地址。
- 通过配置文件管理 Chrome 路径和用户数据目录。

这些信息说明：新版不应只复刻 DMG 里的 Electron 形态，还应保留旧 Python 原型中已经验证过的本地模块边界。新版桌面端可以把这些能力拆成独立 Provider 和 sidecar 服务，而不是把所有逻辑塞进 UI 层。

## 产品形态

新版产品定位为桌面端内容生产工作流工具。

核心链路：

1. 提取或输入内容。
2. 使用用户配置的 AI Provider 改写或生成脚本。
3. 生成语音或克隆声音。
4. 生成数字人口播视频。
5. 生成标题、封面、字幕、BGM 和音效。
6. 编辑或合成最终竖屏视频。
7. 发布到已配置的社交平台账号。

## 技术栈

第一版推荐技术栈：

- 桌面壳：Tauri 2。
- 前端：Vue 3 + TypeScript。
- UI：Ant Design Vue，或根据复刻速度选择轻量本地组件系统。
- 包管理：pnpm workspace。
- 本地数据库：SQLite。
- 本地视频和音频处理：FFmpeg sidecar。
- 浏览器自动化：Playwright sidecar 或独立服务包。
- Python AI 服务：可选的托管 sidecar，由用户安装或配置。
- 共享核心：TypeScript 包，负责领域模型、Provider 接口、工作流编排和校验。

旧包使用 Electron + Vue。新版保留 Vue，以降低交互复刻成本；桌面壳从 Electron 换为 Tauri，以减少安装包体积并改善桌面端体验。

## 仓库结构

计划采用 monorepo：

```text
apps/
  desktop/              Tauri 桌面应用和 Vue 渲染层
  web/                  未来 Web 端占位，第一版不实现
packages/
  core/                 领域模型、工作流编排、Provider 接口
  ui/                   可复用 Vue 组件和设计变量
  local-store/          SQLite 仓储、本地加密配置
  media-pipeline/       FFmpeg 命令构建和媒体元信息工具
  provider-ai/          LLM Provider 适配器
  provider-speech/      ASR 和 TTS 适配器
  provider-avatar/      数字人适配器
  provider-publish/     社交平台账号和发布适配器
  sidecar-manager/      FFmpeg、Playwright、Python 服务生命周期管理
resources/
  legacy-reference/     经过确认可使用的旧版资源和模板
docs/
  reverse-engineering/  旧包分析和视频时间轴
```

## Provider 设计

所有外部能力和重型能力都通过 Provider 接口暴露。

AI Provider：

- OpenAI
- DeepSeek
- Anthropic
- Gemini
- 通义千问 / 阿里云百炼
- 硅基流动
- 自定义 OpenAI 兼容接口

语音 Provider：

- 本地 Whisper 兼容 Provider。
- 云端 ASR Provider。
- 本地 CosyVoice 兼容 Provider。
- 云端 TTS / 声音克隆 Provider。

数字人 Provider：

- 本地 HeyGem 兼容 Provider。
- 云端数字人 Provider。

发布 Provider：

- 抖音
- 小红书
- 视频号
- 快手，除非演示视频中有明确主流程，否则作为第二优先级

Provider 配置由用户自行管理。API Key 等敏感信息尽量本地加密保存。

## 数据模型范围

核心实体：

- `ProviderConfig`：Provider 类型、显示名、凭据引用、模型、Base URL、启用状态。
- `VoiceProfile`：声音名称、提示文本、提示音频路径、Provider、语速、情绪配置。
- `DigitalHumanAsset`：数字人名称、源视频路径、封面、Provider、模型版本。
- `Material`：本地素材、素材类型、分类、元信息、向量化状态。
- `ContentDraft`：脚本、标题、描述、标签、字幕、选中的模板。
- `VideoProject`：源素材、生成音频、生成数字人视频、模板、渲染设置、输出路径。
- `PublishAccount`：平台、账号名、显示名、登录状态、浏览器 profile 路径。
- `PublishTask`：目标账号、视频路径、标题、描述、封面、发布模式、状态。
- `WorkflowTask`：当前流水线状态、进度、日志、输出、错误信息。

## 主工作流

第一版应实现与演示视频一致的可见流水线：

1. 内容提取 / 导入。
2. 脚本改写或生成。
3. 语音生成或声音克隆。
4. 数字人生成。
5. 标题和封面生成。
6. 视频合成和编辑。
7. 发布或保存为草稿。

每一步都需要支持：

- 手动执行。
- 进度展示。
- 错误状态和重试。
- 输出预览。
- 将输出传递给下一步。

## 本地服务

本地 sidecar 由统一服务层管理：

- 检查依赖是否存在。
- 启动和停止本地服务。
- 探测健康检查接口。
- 输出日志。
- 展示可执行的安装或配置错误提示。

第一版不假设 Whisper、CosyVoice、HeyGem 一定随安装包内置。应用应支持用户配置本地服务，并提供云端或外部 API 的回退路径。

## 验收标准

第一版满足以下条件即可验收：

- 演示视频中每个可见页面都在新应用中有对应实现。
- 演示视频中每个可见按钮、表单、弹窗和状态都有对应行为。
- 用户可以配置至少一个 LLM Provider，并通过连接测试。
- 用户可以通过模拟或真实能力跑通从脚本到渲染视频的流程。
- FFmpeg 本地媒体处理可用。
- 账号管理和发布准备流程与演示视频一致。
- 应用可以构建为 macOS 桌面安装包。

## 下一步

审查 `/Users/yuzhenzhao/code/ai/功能演示视频.mp4`，创建 `docs/reverse-engineering/demo-video-timeline.md`。

时间轴文档需要记录：

- 时间戳。
- 页面名称。
- 可见控件。
- 用户操作。
- 预期状态变化。
- 复刻优先级。

时间轴确认后，再在 `docs/superpowers/plans/` 下创建实现计划。
