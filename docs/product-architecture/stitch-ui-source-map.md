# Stitch UI 导出来源映射

## 目的

本文件把 `docs/design-source/stitch/` 中的 25 份 Stitch 导出物整理为 Mirax AI 工程实现可以使用的视觉证据。

Stitch 导出物的职责是：

- 提供布局、内容密度、控件层级、视觉节奏和交互状态参考。
- 提供可检索的 HTML 文本、Tailwind 配置、图片 URL 和准确中文文案。
- 作为浏览器视觉验收的参考图。

Stitch 导出物不承担以下职责：

- 不作为生产代码直接复制到 Vue。
- 不替代 `@mirax/core` workflow、provider、media、publish、local-store 或 sidecar 的领域行为。
- 不引入 Tailwind CDN、Google Fonts、Material Symbols 或 Google 图片热链到生产运行时。
- 不把同一路由的处理中状态或视觉修正版实现为重复页面。

功能与交互优先级：

1. `docs/product-architecture/` 与已确认功能需求。
2. 现有 `packages/` 领域类型和状态转换。
3. `docs/superpowers/specs/2026-06-22-mirax-stitch-ui-redesign-design.md`。
4. 本文件标记的 canonical Stitch `screen.png` 与 `code.html`。
5. alternate 导出只用于补充细节，不得覆盖 canonical 视觉方向。

## 已确认的基线决策

用户已确认采用“双基线”策略：

- **功能基线：** 当前工作区已有的 Workbench 改动。保留现有 workflow、阶段状态、草稿持久化、Provider 调用、媒体产物、发布准备和 mock 任务行为。
- **视觉基线：** 本文件标记的 canonical Stitch `screen.png` 与 `code.html`。应用外壳、单阶段布局、导航、信息密度、控件层级和视觉样式按 Stitch 方向重构。

执行规则：

- 不回滚当前未提交 Workbench 改动。
- 允许替换现有外壳、布局和 CSS，但必须通过现有测试与行为验收证明功能没有丢失。
- 不因为 Stitch 静态页面存在某个按钮，就删除或绕过当前已经可用的功能逻辑。
- 当功能基线与 Stitch 静态交互冲突时，保留功能语义，并用 Stitch 视觉重新表达。

## 盘点结果

- Workbench：12 份导出。
- Other：13 份导出。
- 每份导出都有 `code.html` 和 `screen.png`。
- canonical 界面：21 个。
- alternate / superseded 视觉迭代：4 个。
- 所有 HTML 都依赖 Tailwind CDN；多数依赖 Google Fonts 和 Material Symbols。
- 部分页面使用 `lh3.googleusercontent.com` 图片；生产实现必须把实际采用的图片本地化。
- 视觉方向以深色 Professional Creative Studio 为准；现有 Mirax AI Light/Dark semantic tokens 继续保留，浅色主题由同一语义层派生，不要求 Stitch 提供另一套页面。

## Canonical 页面映射

### Workbench：9 个规范界面

| ID | 工程状态 | Canonical 来源 | 实现形式 |
|---|---|---|---|
| `WB-01` | 素材解析默认态 | `Workbench/workbench_material_parsing_initial_state/` | `transcribe` 阶段默认状态 |
| `WB-02` | 素材解析处理中 | `Workbench/workbench_material_parsing_processing/` | `transcribe` 阶段 `running` 状态，不建独立路由 |
| `WB-03` | 文案改写 | `Workbench/workbench_script_rewriting_repaired_shell/` | `rewrite` 阶段面板 |
| `WB-04` | 声音克隆 | `Workbench/workbench_voice_cloning_repaired_shell_2/` | `voice-clone` 阶段面板 |
| `WB-05` | 语音合成 | `Workbench/workbench_speech_synthesis_repaired_shell/` | `speech` 阶段面板 |
| `WB-06` | 形象生成 | `Workbench/workbench_avatar_generation_v3/` | `avatar` 阶段面板 |
| `WB-07` | 视频合成 | `Workbench/workbench_video_composition_repaired/` | `compose` 阶段面板 |
| `WB-08` | 内容复核 | `Workbench/workbench_content_review_v3/` | `review` 阶段面板 |
| `WB-09` | 发布 | `Workbench/workbench_publish_visual_repair_2/` | `publish` 阶段面板 |

Workbench 共享结构：

- 固定 64–72px 全局导航 rail。
- 项目上下文顶栏。
- 8 阶段横向 stepper。
- 单一 active stage workspace，不同时展示 8 张大卡片。
- 工作区以输入/配置和产物/预览双栏为主。
- 固定底部操作栏：上一步、保存草稿、阶段主操作/下一步。
- `pending`、`running`、`needs-confirmation`、`completed`、`failed` 必须同时使用图标与文本表达。

### Assets：3 个规范界面

| ID | 页面 | Canonical 来源 | 实现形式 |
|---|---|---|---|
| `ASSET-01` | 声音库 | `Other/asset_management_voice_v3/` | 列表 + 右侧详情抽屉 |
| `ASSET-02` | 形象库 | `Other/asset_management_avatar_v3/` | 媒体网格 + 右侧详情抽屉 |
| `ASSET-03` | 素材库 | `Other/asset_management_materials_v3/` | 分类导航 + 网格/列表 + 右侧详情抽屉 |

