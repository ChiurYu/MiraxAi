# Mirax AI Google Stitch UI 重设计提示词（最终整理版）

> 状态：已按实际生成与验收过程重新整理。25 个已确认页面已经复制到 Figma。
> 本文件保存可复用的 Stitch 页面生成提示词、局部修正原则和 Figma 交接方法。
> Stitch 只负责单页生成与单页修正；跨页面 Prototype 连线统一在 Figma 中完成。

## 使用目标

用 Google Stitch 生成一套可点击、可继续交给 Figma 精修的 Mirax AI 桌面端多页面 UI。

参考截图位于 `docs/截图/`。截图只用于理解功能、页面关系和内容密度，不作为视觉风格目标。

## 推荐使用顺序

1. 新建一个 Stitch 项目，先上传 `docs/截图/首页.png`。
2. 粘贴“全局总控提示词”，让 Stitch 建立产品、视觉和交互基线。
3. 依次粘贴各页面提示词，每次只生成或修改一个页面。
4. 工作台先生成“素材解析”默认态，再生成处理中、复核、发布确认三个关键状态。
5. 每生成一个新页面，都追加“跨页面一致性提示词”。
6. 全部页面稳定后，逐页使用 Stitch 的 Figma 导出能力复制到同一个 Figma Design 文件。
7. 不要在 Stitch 中使用一个超长提示词连接全部页面；这会被解释为生成一张新的综合页面，并破坏已确认的视觉语言。
8. 页面跳转、抽屉、弹窗、返回路径和状态切换统一在 Figma Prototype 中手动连接。

模型使用建议（以当前 Stitch 界面为准）：

- 初次生成单页可以使用 `3 Flash`。
- 对已经生成的页面做精确局部修正时，优先使用 `Thinking with 3.1 Pro`。
- 如果连续两次没有执行修改，不要继续增加长提示词；缩小为只替换当前可见区域的补丁，并列出必须消失和必须出现的文本。

---

## 1. 全局总控提示词

```text
Design a complete, clickable, multi-page desktop application called “Mirax AI”.

PRODUCT
Mirax AI is a local-first desktop creative studio for Chinese short-video creators and content teams. It helps users transform reference material into rewritten scripts, cloned voice audio, digital-human video, a composed vertical video, reviewed publishing metadata, and finally a publishing task.

The product is a serious professional creation tool, not an AI landing page, marketing website, analytics dashboard, or futuristic control room.

REFERENCE USAGE
Use the uploaded screenshots only to understand existing features, information density, field meanings, and page relationships. Do not copy their visual style, purple glow, card outlines, duplicated navigation, or all-functions-on-one-screen layout.

CORE EXPERIENCE
The user must always understand:
1. What project they are working on.
2. Which workflow stage is active.
3. What input is required now.
4. What the system is processing.
5. What output has been produced.
6. What the next action is.

The main workflow has eight stages:
1. 素材解析
2. 文案改写
3. 声音克隆
4. 语音合成
5. 形象生成
6. 视频合成
7. 内容复核
8. 发布

VISUAL DIRECTION — PROFESSIONAL CREATIVE STUDIO
Create a mature, restrained desktop creative-tool aesthetic. The interface should feel calm, precise, editorial, and production-ready, like software used for focused media work every day.

Choose the theme palette yourself. Use a neutral foundation and one restrained, low-saturation accent color. The palette may be light or dark, but it must support long working sessions and clear hierarchy. Color should communicate action and state, not decorate every surface.

Avoid stereotypical AI aesthetics:
- no neon purple-blue gradients
- no glowing borders or outer glows
- no glassmorphism
- no aurora backgrounds
- no oversized gradient call-to-action buttons
- no excessive pill-shaped controls
- no decorative sparkles, robot icons, magic wands, or floating blobs
- no card for every small field
- no dense wall of outlined panels
- no generic SaaS dashboard look

Use typography, spacing, alignment, restrained borders, tonal surfaces, and content grouping to create hierarchy. Use a Chinese UI font such as PingFang SC or Noto Sans SC, with Inter as the Latin fallback. Use a consistent professional line-icon library; do not use emoji as interface icons.

DESKTOP FRAME
- Primary viewport: 1440 × 900
- Must remain usable at 1280px width
- Compact persistent left navigation
- Contextual top bar for project name, autosave state, current task status, and global actions
- Main content should fit the first viewport whenever practical
- Avoid unnecessary vertical scrolling on the main workflow screen

GLOBAL NAVIGATION
Group navigation by user intent:
- 创作: 工作台
- 资产: 声音, 形象, 素材
- 运营: 任务, 账号
- 系统: 设置

Use the labels:
- 工作台
- 声音
- 形象
- 素材
- 任务
- 账号
- 设置

Do not duplicate navigation entries. The active page must be obvious without a glowing background.

WORKBENCH STRUCTURE
The workbench is the core of the product.
- Show the eight-stage workflow as a persistent progress navigator near the top.
- Focus on one active stage at a time instead of showing all stages as cards simultaneously.
- Use a split workspace: stage inputs and controls on the left, output or preview on the right.
- Keep a persistent footer action bar with 上一步, 保存草稿, and 下一步.
- The primary action must change with the stage, for example 解析素材, 生成文案, 开始合成, or 创建发布任务.
- Completed stages remain reviewable and editable.
- If an earlier stage changes, warn the user which downstream outputs may need regeneration.

STATUS SYSTEM
Design consistent visual and interaction states for:
- 待开始
- 处理中
- 需确认
- 已完成
- 失败

Every processing state should show the current operation, progress when available, elapsed time, cancel action when safe, and a link to the related task. Every failure state should show a plain-language cause, retained inputs, retry action, and a path to settings when configuration is the cause.

CROSS-PAGE BEHAVIOR
- Clicking a voice, avatar, or material should open a useful detail panel without losing list context.
- Clicking a task should open its timeline, input summary, output, error information, and available actions.
- Clicking an account should show authorization status and platform capability.
- Settings changes that affect generation should clearly explain their impact.
- Use realistic Chinese mock data instead of lorem ipsum.

ACCESSIBILITY AND QUALITY
- Strong text contrast and visible keyboard focus
- Do not rely on color alone for status
- Touch targets at least 36px high for desktop controls
- Clear empty, loading, error, success, and disabled states
- Destructive actions require confirmation
- Long paths, task IDs, and error messages must wrap or truncate safely with copy actions
- Use an 8px spacing system and consistent radii

PROTOTYPE EXPECTATION
Create a coherent multi-page application, not a collection of disconnected mockups. Navigation items, workflow stages, asset selection, task rows, account rows, settings categories, dialogs, drawers, previous/next actions, and publish confirmation should be clickable and lead to the correct screen or state.
```

