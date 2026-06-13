# 资产索引

本文记录证据资产的位置，以及这些资产是否允许进入 Git。

大型逆向资产不要进入 Git，包括 DMG、完整录屏、解包 ASAR、模型文件、大型资源目录和批量抽帧图片。

小体积截图只有在文档确实需要时才进入 Git。截图应放在 `docs/reverse-engineering/assets/screenshots/`，并同时登记到本文和 `evidence-index.md`。

## 资产规则

| 资产类型 | Git 策略 | 存放规则 |
| --- | --- | --- |
| DMG 或安装包 | 不提交 | 只记录本机路径或外部存储位置。 |
| 完整录屏 | 不提交 | 记录本机路径、外部存储位置、时长和关联证据 ID。 |
| 解包 ASAR 或 App bundle | 不提交 | 只记录本机路径和摘要。 |
| 模型文件或大型二进制资源 | 不提交 | 只记录本机路径和摘要。 |
| 批量抽帧图片 | 不提交 | 只记录本机路径和帧范围摘要。 |
| 小体积截图 | 需要时可提交 | 放在 `docs/reverse-engineering/assets/screenshots/`，命名格式为 `YYYY-MM-DD-page-or-feature-brief.png`。 |
| 小段文本摘录或生成摘要 | 可提交 | 放在相关 Markdown 记录中。 |

## 记录

| 资产 ID | 证据 ID | 资产类型 | Git 策略 | 路径或外部位置 | 摘要 | 关联记录 | 日期 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ASSET-DOC-001 | EV-DOC-001 | Markdown 文档 | 已跟踪 | `docs/reverse-engineering/demo-video-timeline.md` | 现有演示视频时间轴。 | `docs/reverse-engineering/evidence-index.md` | 2026-06-13 |
| ASSET-DOC-002 | EV-DOC-002 | Markdown 文档 | 已跟踪 | `docs/reverse-engineering/demo-video-coverage.md` | 现有演示覆盖矩阵。 | `docs/reverse-engineering/evidence-index.md` | 2026-06-13 |
| ASSET-DOC-003 | EV-DOC-003 | Markdown 文档 | 已跟踪 | `docs/reverse-engineering/legacy-ui-gap-list.md` | 现有旧版 UI 差距清单。 | `docs/reverse-engineering/evidence-index.md` | 2026-06-13 |
| ASSET-DOC-004 | EV-DOC-004 | Markdown 设计文档 | 已跟踪 | `docs/superpowers/specs/2026-06-13-mirax-evidence-driven-roadmap-design.md` | 当前证据驱动路线图设计。 | `docs/reverse-engineering/evidence-index.md` | 2026-06-13 |