三页复用：

- 页面标题、搜索、筛选、排序和主操作结构。
- `AssetStatus`、`AssetDetailDrawer`、危险操作确认。
- populated、empty、loading、training/processing、failed 状态。
- 从 Workbench 进入资产选择时必须保留项目与当前阶段上下文。

### Operations：2 个规范界面

| ID | 页面 | Canonical 来源 | 实现形式 |
|---|---|---|---|
| `OPS-01` | 任务中心 | `Other/task_center_v3/` | 高密度表格 + 任务详情抽屉 |
| `OPS-02` | 账号管理 | `Other/account_management_v4_repaired/` | 账号列表 + 授权/能力详情抽屉 |

### Settings：7 个规范界面

| ID | 页面 | Canonical 来源 | 实现形式 |
|---|---|---|---|
| `SET-01` | 通用 | `Other/settings_general_v3/` | 设置 section `general` |
| `SET-02` | AI 服务 | `Other/settings_ai_services_v4/` | 设置 section `ai-services` |
| `SET-03` | 本地依赖 | `Other/settings_local_dependencies_v3/` | 设置 section `local-dependencies` |
| `SET-04` | 输出与存储 | `Other/settings_output_storage_v3_repaired/` | 设置 section `output-storage` |
| `SET-05` | 提示词 | `Other/settings_prompt_templates_v3/` | 设置 section `prompt-templates` |
| `SET-06` | 数据 | `Other/settings_data_v3/` | 设置 section `data` |
| `SET-07` | 更新与支持 | `Other/settings_updates_support_v3_repaired/` | 设置 section `updates-support` |

Settings 共享结构：

- 全局导航 rail 固定，设置为 active。
- 设置本地导航固定，只有主内容滚动。
- 保存状态、危险操作确认、长路径安全显示统一。
- Provider API Key 只显示“已配置/未配置”或 mask，不进入可持久化快照。
- 第一轮没有真实后端的操作必须明确显示“不可用/待接入”，不得伪造成功。

## Alternate / Superseded 映射

| 来源 | 状态 | 使用规则 |
|---|---|---|
| `Workbench/workbench_voice_cloning_repaired_shell_1/` | 被 `..._2` 取代 | 仅补充声音列表和播放器细节 |
| `Workbench/workbench_publish_v3/` | 被 visual repair 版本取代 | 仅补充发布字段和账号文案 |
| `Workbench/workbench_publish_visual_repair_1/` | 被 `..._2` 取代 | 仅补充发布前检查与预览细节 |
| `Other/settings_updates_support_v3/` | 被 repaired 版本取代 | 仅补充更新/诊断文案 |

不得为这 4 个目录创建独立 Vue route 或复制一套共享外壳。

## Design Token 收敛

Stitch 的各页 Tailwind 配置存在轻微漂移。生产代码只保留 Mirax semantic tokens：

| 语义 | 深色基准 | 浅色策略 |
|---|---|---|
| App background | `#0b1326` / `#0f172a` 区间 | 继续使用现有 mist/paper token |
| Surface | slate/ink 分层 | 使用现有 white/warm-gray surface |
| Primary | 低饱和 pale blue / cobalt | 保持同色相，提高对比度 |
| Text | 高对比 near-white + muted slate | 深灰 + muted gray |
| Success | muted sage | 同语义，不靠颜色单独表达 |
| Warning | muted ochre | 同语义，不靠颜色单独表达 |
| Error | muted terracotta | 同语义，不靠颜色单独表达 |
| Radius | 4/6/8/12px | 两主题一致 |
| Spacing | 8px 基准 | 两主题一致 |

实现时继续扩展 `apps/desktop/src/styles.css` 中的 `--mx-*`，不要把 Stitch 的 `surface-container-*` 原样复制成第二套 token。

## 生产实现禁区

- 不添加 Tailwind 作为此次迁移的依赖。
- 不运行 `cdn.tailwindcss.com`。
- 不加载 Google Fonts；继续使用系统中文字体栈。
- 不使用 Material Symbols；继续使用 `lucide-vue-next`。
- 不使用远程 Google 图片热链；采用的示例媒体必须保存到本地。
- 不把静态 HTML 中的假按钮当作已实现功能。
- 不让 UI 直接调用模型、FFmpeg、Playwright、Python、CosyVoice 或 HeyGem。
- 不修改 `docs/reverse-engineering/legacy-ui-gap-list.md` 状态列。

## 视觉验收矩阵

每个 canonical 界面至少检查：

- 1440×900 主视口。
- 1280×800 最小桌面视口。
- Dark 和 Light 两个主题。
- 中文无裁切、路径不撑破容器、无横向滚动。
- 空、加载/处理中、成功、失败或禁用状态中与页面相关的至少三种状态。
- 抽屉和弹窗有 Close、Cancel、Confirm；危险操作需要确认。
- 页面截图与 canonical `screen.png` 并排比较，检查外壳、列宽、密度、间距、字号、边框、圆角和预览比例。