---

## 2. 工作台默认态：素材解析

上传 `docs/截图/首页.png` 后使用：

所有工作台页面都先追加以下外壳锁定约束，避免 Stitch 在阶段切换时重画左侧导航和顶部：

```text
SHARED WORKBENCH SHELL — COPY EXACTLY

Create exactly one new sibling screen based on the selected corrected Workbench screen.
Do not modify the selected source screen.

Treat the complete application shell as immutable:
- fixed compact left navigation rail
- same circular logo, icons, Chinese labels, order, spacing, and active-state treatment
- navigation order: 工作台, 声音, 形象, 素材, 任务, 账号, 设置
- 工作台 remains active for every workflow stage

Project context bar — row 1:
- Back arrow
- Project title: 口播视频｜夏季通勤穿搭
- Autosaved state
- Notification, help, and account profile

Workflow navigator — row 2:
1. 素材解析
2. 文案改写
3. 声音克隆
4. 语音合成
5. 形象生成
6. 视频合成
7. 内容复核
8. 发布

- Use numbered circles and horizontal connector lines.
- Keep all eight stages readable in one row.
- Completed, active, and pending states must be visible with text/icon treatment, not color alone.
- Activate only the stage requested by the current prompt.
- Do not merge the workflow navigator into the project context bar.

Bottom action bar:
- 上一步
- 保存草稿
- 下一步
- Preserve the same height, placement, borders, and button treatment.
- No copyright or version text in the Workbench action bar.

Do not change the shell when replacing the stage workspace.
Do not introduce a second top navigation, expanded sidebar, duplicated product name, or new accent color.
```

```text
Create the main Workbench screen for Mirax AI using the approved Professional Creative Studio direction and the existing project design language.

This is the default state of a project named “口播视频｜夏季通勤穿搭”, at workflow stage 1 of 8: 素材解析.

LAYOUT
- Keep the global left navigation and contextual top bar.
- At the top of the work area, show a compact project summary and an eight-stage workflow navigator.
- The workflow navigator must make completed, active, locked, and failed stages distinguishable by icon, label, and state treatment, not color alone.
- Main workspace uses a 60/40 split.

LEFT — INPUT AND CONTROLS
- Source type tabs: 视频链接, 本地文件
- Video link input with supported platform hints: 抖音, 小红书, 快手, Bilibili
- Secondary action: 从素材库选择
- Optional extraction settings in a collapsible section
- Primary action: 解析素材
- A small recent-source area, not a large dashboard card

RIGHT — OUTPUT PREVIEW
- Before processing, show a purposeful empty state explaining what will appear: 视频信息, 原始文案, 关键片段, and processing warnings.
- Include a compact vertical-video placeholder with correct 9:16 proportions.
- After a source is selected, show file thumbnail, duration, resolution, and source path.

BOTTOM ACTION BAR
- 上一步 is disabled
- 保存草稿 is available
- 下一步 is disabled until the extraction result is confirmed

Do not show the other seven stages as large cards. Do not turn the page into a dashboard. Keep the user focused on the current task.
```

## 3. 工作台处理中状态

```text
Create a processing-state variant of the current Mirax AI Workbench screen.

The active stage is 素材解析. Preserve the exact layout and design system from the default Workbench screen.

Show:
- current operation: 正在提取音轨与识别文案
- progress: 42%
- elapsed time: 00:38
- a short explanation that the user can leave the page and monitor progress in 任务
- actions: 查看任务详情 and 取消处理
- retained source information and disabled inputs while processing
- subtle progress treatment without glow, animation spectacle, or oversized status cards

The right preview should progressively reveal available metadata while unfinished sections remain clearly marked as processing. The bottom 下一步 action remains disabled.
```

## 4. 文案改写与语音阶段

```text
Create a new sibling screen named “Workbench: Script Rewriting v2” based on the selected corrected Material Parsing screen.

Treat the entire application shell as immutable and copy it exactly:
- identical sidebar width, background, spacing, logo position, navigation order, labels, icons, icon sizes, stroke weights, active-state style, and footer
- identical top bar, project title, autosave area, and global actions
- identical eight-stage workflow navigator
- identical bottom action bar
- identical palette, typography, borders, and spacing

For every Workbench workflow stage, “工作台” must remain the active sidebar item.
Only change the active workflow stage from “素材解析” to “文案改写” and replace the main workspace content.

Do not use the older Script Rewriting screen as a visual reference.
Do not reinterpret, replace, reorder, or redraw the sidebar icons.
Do not modify the selected Material Parsing screen.

Create the stage-focused Workbench screen for 文案改写, following the exact same shell, spacing, palette, typography, workflow navigator, and footer actions as the previous Workbench screen.

LEFT SIDE
- Original transcript in a read-only comparison panel
- Rewrite goal selector: 保持原意, 更口语化, 更专业, 自定义
- Prompt preset selector with an edit action
- Target length control
- Rewritten script editor with character count
- Primary action: 生成改写
- Secondary action: 对比版本

RIGHT SIDE
- Version history with three revisions
- Clear change comparison between original and current version
- Status and generation metadata in a compact footer

Create related stage variants for 声音克隆 and 语音合成:
- 声音克隆 selects an existing voice asset or creates a new one, showing training status and sample preview.
- 语音合成 selects the confirmed script and voice, then exposes speed, emotion, and preview controls.
- Keep advanced controls collapsed by default.
- Generated audio appears as a real waveform-style media player with duration, play, pause, seek, volume, regenerate, and open-file actions.

Every stage must clearly show its input dependency, output artifact, and next action.
```

