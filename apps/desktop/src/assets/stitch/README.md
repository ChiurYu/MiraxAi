# Stitch 示例媒体本地化

本目录存放从 canonical Stitch 导出中实际使用到的示例图片，已替换为本地资源，避免桌面端依赖外部图片热链。

所有图片仅用于 UI 示例、占位和视觉回归测试，**不进入生产内容库**。

## 目录结构

```
apps/desktop/src/assets/stitch/
├── README.md
├── avatars/     # 数字人形象相关示例
├── materials/   # 素材库示例
└── voices/      # 声音库示例
```

## 来源追踪

完整来源映射（含原始远程地址、canonical HTML、用途、下载状态）见：

```
docs/design-source/stitch-asset-sources.json
```

简要清单如下：

| 文件 | 来源 canonical HTML | 用途 | 状态 |
|---|---|---|---|
| `avatars/qinghe-thumb.jpg` | `Workbench/workbench_avatar_generation_v3` | 形象生成阶段顶部已选形象缩略图（清禾） | 已下载 |
| `avatars/qinghe-newsroom.jpg` | `Workbench/workbench_avatar_generation_v3` | 形象生成阶段 9:16 预览背景 / 数字人视频帧 | 已下载 |
| `avatars/xialan-greenscreen.jpg` | `Workbench/workbench_avatar_generation_v3` | 形象候选（夏岚｜绿幕） | 已下载 |
| `avatars/chenyu-office.jpg` | `Workbench/workbench_avatar_generation_v3` | 形象候选（陈屿｜商务空间） | 已下载 |
| `avatars/linxi-park.jpg` | `Workbench/workbench_avatar_generation_v3` | 形象候选（林溪｜自然场景 / 训练中） | 已下载 |
| `avatars/avatar-prompt-texture.jpg` | `Workbench/workbench_avatar_generation_v3` | 预览区提示词水印纹理背景 | 已下载 |
| `avatars/user-profile-dark.jpg` | `Other/asset_management_avatar_v3` | 形象库页面顶部栏用户头像 | 已下载 |
| `avatars/qinghe-studio-v2.jpg` | `Other/asset_management_avatar_v3` / `Workbench/workbench_content_review_v3` | 形象库详情预览 / 内容复核封面候选 | 语义等价替代 |
| `avatars/xialan-greenscreen-v1.jpg` | `Other/asset_management_avatar_v3` | 形象库列表项（夏岚｜绿幕 V1） | 语义等价替代 |
| `avatars/chenyu-business-v2.jpg` | `Other/asset_management_avatar_v3` | 形象库列表项（陈屿｜商务空间 V2） | 语义等价替代 |
| `materials/user-profile-materials.jpg` | `Other/asset_management_materials_v3` | 素材库页面顶部栏用户头像 | 已下载 |
| `materials/summer-commute-reference-cover.jpg` | `Other/asset_management_materials_v3` | 夏季通勤参考视频封面 / 详情预览 | 已下载 |
| `materials/qinghe-studio-source-cover.jpg` | `Other/asset_management_materials_v3` | 清禾演播室源视频封面 | 已下载 |
| `materials/summer-outfit-cover-01.jpg` | `Other/asset_management_materials_v3` | 夏季穿搭封面候选 01 | 已下载 |
| `materials/city-street-transition-cover.jpg` | `Other/asset_management_materials_v3` | 城市街景转场视频封面 | 已下载 |
| `materials/fabric-texture-detail.jpg` | `Other/asset_management_materials_v3` | 通勤穿搭细节图 | 已下载 |
| `voices/user-profile-voice.jpg` | `Other/asset_management_voice_v3` | 声音库页面顶部栏用户头像 | 已下载 |

## 说明

- `aida-public` 路径的图片均直接下载成功。
- 3 条 `aida/` 路径（非公开）的图片在脚本中返回 `403 Forbidden`，无法直接下载。为保持本地资源完整且语义一致，使用同一 canonical 页面中同角色、同场景的已下载图片作为替代。详见 `docs/design-source/stitch-asset-sources.json` 中 `status: fallback` 条目。
- 所有文件保存在 `apps/desktop/src/assets/stitch/` 下，组件中应通过相对路径或 `new URL(..., import.meta.url)` 引用，不再使用远程图片链接。

## 验证

```bash
# 确认源码目录中已无外部图片热链及指定 CDN 引用
rg -n 'googleuser' apps/desktop/src
# 更完整的扫描模式参见项目 Task 9 验收清单
```
