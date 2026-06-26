import type { PlatformProfile } from "./types.js";

/**
 * 桌面端 MVP 支持的发布平台画像。
 *
 * 以下限制基于公开文档与旧版演示观察，仅作为前端校验与错误提示参考：
 * - `supportsDraftMode` / `supportsDirectMode` 表示平台是否支持草稿或直接发布；
 * - `authorization` 仅做文档说明，真实授权流程（OAuth / 二维码 / Cookie 导入）属于运行障碍，后续 Task 实现；
 * - `maxDurationSeconds` / `maxFileSizeMb` 为常见上限，真实发布前应由 Publisher 重新校验。
 */
export const SUPPORTED_PLATFORM_PROFILES: PlatformProfile[] = [
  {
    id: "douyin",
    label: "抖音",
    titleMaxLength: 55,
    descriptionMaxLength: 2200,
    supportsDraftMode: true,
    supportsDirectMode: true,
    authorization: "oauth",
    maxDurationSeconds: 60 * 60, // 1 小时
    maxFileSizeMb: 4096,
  },
  {
    id: "xiaohongshu",
    label: "小红书",
    titleMaxLength: 20,
    descriptionMaxLength: 1000,
    supportsDraftMode: true,
    supportsDirectMode: true,
    authorization: "qr",
    maxDurationSeconds: 10 * 60, // 10 分钟
    maxFileSizeMb: 1024,
  },
  {
    id: "kuaishou",
    label: "快手",
    titleMaxLength: 50,
    descriptionMaxLength: 500,
    supportsDraftMode: true,
    supportsDirectMode: true,
    authorization: "oauth",
    maxDurationSeconds: 10 * 60,
    maxFileSizeMb: 2048,
  },
  {
    id: "shipinhao",
    label: "视频号",
    titleMaxLength: 30,
    descriptionMaxLength: 1000,
    supportsDraftMode: false,
    supportsDirectMode: true,
    authorization: "unknown",
    maxDurationSeconds: 30 * 60,
    maxFileSizeMb: 1024,
  },
  {
    id: "bilibili",
    label: "Bilibili",
    titleMaxLength: 80,
    descriptionMaxLength: 2000,
    supportsDraftMode: true,
    supportsDirectMode: true,
    authorization: "cookie",
    maxDurationSeconds: 12 * 60 * 60, // 12 小时
    maxFileSizeMb: 8192,
  },
];