## 5. 形象生成与视频合成

```text
Create two consistent Workbench stage screens for 形象生成 and 视频合成.

形象生成:
- Select an avatar from the asset library with thumbnail, name, aspect ratio, and readiness status.
- Allow opening the avatar detail panel or creating a new avatar.
- Show selected audio dependency and model version in a compact configuration summary.
- Primary action: 生成口播视频.
- Right side uses a 9:16 preview with processing, completed, and failed states.

视频合成:
- Use the generated avatar video as the primary source.
- Controls for subtitles, subtitle style, background music, voice volume, BGM volume, picture-in-picture material, crop behavior, and intro silence trimming.
- Place frequently used controls first; hide specialist settings under 高级设置.
- Right side shows the 9:16 composed preview plus a compact layer summary.
- Primary action: 合成视频.

Keep the experience like a focused editing studio. Do not imitate a full timeline video editor and do not overload the screen with every possible control.
```

### 5.1 视频合成最终详细提示词

```text
Create exactly one new sibling screen named “Workbench: Video Composition v3” based on the selected corrected Avatar Generation screen.

Apply SHARED WORKBENCH SHELL exactly.
Do not modify the selected source screen.

WORKFLOW STATE
- 素材解析 — completed
- 文案改写 — completed
- 声音克隆 — completed
- 语音合成 — completed
- 形象生成 — completed
- 视频合成 — active
- 内容复核 — pending
- 发布 — pending

Use a balanced 55/45 two-column layout. This is a focused composition screen, not a professional timeline editor.

LEFT SIDE — SOURCES AND COMPOSITION SETTINGS

Section: 输入摘要
- Avatar video: 夏季通勤穿搭_清禾_v1.mp4
- Duration: 01:42
- Resolution: 1080 × 1920
- Audio: 夏季通勤穿搭_林悦_v1.wav
- Avatar: 清禾
- Status: 已就绪
- Actions: 预览源视频, 更换源视频

Section: 字幕
- Enable subtitles: on
- Subtitle style: 极简白字
- Position: 底部安全区
- Font size: 中
- Actions: 编辑字幕, 预览样式

Section: 背景音乐
- Enable BGM: on
- Selected track: 城市漫步_轻快.wav
- Human voice volume: 100%
- BGM volume: 20%
- Actions: 试听, 更换音乐

Section: 画面设置
- Picture-in-picture material: 未启用
- Framing: 保持原始 9:16
- Auto-remove intro silence: on
- Put crop, transitions, fade duration, and specialist controls inside a collapsed 高级设置 section.

Primary action:
- 重新合成
- Secondary action: 恢复默认设置

RIGHT SIDE — COMPOSED VIDEO OUTPUT

Show a completed realistic mock output:
- File name: 夏季通勤穿搭_成片_v1.mp4
- Duration: 01:40
- Resolution: 1080 × 1920
- Ratio: 9:16
- Status: 已完成

Include a professional 9:16 video player:
- show the same selected photorealistic presenter 清禾
- preserve the same face, hairstyle, clothing, and identity from Avatar Generation
- display realistic Chinese subtitles in the bottom safe area
- play and pause
- seek bar
- current and total time
- volume
- fullscreen
- poster frame

Below the player show a compact layer summary:
- 数字人口播
- 人声音轨
- 字幕
- 背景音乐

Output actions:
- 重新合成
- 在文件夹中显示
- 查看合成任务

Show the note:
“修改源视频、字幕、音乐或音量后，需要重新合成视频。”

NEXT STEP
- 下一步 proceeds to 内容复核.
- If no completed composed video exists, 下一步 must be disabled.

VISUAL CONSTRAINTS
- Generate one screen only.
- Use Chinese interface text.
- Preserve the Professional Creative Studio visual language.
- Preserve the presenter’s photorealistic identity.
- Do not create a complex editing timeline.
- No neon gradients, glow, glassmorphism, AI decoration, or cartoon imagery.
- Do not generate the Content Review screen.
- Do not change any shared application-shell component.
```

## 6. 内容复核与发布

```text
Create the final two Workbench stages: 内容复核 and 发布.

内容复核 layout:
- Left: editable title, description, topics/tags, and cover selection.
- Center or right: 9:16 final-video preview with poster frame.
- A clear checklist for video, audio, subtitles, cover, title, description, and account readiness.
- AI-assisted title suggestions may appear as a quiet optional action, not a visual centerpiece.
- Let users compare 3 cover candidates and upload a custom cover.
- Primary action: 确认内容.

发布 layout:
- Select one or more connected platform accounts.
- Each account row shows platform, nickname, authorization state, last checked time, and capability.
- Publish mode: 保存为平台草稿 or 直接发布.
- Scheduling can be visible but marked as unavailable if not supported.
- Final preflight summary includes video, cover, title, description, tags, accounts, and publish mode.
- Primary action: 创建发布任务.
- Require a confirmation dialog before task creation.
- After confirmation, navigate to the related task detail in 任务.

Use realistic platforms: 抖音, 小红书, 快手, 视频号, Bilibili. Clearly distinguish local mock or unavailable capabilities without making the interface look unfinished.
```

## 7. 声音资产库

上传 `docs/截图/声音管理.png` 后使用：

