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
| RB-PUBLISH-001 | platform-rule | PAGE-ACCOUNT-MANAGEMENT、FC-ASSET-MANAGEMENT | EV-RUNTIME-140 | 在账号管理页点击「添加账号」 | 页面提示「已登录成功的账号才会在发布时可以选择」，当前「暂无账号」 | 检查旧包中平台账号表结构、授权窗口和浏览器 profile 调用 | Mirax AI 第一版先支持 mock 账号和 mock publisher；真实平台授权后续通过 Playwright sidecar 实现 | no |
| RB-PUBLISH-002 | platform-rule | PAGE-PUBLISH-FLOW、FC-PUBLISH-PREP | EV-RUNTIME-020、EV-RUNTIME-140 | 在首页第 7 步点击「立即发布」 | 当前无可用发布账号，发布账号下拉框可能为空 | 检查发布任务创建逻辑、平台 API 或浏览器自动化入口 | Mirax AI 第一版用 mock publisher 跑通任务状态，不执行真实平台发布 | no |
| RB-PUBLISH-003 | unknown | PAGE-PUBLISH-FLOW、FC-PUBLISH-PREP | EV-RUNTIME-020 | 点击「立即发布」后是否出现独立确认页 | 截图未展示发布前确认页 | 阶段 2 静态分析检查首页到发布任务的调用链和弹窗路由 | Mirax AI 第一版先在首页卡片内完成发布准备；如确认存在独立确认页，再增加确认步骤 | no |
