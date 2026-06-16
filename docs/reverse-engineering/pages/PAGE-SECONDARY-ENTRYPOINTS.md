# PAGE-SECONDARY-ENTRYPOINTS：辅助入口与边缘状态

## 身份信息

| 字段 | 值 |
| --- | --- |
| 页面 ID | PAGE-SECONDARY-ENTRYPOINTS |
| 页面名称 | 辅助入口与边缘状态 |
| 旧版入口路径 | 全局左侧导航「帮助」、设置页子导航「软件更新 / 数据设置 / 提示词管理」、顶部用户下拉与错误日志上传按钮、启动时的登录 / 激活弹窗 |
| 巡检优先级 | P2 |

## 证据

| 字段 | 值 |
| --- | --- |
| 证据 ID | EV-RUNTIME-200、EV-STATIC-003、EV-STATIC-200 |
| 最高证据等级 | E3 |
| 可信度 | medium |
| 关联资产 | `docs/截图/首页.png`（可见「帮助」导航项、用户下拉、模式标签）；`docs/截图/设置.png`（可见「软件更新」「数据设置」「提示词管理」子导航与「上传日志」按钮）；`docs/reverse-engineering/static-analysis/SA-SECONDARY-ENTRYPOINTS.md` |

## 页面区域

| 区域 | 可见内容 | 备注 |
| --- | --- | --- |
| 全局左侧导航 | 除首页 / 形象管理 / 素材管理 / 创作管理 / 任务中心 / 账号管理 / 设置 外，底部还有「帮助」入口 | 在 `docs/截图/首页.png` 中可见；静态字符串显示可能触发 `FeatureGuide` 分步引导或打开外部文档链接 |
| 设置页子导航 | 常规设置、模型设置、提示词管理、数据设置、软件更新 | 对应 `config` 分类 `general` / `model` / `prompts` / `data` / `update`，详见 `SA-SECONDARY-ENTRYPOINTS.md` |
| 顶部全局栏 | 应用标题「轻语 IP」、汉堡菜单、用户下拉「chur」带 VIP 图标、错误日志上传按钮 | 用户下拉可能包含账号 / 退出等低频入口；截图未展开；日志按钮文案为「出现错误点击此处上报日志」 |
| 启动拦截页 | 登录页提示「登录已过期或权限不足，请重新登录」 | 属于启动边缘状态，会挡住首页 |
| 启动拦截弹窗 | 激活会员弹窗提示「请输入激活码激活会员以使用完整功能」 | 属于启动边缘状态，与登录页同时出现 |
| 空状态页 | 素材管理、任务中心、账号管理等列表为空时显示「0」或「暂无账号」占位 | 已在对应 P1 页面卡中记录，此处作为边缘状态汇总 |

## 可见控件

| 控件 | 类型 | 启用状态 | 观察到的行为 |
| --- | --- | --- | --- |
| 帮助 导航项 | nav-item | 启用 | 点击后可能触发 `FeatureGuide` 分步引导或打开外部飞书 Wiki；未观察到独立帮助页组件 |
| 软件更新 标签 | tab | 未选中 | 点击后展示当前版本、检查更新、下载/应用更新；通过 `cloud.checkVersion` / `downloadUpdate` / `applyUpdate` 实现 |
| 数据设置 标签 | tab | 未选中 | 点击后展示本地数据库路径、备份/恢复、清除缓存、重置数据；通过 `db.backup/restore`、`file.clearCache` 实现 |
| 提示词管理 标签 | tab | 未选中 | 点击后展示标题/文案提示词模板；支持新增/编辑/删除/设置当前提示词 |
| 用户下拉 | dropdown | 启用 | 显示用户名和 VIP 图标，点击后可能展开账号 / 退出等入口 |
| 出现错误？点击此处上传日志 按钮 | button | 启用 | 点击后调用 `file.uploadTodayLog`；成功提示「日志上报成功」 |
| 界面主题 下拉框 | select | 启用 | 当前值为「默认主题」，属于常规设置中的低频偏好项；字段 `themeName` |
| 统一输出根目录 选择按钮 | button | 启用 | 打开目录选择器，影响音频 / 视频 / 封面 / 草稿输出位置；默认在文稿目录下生成 `outputs` 子目录 |