```text
Redesign the Mirax AI 声音 page as a professional voice asset library, preserving the product shell and visual system from the Workbench.

PAGE STRUCTURE
- Page header: 声音, short description, search, filters, and primary action 新建声音
- Filter by status, source, and updated time
- Main area uses a compact list or medium-density grid of voice assets
- Each asset shows name, short description, duration of sample, source, readiness status, last updated time, and play action
- Selecting an asset opens a right-side detail panel with preview, metadata, related projects, rename, replace sample, and delete actions

NEW VOICE FLOW
Create a multi-step drawer or dialog:
1. 上传音频 or 直接录音
2. Check duration and audio quality
3. Name the voice and confirm prompt text
4. Review training configuration
5. Create training task

Do not place voice training and synthesis as two equally large permanent forms. Voice synthesis belongs primarily in the Workbench; this page focuses on creating, reviewing, and managing reusable voice assets.

Include populated, empty, uploading, training, ready, and failed states.
```

## 8. 形象资产库

上传 `docs/截图/形象管理.png` 后使用：

```text
Redesign the Mirax AI 形象 page as a professional digital-presenter asset library, using the same product shell and design system.

- Page header with search, readiness filters, and primary action 新建形象
- Use a media-first grid with consistent 9:16 thumbnails
- Each item shows name, source resolution, duration, model version, readiness status, and last updated time
- Hover actions remain minimal; detailed actions appear after selection
- Selecting an avatar opens a right detail panel with larger preview, metadata, usage history, open-file, rename, replace source, retrain, and delete

NEW AVATAR FLOW
Use a guided drawer or dialog:
1. Upload reference video
2. Validate format, duration, framing, lighting, and audio
3. Name and describe the avatar
4. Select model version
5. Review and create training task

Surface upload guidance before errors happen. Preserve the user’s inputs if validation fails. Include populated, empty, uploading, training, ready, and failed states.
```

## 9. 素材库

上传 `docs/截图/素材管理.png` 后使用：

```text
Redesign the Mirax AI 素材 page as a scalable local media library.

- Header with search, view switcher, filter, sort, and primary action 导入素材
- Left category navigation: 全部, 视频, 图片, 音频, 封面, 背景音乐, 自定义分类
- Main content supports both grid and compact list views
- Media cards show real thumbnail, type, duration or dimensions, file size, category, added time, and usage count
- Multi-select enables a restrained batch-action bar
- Selecting an item opens a right detail panel with preview, metadata, file path, categories, project usage, replace, open-file, and delete
- Upload uses a queue drawer with progress, duplicate detection, failures, retry, and cancel
- Search empty state and first-use empty state must be different

Do not expose future vectorization as a primary action. If shown, label it as a later or unavailable capability in the detail area only.
```

## 10. 任务中心

上传 `docs/截图/任务中心.png` 后使用：

```text
Redesign the Mirax AI 任务 page as the operational truth for workflow, media processing, training, and publishing tasks.

- Header with summary counts, but do not use four oversized KPI cards
- Compact summary tabs: 全部, 处理中, 需处理, 已完成, 失败
- Search and filters for task type, project, status, and time
- Main content is a high-density table with columns: 任务, 类型, 项目, 状态, 进度, 当前步骤, 更新时间, 操作
- Rows display status with icon plus label, never emoji
- Processing rows show inline progress
- Failed rows show a concise failure reason and retry action
- Clicking a row opens a task detail drawer with timeline, inputs, outputs, logs summary, error details, related settings, retry, cancel, and open-result actions
- Add a clear link back to the related Workbench project and workflow stage

Use realistic populated mock data. Also create empty, loading, active, completed, failed, cancelled, and retrying states.
```

## 11. 账号管理

上传 `docs/截图/账号管理.png` 后使用：

```text
Redesign the Mirax AI 账号 page for managing publishing accounts.

- Header with platform filter, authorization-status filter, search, and primary action 添加账号
- Main content uses a compact list grouped by platform, not a mostly empty page
- Each account row shows platform icon, nickname, account ID, authorization state, last checked time, supported publish mode, and projects recently used
- Selecting an account opens a detail drawer with permissions, browser authorization state, capability list, test login, reconnect, disable, and remove

ADD ACCOUNT FLOW
1. Choose platform: 抖音, 小红书, 快手, 视频号, Bilibili
2. Explain that authorization opens the platform’s official login flow
3. Show waiting-for-login state
4. Verify authorization
5. Show success or actionable failure

Never imply bypassing platform login or verification. Distinguish connected, needs reauthorization, checking, unavailable, and disconnected states.
```

## 12. 设置：最终七页提示词

上传 `docs/截图/设置.png`，或复制任意一个已经确认的设置页作为 sibling screen。

### 12.0 设置页公共外壳

以下约束必须放在每个设置页提示词开头：

```text
Create exactly one new sibling screen inside the existing Mirax AI application.

Use the selected corrected settings screen as the exact visual and structural source of truth.
Do not modify the selected source screen.
Do not generate another settings category.
Generate one screen only.

SHARED SETTINGS SHELL — COPY EXACTLY

Global navigation:
- Preserve the fixed compact navigation rail.
- Keep the exact logo, icons, Chinese labels, dimensions, spacing, colors, dividers, and active states.
- Navigation order: 工作台, 声音, 形象, 素材, 任务, 账号, 设置.
- 设置 remains active.
- Do not expand, regroup, rename, or reorder navigation items.

Top application bar:
- Preserve “Mirax AI > 设置”.
- Keep the same height, borders, spacing, notification, help, and profile controls.
- Do not add project context or a workflow navigator.

Settings category navigation:
- Keep these categories together and in this exact order:
  通用
  AI 服务
  本地依赖
  输出与存储
  提示词
  数据
  更新与支持
- Activate only the category named by the current prompt.
- Preserve the local privacy note at the bottom.

Layout:
- Both navigation areas remain fixed.
- Only the main settings content scrolls.
- Match the approved settings screens for typography, colors, borders, controls, spacing, and content width.
- Prevent horizontal scrolling and clipped Chinese text.
- Do not create a second global sidebar or application-level drawer unless the page explicitly requests a contextual detail drawer.

VISUAL CONSTRAINTS
- Use Chinese interface text except standard technical terms, versions, codecs, paths, and Provider names.
- Preserve the Professional Creative Studio visual language.
- Use restrained dark neutral colors and the existing pale-blue accent.
- No gradients, neon, glow, glassmorphism, decorative AI imagery, cartoons, mascots, or oversized empty cards.
- Avoid excessive nested cards.
- Status must use icons and text, not color alone.
- Provide visible labels, readable contrast, keyboard focus states, and safe wrapping or truncation for long paths.
- At 1366–1600px desktop widths, all important controls must remain readable without horizontal scrolling.
```

