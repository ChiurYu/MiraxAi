import type { PublishAccount, PublishPlatform } from "@mirax/provider-publish";

export type AccountUiStatus =
  | "connected"
  | "reauthorize"
  | "checking"
  | "unavailable"
  | "disconnected";

export interface AccountViewItem extends PublishAccount {
  uiStatus: AccountUiStatus;
}

/**
 * Mock 账号视图数据。
 *
 * 安全边界：
 * - `credentialRef` 仅作为凭证引用占位，绝不保存真实 cookie / token；
 * - UI 状态诚实反映授权是否可用，不模拟真实 OAuth 成功。
 */
export const mockAccounts: AccountViewItem[] = [
  {
    id: "account-douyin-mirax",
    platformId: "douyin" as PublishPlatform,
    displayName: "Mirax 抖音号",
    status: "active",
    credentialRef: "mock:keychain:douyin-mirax",
    uiStatus: "connected",
  },
  {
    id: "account-xiaohongshu-mirax",
    platformId: "xiaohongshu" as PublishPlatform,
    displayName: "Mirax 小红书号",
    status: "expired",
    uiStatus: "reauthorize",
  },
  {
    id: "account-kuaishou-mirax",
    platformId: "kuaishou" as PublishPlatform,
    displayName: "Mirax 快手号",
    status: "active",
    uiStatus: "checking",
  },
  {
    id: "account-shipinhao-mirax",
    platformId: "shipinhao" as PublishPlatform,
    displayName: "Mirax 视频号",
    status: "inactive",
    uiStatus: "unavailable",
  },
  {
    id: "account-bilibili-mirax",
    platformId: "bilibili" as PublishPlatform,
    displayName: "Mirax Bilibili",
    status: "inactive",
    uiStatus: "disconnected",
  },
];

export function createAccountViewItem(input: {
  id: string;
  platformId: PublishPlatform;
  displayName: string;
  uiStatus: AccountUiStatus;
  credentialRef?: string;
}): AccountViewItem {
  let status: PublishAccount["status"] = "inactive";
  if (input.uiStatus === "connected") status = "active";
  else if (input.uiStatus === "reauthorize") status = "expired";

  return {
    id: input.id,
    platformId: input.platformId,
    displayName: input.displayName,
    status,
    credentialRef: input.credentialRef,
    uiStatus: input.uiStatus,
  };
}
