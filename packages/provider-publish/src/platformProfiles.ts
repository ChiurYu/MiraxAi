import type { PlatformProfile } from "./types.js";

export const SUPPORTED_PLATFORM_PROFILES: PlatformProfile[] = [
  {
    id: "douyin",
    label: "抖音",
    titleMaxLength: 55,
    descriptionMaxLength: 2200,
    supportsDraftMode: true,
  },
  {
    id: "xiaohongshu",
    label: "小红书",
    titleMaxLength: 20,
    descriptionMaxLength: 1000,
    supportsDraftMode: true,
  },
  {
    id: "kuaishou",
    label: "快手",
    titleMaxLength: 50,
    descriptionMaxLength: 500,
    supportsDraftMode: true,
  },
  {
    id: "shipinhao",
    label: "视频号",
    titleMaxLength: 30,
    descriptionMaxLength: 1000,
    supportsDraftMode: false,
  },
  {
    id: "bilibili",
    label: "Bilibili",
    titleMaxLength: 80,
    descriptionMaxLength: 2000,
    supportsDraftMode: true,
  },
];