### 12.1 通用

```text
Create exactly one new sibling screen named “Settings: General v3”.
Apply all rules from SHARED SETTINGS SHELL and activate only “通用”.

PAGE HEADER
- Title: 通用
- Description: 设置 Mirax AI 的外观、启动行为、默认工作方式、通知与自动保存偏好。
- Right side: 已保存 and 重置为默认设置.
- Reset requires confirmation.

SECTION — 外观
- 主题模式: 跟随系统, 浅色, 深色.
- 跟随系统 is selected.
- 界面密度: 舒适, 紧凑.
- 舒适 is selected.
- 字体缩放 slider with value 100%.
- Theme and density previews must reuse the existing Mirax AI palette and must not introduce a new design language.

SECTION — 启动与恢复
- 启动页面: 上次打开的项目, 工作台, 任务中心.
- 上次打开的项目 is selected.
- Toggle on: 启动时恢复上次未完成的草稿.
- Toggle on: 启动时检查本地依赖状态.
- Toggle off: 启动时检查全部 Provider 连接状态.
- Toggle off: 启动后自动运行未完成任务.
- Explain that automatic task execution may call local services or configured Providers.

SECTION — 默认工作方式
- 执行模式: 手动, 自动, 后台.
- 手动 is selected.
- Default save behavior: 自动保存草稿.
- Auto-save status must be clearly different from manual save status.
- Provide a safe explanation of which actions still require explicit confirmation.

SECTION — 通知
- Toggle on: 任务完成.
- Toggle on: 任务失败.
- Toggle on: 发布账号授权即将过期.
- Toggle off: 常规成功提示使用系统通知.

INTERACTIONS
- Controls are clickable and show changed, saved, invalid, and reset-confirmation states.
- Default generated state is healthy and saved with no modal open.
- Do not place Provider, output-directory, database, prompt-template, or update controls on this page.
```

### 12.2 AI 服务

```text
Create exactly one new sibling screen named “Settings: AI Services v4”.
Apply all rules from SHARED SETTINGS SHELL and activate only “AI 服务”.

PAGE HEADER
- Title: AI 服务
- Description: 配置文案处理、多模态分析和内容复核所使用的 AI Provider。
- Actions: 刷新状态, 测试全部连接, 添加 Provider.

MAIN LAYOUT
- Left/main area: Provider list or compact table.
- Optional right contextual detail drawer: approximately 420px wide and overlaying the content rather than compressing the table into unreadable columns.
- When the drawer closes, the complete table columns become visible again.

FILTERS
- 全部, 已连接, 需要配置, 连接失败.
- Search Provider or model.
- Filter by 类型, 状态, 能力.

PROVIDER TABLE
Show realistic rows:
1. Mirax 文案服务 — OpenAI 兼容 — gpt-4.1-mini — 已连接.
2. Gemini 内容服务 — Google Gemini — Gemini 2.5 Flash — 已连接.
3. 本地语音服务 — CosyVoice — 需要配置.
4. 本地形象服务 — HeyGem — 连接失败 / 服务未启动.

Columns:
- Provider
- 类型
- 默认模型
- 能力
- 连接状态
- 最近测试
- 操作

DETAIL DRAWER FOR SELECTED PROVIDER
- Name: Mirax 文案服务.
- Type: OpenAI 兼容.
- Enabled toggle.
- Connection status and latency.
- Base URL.
- Default model.
- Timeout.
- API key shown only as configured/masked; never reveal the secret.
- Actions: 保存更改, 测试连接, 复制配置, 停用 Provider, 删除此配置.

CAPABILITY BINDING
Supported workflow abilities:
- 文案提取
- 文案改写
- 标题建议
- 内容复核

Do not include unsupported “脚本生成”.
Do not assign voice cloning, speech synthesis, avatar training, or avatar video generation to a text Provider.

VALIDATION AND SAFETY
- Invalid Base URL, missing model, missing key, timeout, unauthorized, rate-limited, and service-unavailable states require clear explanations and recovery actions.
- Saving and testing are separate actions.
- Deletion requires confirmation.
- Closing the drawer preserves filters and selected row.
```

### 12.3 本地依赖

```text
Create exactly one new sibling screen named “Settings: Local Dependencies v3”.
Apply all rules from SHARED SETTINGS SHELL and activate only “本地依赖”.

PAGE HEADER
- Title: 本地依赖
- Description: 检查和配置视频处理、声音克隆、数字人生成及平台授权所需的本地工具与服务。
- Show 最近检查：刚刚.
- Actions: 配置目录, 刷新, 检查全部依赖.

STATUS TABS
- 全部 5
- 正常 3
- 需配置 1
- 不可用 1

INFORMATION NOTE
“依赖检查只读取本机工具、路径和服务状态。安装、启动或修改配置前将明确请求用户操作。”

DEPENDENCY LIST

FFmpeg:
- Status: 正常.
- Version: 7.1（需 6.0+）.
- Path: /opt/homebrew/bin/ffmpeg.
- Purpose: 视频转码、音频提取、成片与封面处理.

Python:
- Status: 正常.
- Version: 3.12.4（需 3.10+）.
- Path: /opt/homebrew/bin/python3.
- Purpose: 本地模型服务和长任务运行环境.

CosyVoice:
- Status: 需配置.
- Address: 未设置.
- Purpose: 声音克隆与语音合成.
- Action: 完成配置.

HeyGem:
- Status: 不可用.
- Version: V2.
- Address: http://127.0.0.1:8383.
- State: 未启动.
- Expand this item by default and show diagnostics:
  地址校验 — 通过
  进程状态 — 失败
  服务响应 — 失败
- Diagnosis: 配置地址有效，但服务没有响应；确认本地服务已启动并检查端口占用.
- Actions: 启动服务, 编辑服务地址, 重新检查, 查看日志.
- Starting the service requires a confirmation step and must never happen automatically.

Browser automation:
- Status: 正常.
- Purpose: 官方平台登录授权和发布流程.
- Show installed browser/runtime version and last check.

RULES
- Detection, configuration, installation, and service startup are distinct actions.
- Do not imply that a check installs or repairs software.
- Do not automatically download, install, start, or modify privileged services.
- Long paths and error messages must remain readable.
- Use Chinese labels 地址校验, 进程状态, 服务响应 instead of English diagnostic headings.
```