## 表单字段

| 字段 | 输入类型 | 默认值或示例值 | 校验或帮助文案 |
| --- | --- | --- | --- |
| 界面主题 | select | 默认主题 | 切换应用配色主题，更换后立即生效；对应 `general.themeName` |
| 运行模式 | radio | `local` | `local` 优先使用本机能力，`cloud` 调用远程 API；对应 `general.runMode` |
| AI 算力来源 | radio | `platform` | `platform` 使用平台 AI 服务，`custom` 使用自有 API Key / Base URL；对应 `ai.source` |
| API Key / Base URL | text | 空字符串 | 仅当 `ai.source=custom` 时展示；对应 `ai.apiKey` / `ai.baseURL` |
| 统一输出根目录 | text + 目录选择按钮 | `~/Documents/outputs` | 选择一个根目录后，系统自动生成 `audios` / `videos` / `drafts` / `exports` / `thumbs` 子目录；对应 `paths.baseOutput` |
| 标题生成模型 | select | `Qwen2.5-7B-Instruct` | 对应 `titleModel.model` |
| 翻译/改写模型 | select | `meta-llama/Llama-3.3-70B-Instruct` | 对应 `translation.model` |
| 数字人模型版本 | select | `V1` | 对应 `digitalHuman.modelVersion` |
| 声音合成高性能模式 | toggle | false | 对应 `voiceClone.highPerformance` |
| 当前版本 | text（只读） | `5.0.0`（来自 `Info.plist` / `file:get-app-info`） | 软件更新面板中展示 |
| 本地数据库路径 | text + 目录选择按钮 | `~/Library/Application Support/.../data/aigc_human.db`（推断） | 对应 `data.databaseUrl` |
| 缓存清理按钮 | button | N/A | 调用 `file.clearCache` 一键清理临时文件和素材缓存 |
| 数据备份/恢复按钮 | button | N/A | 调用 `db.backup` / `db.restore` |

## 弹窗与提示

| 触发方式 | 弹窗或提示 | 操作按钮 | 结果 |
| --- | --- | --- | --- |
| 启动 App 时 token 失效 | 登录页提示「登录已过期或权限不足，请重新登录」 | 登录 / 注册 / 忘记密码 | 需要账号登录才能进入首页 |
| 启动 App 时未激活会员 | 弹窗提示「请输入激活码激活会员以使用完整功能」 | 取消 / 激活 | 需要激活码才能使用完整功能 |
| 点击「出现错误？点击此处上传日志」 | 调用 `file.uploadTodayLog`；成功后提示「日志上报成功」 | 复制日志编号 / 关闭 | 将今日日志发送给支持方（具体服务端点未解出） |
| 点击「软件更新」标签后检查更新 | 展示 `latestVersion`、`updateUrl`、`hasUpdate`；支持「立即更新」「下载中…」「应用更新」 | 检查更新 / 立即更新 / 稍后 | 通过 `cloud.downloadUpdate` / `applyUpdate` 下载并应用更新包 |
| 本地依赖缺失或路径错误 | 在模型设置或 workflow 运行前提示「检查服务模块失败」「未找到声音合成服务模块…」 | 去设置 / 忽略 | 提示用户安装或配置 FFmpeg、Python 服务、asrModule、voiceCloneModule、humanModule/hdModule 等 |
| 点击「清除缓存」 | 提示「缓存清除成功，释放空间 …」 | 确认 | 调用 `file.clearCache` 清理临时文件 |
| 点击「重置所有数据」 | 二次确认「确定要重置所有数据吗？此操作不可恢复！」 | 确认 / 取消 | 清空本地数据库与配置，提示「数据重置成功」 |

## 状态变化

