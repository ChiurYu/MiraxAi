# Mirax AI

Mirax AI 是对旧版「轻语 IP 智能体」的桌面端重构项目。

当前第一阶段聚焦演示视频里已经确认的短视频生产流程：

1. 导入或提取对标视频内容。
2. 使用用户自行配置的 AI 服务生成仿写文案。
3. 选择声音样本和数字人资产。
4. 生成竖屏口播视频预览。
5. 准备标题、封面、描述、标签和话题。
6. 选择发布账号并交给平台发布模块处理。

大型逆向分析输入不会进入 Git，包括 DMG、操作视频、解包后的 ASAR 内容和抽帧图片。

## 开发命令

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm --filter @mirax/desktop dev:web
pnpm --filter @mirax/desktop build
```

桌面端当前默认打包为 macOS `.app`，DMG 打包后续会在签名、镜像样式和分发流程确定后单独开启。