### 12.4 输出与存储

```text
Create exactly one new sibling screen named “Settings: Output & Storage v3”.
Apply all rules from SHARED SETTINGS SHELL and activate only “输出与存储”.

PAGE HEADER
- Title: 输出与存储.
- Description: 设置生成文件的保存位置、目录结构、命名规则和默认输出格式.
- Status: 已保存.
- Actions: 打开输出目录, 重置为默认设置.

SECTION — 基础输出目录
- Path: /Users/yuzhenzhao/Movies/Mirax AI.
- Status: 可写.
- Available: 428 GB.
- Last check: 刚刚.
- Actions: 更改目录, 打开目录, 重新检查.
- Warning: 更改输出目录不会自动移动已有文件；修改后创建的新任务使用新目录.
- Validate existence, write permission, and disk space. Never silently fall back to another folder.

SECTION — 目录组织方式
- Mode 1: 按项目归档 — selected.
- Mode 2: 全部保存到基础目录.
- Toggle on: 自动创建项目文件夹.
- Toggle on: 按文件类型创建子目录.
- Folder template: {项目名称}.
- Supported variables: {项目名称}, {创建日期}, {项目ID}.
- Action: 插入变量.

Directory preview must show exactly:
Mirax AI/
└── 夏季通勤穿搭/
    ├── 素材/
    ├── 音频/
    ├── 形象/
    ├── 成片/
    │   └── 夏季通勤穿搭_成片_v1.mp4
    ├── 封面/
    └── 字幕/

SECTION — 文件命名规则
- Template: {项目名称}_{内容类型}_{版本号}.
- Example: 夏季通勤穿搭_成片_v1.mp4.
- Variables: 项目名称, 内容类型, 形象名称, 创建日期, 创建时间, 版本号.
- Toggle on: 自动替换非法字符.
- Toggle off: 添加创建时间.
- Conflict strategy: 自动递增版本号 — selected and recommended.
- Other options: 每次保存前询问, 覆盖已有文件.
- Never overwrite silently; overwrite requires warning and confirmation.

SECTION — 默认输出格式
- Video: MP4, H.264, AAC, 1080p, frame rate follows source.
- Audio: WAV, 48 kHz, 24 bit.
- Cover: PNG, sRGB.
- Subtitles: SRT, UTF-8.
- Put specialist controls inside collapsed 高级输出设置.

SECTION — 存储保护
- Toggle on: 输出目录不可用时暂停任务.
- Toggle on: 磁盘空间不足时提醒.
- Threshold: below 10 GB.
- Toggle on: 写入完成后验证文件完整性.
- Toggle off: 自动保存源素材副本到项目目录.
- Explain that cache and database management belong to 数据.

Do not place database backup, restore, cache cleaning, reset, or log export on this page.
```

### 12.5 提示词

```text
Create exactly one new sibling screen named “Settings: Prompt Templates v3”.
Apply all rules from SHARED SETTINGS SHELL and activate only “提示词”.

PAGE HEADER
- Title: 提示词.
- Description: 管理文案改写、标题生成、发布文案和内容复核使用的提示词模板.
- Actions: 查看版本记录, 新建提示词.
- Status: 已保存 / 有未保存更改.

MAIN LAYOUT
- Left panel 320–360px: categories, search, source filter, sort, and template list.
- Right panel: selected template editor.
- This is a two-panel editor workspace, not a chat interface and not a code IDE.

CATEGORIES
- 全部 8
- 文案改写 4
- 标题与发布文案 2
- 内容复核 2
- Source filter: 全部, 系统模板, 自定义模板.
- Sort: 最近更新.

WHEN 文案改写 IS SELECTED, SHOW FOUR TEMPLATES
1. 小红书种草风格 — 自定义 — v3 — 当前默认.
2. 保持原意 — 系统模板.
3. 专业口播 — 系统模板.
4. 精简口播 — 自定义 — v2.

SELECTED TEMPLATE
- Name: 小红书种草风格.
- Description: 适合穿搭、生活方式和好物分享的短视频口播改写，语气自然轻快，强调真实体验.
- Application stage: 文案改写.
- Explain that it appears in Workbench stage 2 and does not replace defaults for other categories.

PROMPT CONTENT
Use this canonical content:

你是一名专业的短视频口播文案编辑。请根据提供的信息改写原始口播文案。

【原始文案】
{{原始文案}}

【产品信息】
产品名称：{{产品名称}}
核心卖点：{{核心卖点}}

【改写目标】
目标风格：{{目标风格}}
目标字数：{{目标字数}}

【改写要求】
1. 保留原始文案中的事实、核心观点和产品信息。
2. 使用自然、可信、适合真人口播的表达。
3. 开头快速建立使用场景、需求或痛点。
4. 突出核心卖点，但不得虚构体验、数据或效果。
5. 使用简短句子和自然停顿，避免书面化长句。
6. 不要生成标题、话题标签、Emoji 或图文笔记格式。
7. 不要输出分析、说明或改写过程。
8. 只输出改写后的完整口播文案。

VARIABLES
- {{原始文案}} — required.
- {{产品名称}}, {{核心卖点}}, {{目标风格}}, {{目标字数}}, {{平台}} — optional.
- Insert variable action.
- Unknown variables show an inline warning.

DEFAULT RULES
- Toggle on: 在文案改写阶段默认使用此模板.
- Toggle on: 允许在工作台中编辑副本.
- Project edits must not overwrite the global template.

VERSION AND SAFETY
- System templates cannot be deleted; editing creates a custom copy.
- Custom templates can be renamed, duplicated, exported, and deleted with confirmation.
- Include collapsed 测试模板, version history, restore previous version, save, and discard.
- Navigating away with unsaved edits requires confirmation.
- Do not expose Provider keys, temperature, top-p, or token limits.
```