| 操作 | 操作前 | 操作后 | 证据 ID |
| --- | --- | --- | --- |
| 启动 App | 应用启动 | token 失效时进入登录页并弹出激活弹窗 | EV-RUNTIME-001 |
| 点击左侧「帮助」 | 当前页面 | 触发 `FeatureGuide` 分步引导或打开外部飞书 Wiki | EV-RUNTIME-200、EV-STATIC-200 |
| 切换设置子标签到「软件更新」 | 常规设置面板 | 软件更新面板，可检查/下载/应用更新 | EV-RUNTIME-010、EV-STATIC-003、EV-STATIC-200 |
| 切换设置子标签到「数据设置」 | 常规设置面板 | 数据设置面板，可备份/恢复/清理/重置 | EV-RUNTIME-010、EV-STATIC-003、EV-STATIC-200 |
| 切换设置子标签到「提示词管理」 | 常规设置面板 | 提示词管理面板，可管理标题/文案提示词 | EV-RUNTIME-010、EV-STATIC-003、EV-STATIC-200 |
| 点击用户下拉 | 折叠状态 | 展开菜单（具体项未观察） | EV-RUNTIME-001、EV-RUNTIME-200 |
| 列表为空 | 加载中 | 显示空状态占位（如「0」「暂无账号」） | EV-RUNTIME-120 / EV-RUNTIME-130 / EV-RUNTIME-140 |

## 可执行动作

| 动作 | 结果 | 关联功能卡 |
| --- | --- | --- |
| 打开帮助页 | 触发 FeatureGuide 或打开外部飞书 Wiki | N/A |
| 打开软件更新面板 | 查看当前版本、检查更新、下载并应用更新 | FC-PROVIDER-SETTINGS |
| 打开数据设置面板 | 管理本地数据库路径、备份/恢复、缓存清理、重置数据 | FC-PROVIDER-SETTINGS |
| 打开提示词管理面板 | 管理标题/文案提示词模板 | FC-PROVIDER-SETTINGS |
| 点击上传日志按钮 | 调用 `file.uploadTodayLog` 上报日志 | FC-PROVIDER-SETTINGS |
| 切换界面主题 | 改变应用配色主题 | FC-PROVIDER-SETTINGS |
| 选择统一输出根目录 | 更新所有派生输出路径 | FC-PROVIDER-SETTINGS |
| 切换运行模式 / AI 算力来源 | 控制本地服务与云端 API 的使用方式 | FC-PROVIDER-SETTINGS |

## 受限动作

| 动作 | 障碍 | 运行障碍 ID |
| --- | --- | --- |
| 查看帮助具体内容 | 未登录 / 未激活状态下，部分在线帮助或支持页面可能受限；静态字符串显示存在 FeatureGuide 与外部 Wiki 两种可能 | RB-SECONDARY-004 |
| 检查 / 下载软件更新 | 需要网络连接和远端更新服务；`updateUrl` 校验逻辑在 `main.jsc` 中未解出 | RB-SECONDARY-001 |
| 上传日志 / 提交反馈 | 需要网络连接和支持服务端点；具体上传 API 在 `main.jsc` 中未解出 | RB-SECONDARY-002 |
| 导入 / 导出数据、清理缓存 | 需要本地文件系统权限；旧版通过 `db.backup/restore` + `file.clearCache` 实现 | RB-SECONDARY-003 |
| 进入真实更新安装流程 | 需要管理员权限、签名验证和旧版激活状态 | RB-SECONDARY-001 |
| 触发依赖缺失提示后的自动修复 | 需要本地安装 FFmpeg、Python 服务、asrModule、voiceCloneModule、humanModule/hdModule、Playwright 浏览器等依赖 | RB-SECONDARY-005 |

## 关联功能卡

- [FC-PROVIDER-SETTINGS](../function-cards/FC-PROVIDER-SETTINGS.md)

## 待确认问题

- 「关于」入口在哪里？是在用户下拉菜单、macOS 应用菜单，还是隐藏在其他位置？当前截图与静态字符串均未展示独立的「关于」页面。
- 「退出登录」「退出应用」等低频入口是否在用户下拉或应用菜单中？
- 「帮助」导航项最终是触发 `FeatureGuide` 还是打开外部飞书 Wiki？
- 软件更新远端服务器地址、`updateUrl` 校验与签名逻辑未解出。
- 日志上传的目标服务端点与认证方式未解出。
- `config` IPC 在 `main.jsc` 中的持久化文件格式和加密方式未确认。
