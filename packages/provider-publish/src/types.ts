export type PublishPlatform = "douyin" | "xiaohongshu" | "kuaishou" | "shipinhao" | "bilibili";

export interface PlatformProfile {
  id: PublishPlatform;
  label: string;
  titleMaxLength: number;
  descriptionMaxLength: number;
  supportsDraftMode: boolean;
}

export interface PublishAccount {
  id: string;
  platformId: PublishPlatform;
  displayName: string;
  status: "active" | "expired" | "inactive";
  /**
   * 指向 keychain / 安全存储 / 本地加密 store 的凭证引用。
   * 真实平台发布时，Publisher 通过此引用获取凭证，而不是从 `PublishHandoffInput` 中读取。
   */
  credentialRef?: string;
}

/**
 * 发布交接输入。此对象不得包含任何凭证、Cookie 或 Token；
 * Publisher 内部通过 `PublishAccount.credentialRef` 解析真实凭据。
 */
export interface PublishHandoffInput {
  projectId: string;
  videoPath: string;
  title: string;
  description: string;
  platformIds: PublishPlatform[];
  mode: "direct" | "draft";
}

export interface PublishHandoffResult {
  success: boolean;
  message: string;
  taskIds: string[];
}

/**
 * Publisher 实现负责：
 * - 列出已授权的发布账号；
 * - 接收不含凭证的 `PublishHandoffInput`；
 * - 内部通过账号 `credentialRef` 安全获取凭证并执行发布；
 * - 返回 `PublishHandoffResult`，其中 `message` 不得包含凭证信息。
 */
export interface Publisher {
  listAccounts(): Promise<PublishAccount[]>;
  publish(input: PublishHandoffInput): Promise<PublishHandoffResult>;
}

export type PublishTaskStatus = "pending" | "processing" | "completed" | "failed" | "cancelled";

export interface PublishTask {
  id: string;
  projectId: string;
  platformId: PublishPlatform;
  accountId: string;
  status: PublishTaskStatus;
  videoPath: string;
  title: string;
  description: string;
  tags: string[];
  mode: "direct" | "draft";
  createdAt: string;
  updatedAt: string;
}