### 12.6 数据

```text
Create exactly one new sibling screen named “Settings: Data v3”.
Apply all rules from SHARED SETTINGS SHELL and activate only “数据”.

PAGE HEADER
- Title: 数据.
- Description: 管理 Mirax AI 的本地数据库、备份、缓存和数据恢复.
- Status: 数据正常.
- Actions: 打开数据目录, 立即备份.
- State that projects, drafts, tasks, and settings stay local and are not automatically synced.

SECTION — 本地数据库
- Path: /Users/yuzhenzhao/Library/Application Support/Mirax AI/data/mirax.db.
- Status: 正常.
- Type: SQLite.
- Schema: v12.
- Last check: 刚刚.
- Actions: 打开所在目录, 检查数据库, 更改数据库位置.
- Moving the database requires validation, a safety backup, migration progress, and restart.
- Generated media is not part of the database.

SECTION — 存储概览
- Database: 186 MB.
- Projects and drafts: 428 MB.
- Cache: 3.6 GB.
- Logs: 84 MB.
- Total application data: 4.3 GB.
- Disk available: 428 GB.
- Use a restrained storage bar, not an analytics dashboard.

SECTION — 数据备份
- Last backup: 昨天 22:30.
- File: Mirax-AI-Backup-2026-06-22.miraxbackup.
- Size: 172 MB.
- Status: 备份成功.
- Actions: 立即备份, 从备份恢复, 打开备份目录.
- Backup location and automatic backup controls.
- Default automatic backup: daily at 22:30; keep 7 copies.
- Include projects, drafts, tasks, metadata, settings, and prompts.
- Exclude API keys, platform credentials, cache, logs, and generated media.
- Restore validates the file, creates a safety backup, requires confirmation, shows progress, and restarts after success.

SECTION — 缓存管理
- Selectable categories: 临时处理文件, 素材缩略图, AI 任务缓存, 历史日志.
- Show size per category and selected total.
- Actions: 清理所选缓存, 重新扫描.
- Cache cleaning requires confirmation and progress.
- Never delete source material, generated output, active-task files, or the database.
- Automatic expiry controls and low-disk warning.

SECTION — 危险操作
- Action: 重置所有本地数据.
- Explain exactly what is deleted and that output files are not automatically deleted.
- Offer a backup first.
- Require typing “重置所有数据”.
- Final action: 确认重置并重新启动.
- Never reset from a single click.

ERROR STATES
- Database inaccessible, backup path unwritable, disk full, corrupted backup, incompatible version, cache locked.
- Every error shows retained data and a recovery action.
```

### 12.7 更新与支持

```text
Create exactly one new sibling screen named “Settings: Updates & Support v3”.
Apply all rules from SHARED SETTINGS SHELL and activate only “更新与支持”.

PAGE HEADER
- Title: 更新与支持.
- Description: 检查 Mirax AI 更新，查看使用帮助，并收集安全的本地诊断信息.
- Status: 系统正常.
- Actions: 打开帮助中心, 检查更新.

SECTION — 软件更新
- Product: Mirax AI Desktop.
- Version: v1.2.0.
- Build: 2026.06.23 · Apple Silicon.
- Channel: 稳定版.
- Status: 已是最新版本.
- Last checked: 今天 09:41.
- Actions: 检查更新, 查看更新日志, 复制版本信息.
- Provide checking, no-update, update-available, download, verification, install, and failure states.
- Verify package signature and checksum before installation.
- Installation warns about active tasks and unsaved work, then requires confirmation and restart.

SECTION — 更新偏好
- Channel: 稳定版 or 预览版; stable selected.
- Toggle on: 启动时自动检查更新.
- Toggle off: 后台自动下载更新.
- Installation behavior: 下载完成后询问, 退出时安装, 手动安装.
- Never force automatic installation.

SECTION — 诊断与反馈
- Show OS, chip, app version, database schema, Provider status, dependency summary, and last check.
- Actions: 复制诊断摘要, 导出诊断包, 打开日志目录, 查看今日日志, 提交问题反馈.
- Diagnostic note must say it excludes API Key, Token, Cookie, platform login credentials, project media, and generated content.
- Diagnostic export never uploads automatically.

FEEDBACK MODAL
- Fields: 问题类型, 标题, 描述, 重现步骤, 预期结果, 实际结果, optional contact.
- Toggle on: 包含诊断摘要.
- Toggle off: 包含今日日志.
- Actions: 取消, 导出反馈包, 提交反馈.
- If no online support endpoint exists, disable direct submission and keep export available with a clear explanation.
- Never show a false upload success.

SECTION — 使用帮助
- 快速入门.
- 工作台流程说明.
- 本地服务配置.
- 常见问题.
- 键盘快捷键.
- Clearly mark external links.

SECTION — 关于 Mirax AI
- Version, build, runtime, architecture, schema.
- Links: 隐私说明, 用户协议, 开源软件许可, 第三方组件, 版本记录.
- Copyright belongs here, not in the global shell or Workbench footer.
```

## 13. 跨页面一致性提示词

每生成一个新页面后追加：

```text
Keep this screen inside the same Mirax AI application and preserve the exact established design system from the approved Workbench:
- same navigation width and grouping
- same top bar height and project context behavior
- same typography scale
- same neutral palette and restrained accent
- same spacing rhythm, border logic, radius, shadows, icon family, inputs, buttons, tables, drawers, dialogs, status labels, and empty states
- same Chinese terminology

Do not reinterpret the product as a new visual concept. Do not introduce gradients, glow, glassmorphism, decorative AI imagery, oversized cards, or a second accent palette.
```

