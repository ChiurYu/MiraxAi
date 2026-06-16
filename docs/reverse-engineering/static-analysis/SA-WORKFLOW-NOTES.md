# SA-WORKFLOW-NOTES：阶段 2 解包与搜索笔记

## DMG 信息

| 字段 | 值 |
| --- | --- |
| 原始路径 | `/Users/yuzhenzhao/code/ai/轻语IP智能体-5.0.0-苹果芯片.dmg` |
| 挂载点 | `/var/folders/v6/lcn064ss0b1cmtzb5976253w0000gn/T/tmp.3G360mpSkh` |
| App bundle | `/var/folders/v6/lcn064ss0b1cmtzb5976253w0000gn/T/tmp.3G360mpSkh/轻语IP智能体.app` |
| ASAR 路径 | `/var/folders/v6/lcn064ss0b1cmtzb5976253w0000gn/T/tmp.3G360mpSkh/轻语IP智能体.app/Contents/Resources/app.asar` |
| 解包目录 | `/var/folders/v6/lcn064ss0b1cmtzb5976253w0000gn/T/tmp.zsAhZGm6gh` |

## 解包目录结构摘要

- `package.json`：应用名 `aigc-human`，版本 `5.0.0`，主入口 `electron/main/main.js`。
- `electron/main/main.js` / `main.jsc`：主进程脚本（同时存在源码与 bytenode 编译产物）。
- `electron/main/preload.js`：preload 脚本。
- `electron/renderer/dist/`：前端构建产物，含 `index.html` 和 `static/`。
- `electron/config/oem/`：OEM 配置文件（`oem-config.json`、`current-oem.json` 等）。
- `node_modules/`：依赖目录，包含 `playwright-core`、`sharp`、`better-sqlite3`、`openai`、`chromadb`、`cos-nodejs-sdk-v5`、`fontkit`、`wavesurfer.js` 等。

## 搜索命令备忘

```bash
# 发布相关
rg -i "publish|发布|立即发布|publishMode|publishAccount|platform|抖音|小红书|快手|视频号|bilibili|draft" "$EXTRACT_DIR"

# 账号/授权相关
rg -i "account|账号|login|授权|cookie|token|profile" "$EXTRACT_DIR"

# 声音/形象相关
rg -i "voice|声音|clone|克隆|cosy|speech|tts|avatar|形象|heygem|digital" "$EXTRACT_DIR"

# 素材/任务相关
rg -i "material|素材|task|任务|ffmpeg|frame|vector|embedding" "$EXTRACT_DIR"

# 设置/依赖相关
rg -i "setting|设置|update|更新|log|日志|ffmpeg|python|dependency" "$EXTRACT_DIR"
```

## 注意事项

- 上方挂载点、ASAR 路径和解包目录为 Task 2 当次执行记录；临时目录已清理，后续任务需重新只读挂载 DMG 并重新解包。
- 解包目录不提交到 Git。
- 只在 Markdown 中记录摘要、路径和发现。
- 遇到疑似个人数据、Token、密钥只记录存在性，不复制原文。
