export type PublishPlatform = "douyin" | "xiaohongshu" | "kuaishou" | "shipinhao" | "bilibili";

export interface PlatformProfile {
  id: PublishPlatform;
  label: string;
  titleMaxLength: number;
  descriptionMaxLength: number;
  supportsDraftMode: boolean;
  /** 是否支持直接发布（非草稿模式）。 */
  supportsDirectMode: boolean;
  /**
   * 平台授权方式说明，仅用于文档与 UI 提示。
   * 真实 OAuth / 二维码 / Cookie 获取属于运行障碍，后续 Task 单独实现。
   */
  authorization: "oauth" | "qr" | "cookie" | "unknown";
  /** 视频时长上限（秒），undefined 表示未限制或未知。 */
  maxDurationSeconds?: number;
  /** 视频文件大小上限（MB），undefined 表示未限制或未知。 */
  maxFileSizeMb?: number;
}

export interface PublishAccount {
  id: string;
  platformId: PublishPlatform;
  displayName: string;
  status: "active" | "expired" | "inactive";
  /**
   * 指向 keychain / 安全存储 / 本地加密 store 的凭证引用。
   * 真实平台发布时，Publisher 通过此引用获取凭证，而不是从 `PublishHandoffInput` 中读取。
   * PublishAccount 本身不保存 cookie / token / password 明文。
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

/** 发布错误代码。message 中不得包含凭证。 */
export type PublishErrorCode =
  | "account_unauthorized"
  | "account_expired"
  | "platform_unsupported_draft"
  | "platform_limit_exceeded"
  | "video_not_found"
  | "network_error"
  | "unknown";

/** per-platform 发布子结果。 */
export interface PublishPlatformResult {
  platformId: PublishPlatform;
  success: boolean;
  /** 成功时返回的任务 ID。 */
  taskId?: string;
  /** 失败时的错误代码。 */
  errorCode?: PublishErrorCode;
  /** 人类可读的错误信息；不得包含凭证。 */
  errorMessage?: string;
}

/**
 * Publisher 发布结果。
 * - `success` 表示全部平台任务是否创建成功；
 * - `platformResults` 给出每个平台的子结果与任务 ID；
 * - `message` 与 `errorMessage` 不得包含凭证信息。
 */
export interface PublishHandoffResult {
  success: boolean;
  message: string;
  taskIds: string[];
  platformResults: PublishPlatformResult[];
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

/**
 * 发布任务状态机：
 * pending → submitted → processing → completed
 *                          ↓
 *              failed / cancelled / retryable
 *
 * `retryable` 表示可自动或手动重试（如网络/限流）；
 * `failed` 表示不可自动重试（如格式不符、用户取消之外的业务错误）；
 * `cancelled` 表示用户主动取消，不可重试。
 */
export type PublishTaskStatus =
  | "pending"
  | "submitted"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled"
  | "retryable";

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
  /** 失败时的错误代码。 */
  errorCode?: PublishErrorCode;
  /** 人类可读的错误信息；不得包含凭证。 */
  errorMessage?: string;
  /** 失败时间 ISO 字符串。 */
  failedAt?: string;
  /** 已尝试重试次数；初始为 0。 */
  retryCount: number;
}