### 13.1 局部修正补丁模板

Stitch 已经生成正确布局但局部内容有误时，不要再次发送完整页面提示词。选中当前页面并使用：

```text
Modify only the selected screen.

Do not create a sibling screen.
Do not redesign the page.
Do not change the application shell, layout, colors, typography, spacing, or unrelated sections.

Fix only: [明确写出区域名称].

REPLACE
- Remove exactly: [必须消失的文字或控件].
- Add exactly: [必须出现的文字或控件].

PRESERVE
- [必须保留的现有区域 1]
- [必须保留的现有区域 2]
- All lower off-screen sections
- Existing interactions and selected states

FINAL CHECK
- The result is incorrect if [旧内容] remains visible.
- The result is correct only if [新内容] is visibly present.

Generate one corrected screen only.
```

补丁必须尽量短，只描述当前可见区域；不要在同一个补丁中重新解释整个产品。

## 14. 禁止在 Stitch 中使用的跨页连线提示词

不要再向 Stitch 粘贴“Turn the generated screens into one coherent clickable prototype”之类的项目级提示词。

实际验证结果：Stitch 会把它解释成“生成一张包含全部能力的新页面”，而不是把既有 sibling screens 按名称连接起来。长提示词会让模型重新概括导航、工作流和设置，从而生成一张脱离已确认视觉语言的综合页面。

原因：

1. Stitch 的生成输入是单页生成或单页修改入口，不是可靠的项目级 Prototype 编排器。
2. 提示词中的页面名称不是既有页面的内部 ID，无法作为稳定的可执行跳转目标。
3. “不要改变样式”只是自然语言约束，不等于锁定 Figma 组件或 Stitch 页面对象。
4. 当一个提示词同时描述全部页面、状态和连接关系时，模型会优先重新生成布局。

正确做法：

1. Stitch 只生成和修正一个页面。
2. 使用 `Create exactly one new sibling screen` 或 `Modify only the selected screen` 明确作用域。
3. 全部确认后逐页使用 `Copy to Figma` / `Paste to Figma` / Figma 导出入口。
4. 在 Figma Prototype 中使用真实 Frame 和 Overlay 建立跳转。

## 15. Figma 原型连线验收清单

这部分不是 Stitch 提示词，而是 Figma 中的手工连接清单。

### 15.1 文件结构

- `00｜Stitch Raw Import`：保存并锁定原始导入稿。
- `01｜Workbench Flow`
- `02｜Voice & Avatar Assets`
- `03｜Materials`
- `04｜Tasks & Accounts`
- `05｜Settings`
- `06｜Prototype`

主画板使用 `1440 × 900`；长设置页允许垂直滚动。原始导入稿不要直接修改，复制到工作区后再整理组件和尺寸。

### 15.2 Frame 命名

- `WB-01 Material Parsing Default`
- `WB-02 Material Parsing Processing`
- `WB-03 Script Rewriting`
- `WB-04 Voice Cloning`
- `WB-05 Speech Synthesis`
- `WB-06 Avatar Generation`
- `WB-07 Video Composition`
- `WB-08 Content Review`
- `WB-09 Publish`
- `ASSET-01 Voice Library`
- `ASSET-02 Avatar Library`
- `ASSET-03 Material Library`
- `OPS-01 Task Center`
- `OPS-02 Account Management`
- `SET-01 General`
- `SET-02 AI Services`
- `SET-03 Local Dependencies`
- `SET-04 Output & Storage`
- `SET-05 Prompt Templates`
- `SET-06 Data`
- `SET-07 Updates & Support`

### 15.3 优先提取的组件

- App Shell / Global Navigation
- Top Bar
- Settings Navigation
- Workflow Stepper
- Bottom Action Bar
- Button variants
- Input / Select / Toggle
- Status Badge
- Asset Card
- Table Row
- Drawer
- Dialog

页面中统一替换为组件实例，避免不同 Stitch 页面中的导航、按钮和状态样式继续漂移。

### 15.4 Prototype 连接

- 全局左侧导航连接工作台、声音、形象、素材、任务、账号、设置。
- 工作台上一步/下一步连接八阶段流程。
- 资产选择返回原工作台阶段并保留项目上下文。
- 处理中的任务连接任务中心详情。
- 发布确认创建模拟任务并连接任务详情。
- 设置侧栏连接七个设置 Frame。
- Drawer 使用 `Open overlay` + Move in from right，约 200ms。
- Dialog 使用 `Open overlay` + Dissolve，约 150ms。
- 普通页面切换使用 Instant，避免为了展示而增加无意义动画。
- 所有抽屉与弹窗必须有 Close、Cancel 和 Confirm。
- 删除、恢复、重置、安装、发布等危险动作必须经过确认。

### 15.5 Prototype 起点与验收

- Flow starting point：`WB-01 Material Parsing Default`。
- Flow name：`Mirax AI Main Flow`。
- 检查 1440×900 和 1280px 宽度。
- 检查死链、错误目标、返回路径、禁用按钮、弹窗关闭、抽屉关闭、状态丢失、中文裁切和横向滚动。
- 不要把 Stitch 导出的 HTML/CSS 直接作为 Mirax AI 生产代码。

## 16. Figma 交接建议

Stitch 生成稳定后再粘贴到 Figma，优先完成：

1. 把导航、顶栏、按钮、输入框、状态标签、资源卡、表格、抽屉和弹窗整理成组件。
2. 建立颜色、字体、间距、圆角和阴影变量。
3. 用 Figma Prototype 补齐页面跳转、抽屉、弹窗与状态切换；不要再回到 Stitch 生成跨页原型。
4. 以 1440×900 为主帧，再检查 1280px 桌面宽度。
5. 最后再把确定的页面交给工程实现；不要把 Stitch 导出的代码直接当作 Mirax AI 的生产代码。
