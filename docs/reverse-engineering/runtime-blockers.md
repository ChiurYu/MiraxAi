# 运行障碍记录

本文记录巡检旧版 App 时遇到的访问限制和执行限制。

运行障碍不是绕过任务。这里记录的是：什么被挡住、仍然能看到什么、哪些证据支持这个观察，以及 Mirax AI 应如何替代或重新设计这项能力。

## 障碍类型

| 类型 | 含义 |
| --- | --- |
| login | 需要登录或账号会话。 |
| activation | 激活、许可证、会员或权益限制阻止执行。 |
| cloud-service | 旧云端 API、托管资源或后端服务不可用或受限。 |
| model | AI、声音、数字人、ASR 或渲染模型不可用或未配置。 |
| platform-rule | 平台登录、平台规则、浏览器自动化或发布规则导致流程无法完成。 |
| local-dependency | 本地 FFmpeg、Python 服务、浏览器、模型文件或 App 运行依赖缺失。 |
| unknown | App 显示了阻碍，但类型尚不明确。 |

## 记录

| 障碍 ID | 类型 | 关联页面或功能 | 证据 ID | 触发方式 | 可见信息 | 静态补证方向 | Mirax AI 替代方案 | 是否阻塞当前阶段 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| RB-HOME-001 | login | PAGE-HOME-WORKBENCH、整体应用 | EV-RUNTIME-001 | 启动旧版 App，自动登录失败 | 登录页提示「登录已过期或权限不足，请重新登录」 | 检查本地数据库中账号/Token 表结构和登录流程 | Mirax AI 第一版不强制云端登录，本地 mock 流程优先 | no |
| RB-HOME-002 | activation | PAGE-HOME-WORKBENCH、完整功能 | EV-RUNTIME-001 | 启动旧版 App 后弹出激活弹窗 | 弹窗提示「请输入激活码激活会员以使用完整功能」 | 检查激活校验逻辑和会员权益配置 | Mirax AI 第一版不做激活码限制，仅通过本地依赖检查控制功能可用性 | no |
| RB-PUBLISH-001 | platform-rule | PAGE-ACCOUNT-MANAGEMENT、FC-ASSET-MANAGEMENT | EV-RUNTIME-140、EV-STATIC-102 | 在账号管理页点击「添加账号」 | 页面提示「已登录成功的账号才会在发布时可以选择」，当前「暂无账号」 | 检查旧包中平台账号表结构、授权窗口和浏览器 profile 调用（见 `SA-ACCOUNTS-AUTH.md`） | Mirax AI 第一版先支持 mock 账号和 mock publisher；真实平台授权后续通过 Playwright sidecar 实现 | no |
| RB-PUBLISH-002 | platform-rule | PAGE-PUBLISH-FLOW、FC-PUBLISH-PREP | EV-RUNTIME-020、EV-RUNTIME-140、EV-STATIC-002 | 在首页第 7 步点击「立即发布」 | 当前无可用发布账号，发布账号下拉框可能为空 | 检查发布任务创建逻辑、平台 API 或浏览器自动化入口（见 `SA-PUBLISH-FLOW.md`） | Mirax AI 第一版用 mock publisher 跑通任务状态，不执行真实平台发布 | no |
| RB-PUBLISH-003 | unknown | PAGE-PUBLISH-FLOW、FC-PUBLISH-PREP | EV-RUNTIME-020、EV-STATIC-002 | 点击「立即发布」后是否出现独立确认页 | 截图未展示发布前确认页 | 阶段 2 静态分析已检查首页到发布任务的调用链和弹窗路由（见 `SA-PUBLISH-FLOW.md`）；`preload.js` 仅暴露单一 `publish:publish-video` IPC 入口，renderer 字符串未发现独立确认页组件 | Mirax AI 第一版先在首页卡片内完成发布准备；如后续运行态发现确认弹窗，再增加确认步骤 | no |
| RB-ASSET-001 | model / local-dependency | PAGE-VOICE-MANAGEMENT、FC-ASSET-MANAGEMENT | EV-RUNTIME-100、EV-STATIC-100 | 在声音管理页点击「开始训练」「生成语音」或声音卡片播放按钮 | 页面展示了上传/训练/合成/试听入口，但真实声音克隆与合成需要模型服务（CosyVoice）和音频播放能力；截图未展示训练结果、试听弹窗或生成产物 | 检查旧包中 CosyVoice / 语音合成 API 调用、音频文件存储和试听播放器实现（见 `SA-VOICE-AVATAR.md`） | Mirax AI 第一版在 `@mirax/provider-ai` 使用 mock voice-clone / speech 跑通流程；真实能力后续通过 sidecar CosyVoice 实现 | no |
| RB-ASSET-002 | model / local-dependency | PAGE-AVATAR-MANAGEMENT、FC-ASSET-MANAGEMENT | EV-RUNTIME-110、EV-STATIC-100 | 在形象管理页点击「保存形象」或上传视频 | 页面展示了视频上传和形象库入口，但真实数字人训练需要模型服务（HeyGem）和视频处理能力 | 检查旧包中数字人训练服务调用、视频预处理、训练状态展示和封面提取逻辑（见 `SA-VOICE-AVATAR.md`） | Mirax AI 第一版使用 mock avatar 生成；真实训练能力后续通过 sidecar HeyGem 实现 | no |
| RB-ASSET-003 | local-dependency / cloud-service | PAGE-MATERIALS、FC-ASSET-MANAGEMENT | EV-RUNTIME-120、EV-STATIC-101 | 在素材管理页点击「上传视频或图片」「新建分类」 | 当前素材库为空（0），上传后的抽帧、标记、向量化等处理流程未在截图中展示 | 检查旧包中素材表结构、分类管理、FFmpeg 抽帧、向量化服务和搜索索引实现（见 `SA-MATERIALS-TASKS.md`） | Mirax AI 第一版先支持本地文件上传、分类和文件名搜索；向量化与高级标签延后 | no |
| RB-ASSET-004 | cloud-service / local-dependency | PAGE-TASK-CENTER、FC-ASSET-MANAGEMENT | EV-RUNTIME-130、EV-STATIC-101 | 在任务中心点击「新建任务」「刷新」或任务操作按钮 | 当前任务中心为空（0），任务状态流转、进度更新、失败原因、重试入口未在截图中验证 | 检查旧包中任务表、状态机、错误处理、产物路径和重试逻辑（见 `SA-MATERIALS-TASKS.md`） | Mirax AI 第一版用 mock 任务状态跑通 workflow 8 个阶段；真实执行后续逐步替换 | no |
| RB-ASSET-005 | platform-rule | PAGE-ACCOUNT-MANAGEMENT、FC-ASSET-MANAGEMENT | EV-RUNTIME-140、EV-STATIC-102 | 在账号管理页点击「添加账号」 | 页面提示「已登录成功的账号才会在发布时可以选择」，当前「暂无账号」；授权弹窗、浏览器 profile、二维码登录等流程截图未展示 | 检查旧包中平台账号表结构、授权窗口、浏览器 profile 调用和 Token 存储（见 `SA-ACCOUNTS-AUTH.md`） | Mirax AI 第一版先支持 mock publisher 账号；真实平台授权后续通过 Playwright sidecar 实现 | no |
| RB-SECONDARY-001 | cloud-service / local-dependency | PAGE-SECONDARY-ENTRYPOINTS、FC-PROVIDER-SETTINGS | EV-RUNTIME-010、EV-RUNTIME-200、EV-STATIC-200 | 在设置页点击「软件更新」标签或检查更新按钮 | 「软件更新」入口可见；静态分析确认 `cloud.checkVersion` / `downloadUpdate` / `applyUpdate` IPC 和 `cloud:progress` 进度事件；UI 文案含「发现新版本」「当前已是最新版本」「立即更新」「更新地址无效」等 | 旧包静态分析已确认更新 IPC 与文案；`updateUrl` 校验逻辑和远端服务器地址在 `main.jsc` 中未解出（见 `SA-SECONDARY-ENTRYPOINTS.md`） | Mirax AI 第一版手动更新；后续通过 Tauri 2 Updater 实现自动更新；更新包签名验证延后 | no |
| RB-SECONDARY-002 | cloud-service | PAGE-SECONDARY-ENTRYPOINTS、FC-PROVIDER-SETTINGS | EV-RUNTIME-010、EV-RUNTIME-200、EV-STATIC-200 | 点击顶部「出现错误？点击此处上报日志」按钮 | 按钮可见；静态分析确认 `file.uploadTodayLog` 接口和「日志上报成功」提示；`logger.*` 分级日志通道存在 | 旧包静态分析已确认日志上传 IPC 与文案；目标服务端点与认证方式在 `main.jsc` 中未解出（见 `SA-SECONDARY-ENTRYPOINTS.md`） | Mirax AI 第一版先支持本地日志导出/复制；云端上传通道待明确服务端点后实现 | no |
| RB-SECONDARY-003 | local-dependency | PAGE-SECONDARY-ENTRYPOINTS、FC-PROVIDER-SETTINGS | EV-RUNTIME-010、EV-RUNTIME-200、EV-STATIC-200 | 在设置页点击「数据设置」标签 | 「数据设置」入口可见；静态分析确认 `data.databaseUrl`、`db.backup/restore` 和 `file.clearCache` IPC；UI 文案含「缓存清除成功」「数据重置成功」等 | 旧包静态分析已确认数据设置 IPC、字段与文案；`config` 持久化文件格式和加密方式未确认（见 `SA-SECONDARY-ENTRYPOINTS.md`） | Mirax AI 第一版通过 `@mirax/local-store` 管理 SQLite 和输出目录；备份/恢复/缓存清理 UI 后续补齐；数据库迁移由 `@mirax/local-store` schema 管理 | no |
| RB-SECONDARY-004 | unknown | PAGE-SECONDARY-ENTRYPOINTS | EV-RUNTIME-001、EV-RUNTIME-200、EV-STATIC-200 | 点击左侧导航「帮助」 | 「帮助」导航项可见；静态分析发现 `FeatureGuide` 分步引导和外部飞书 Wiki 链接，未发现独立帮助页组件 | 旧包静态分析已确认 `FeatureGuide` 和 `openExternalLink` 外部链接；无法确定默认触发的是引导还是外部 Wiki（见 `SA-SECONDARY-ENTRYPOINTS.md`） | Mirax AI 第一版先提供本地帮助 / FAQ 占位；在线文档后续补充；FeatureGuide 形式的工作量较大，排期延后 | no |
| RB-SECONDARY-005 | local-dependency | PAGE-SECONDARY-ENTRYPOINTS、FC-HOME-PIPELINE、FC-ASSET-MANAGEMENT | EV-RUNTIME-200、EV-STATIC-003、EV-STATIC-200 | 在模型设置或 workflow 运行前检测到 FFmpeg、Python 服务、HeyGem、CosyVoice、Playwright 浏览器缺失 | 未在截图中直接观察到；静态分析确认 `python.getStatus` / `checkModuleExists` IPC，模块名 `asrModule`、`voiceCloneModule`、`humanModule`/`hdModule`；UI 文案含「检查服务模块失败」「服务模块不存在」「未找到声音合成服务模块」等 | 旧包静态分析已确认依赖检查接口与模块名；各模块二进制/模型文件具体路径和启动命令在 `main.jsc` 中未解出（见 `SA-SECONDARY-ENTRYPOINTS.md`） | Mirax AI 第一版通过 `@mirax/sidecar-manager` 在设置页和 workflow 运行前做依赖检查并给出处理建议；真实服务启动后续实现 | no |
