import { SUPPORTED_PLATFORM_PROFILES } from "./platformProfiles.js";
import type {
  PublishAccount,
  PublishErrorCode,
  PublishHandoffInput,
  PublishHandoffResult,
  PublishPlatform,
  PublishPlatformResult,
  PublishTask,
  PublishTaskStatus,
  Publisher,
} from "./types.js";

/**
 * Mock 账号数据。
 *
 * 安全边界：
 * - `credentialRef` 仅作为凭证引用占位，绝不保存真实 cookie / token；
 * - 没有 `credentialRef` 的账号在 mock 发布时返回 `account_unauthorized`，模拟真实授权缺失。
 */
const MOCK_ACCOUNTS: PublishAccount[] = [
  {
    id: "account-douyin",
    platformId: "douyin",
    displayName: "Mirax 抖音号",
    status: "active",
    credentialRef: "mock:keychain:douyin",
  },
  {
    id: "account-xiaohongshu",
    platformId: "xiaohongshu",
    displayName: "Mirax 小红书号",
    status: "active",
    credentialRef: "mock:keychain:xiaohongshu",
  },
  {
    id: "account-kuaishou",
    platformId: "kuaishou",
    displayName: "Mirax 快手号",
    status: "active",
  },
  {
    id: "account-shipinhao",
    platformId: "shipinhao",
    displayName: "Mirax 视频号",
    status: "inactive",
  },
  {
    id: "account-bilibili",
    platformId: "bilibili",
    displayName: "Mirax Bilibili",
    status: "inactive",
  },
];

export function createMockPublisher(): Publisher {
  return {
    async listAccounts(): Promise<PublishAccount[]> {
      return MOCK_ACCOUNTS.map((account) => ({ ...account }));
    },

    async publish(input: PublishHandoffInput): Promise<PublishHandoffResult> {
      if (!input.videoPath.trim()) {
        throw new Error("请先生成视频");
      }

      if (input.platformIds.length === 0) {
        throw new Error("至少选择一个发布平台");
      }

      const accounts = await this.listAccounts();

      const platformResults: PublishPlatformResult[] = input.platformIds.map((platformId) => {
        const account = accounts.find((a) => a.platformId === platformId);
        const profile = SUPPORTED_PLATFORM_PROFILES.find((p) => p.id === platformId);

        if (!profile) {
          return {
            platformId,
            success: false,
            errorCode: "unknown",
            errorMessage: "未知平台",
          };
        }

        // 先校验平台能力与内容限制（不依赖账号授权）。
        if (input.mode === "draft" && !profile.supportsDraftMode) {
          return {
            platformId,
            success: false,
            errorCode: "platform_unsupported_draft",
            errorMessage: `平台 ${profile.label} 不支持草稿模式`,
          };
        }

        if (input.title.length > profile.titleMaxLength) {
          return {
            platformId,
            success: false,
            errorCode: "platform_limit_exceeded",
            errorMessage: `标题超过 ${profile.label} 最大长度 ${profile.titleMaxLength}`,
          };
        }

        if (!account || !account.credentialRef) {
          return {
            platformId,
            success: false,
            errorCode: "account_unauthorized",
            errorMessage: `平台 ${profile.label} 账号未授权`,
          };
        }

        const taskId = `mock-publish-${input.projectId}-${platformId}`;
        return {
          platformId,
          success: true,
          taskId,
        };
      });

      const success = platformResults.every((r) => r.success);
      const taskIds = platformResults.filter((r) => r.success).map((r) => r.taskId!);

      return {
        success,
        message: success
          ? `已创建 ${taskIds.length} 个${input.mode === "draft" ? "草稿" : "发布"}任务`
          : "部分平台发布失败",
        taskIds,
        platformResults,
      };
    },
  };
}

export function createPublishTask(input: {
  id: string;
  projectId: string;
  platformId: PublishPlatform;
  accountId: string;
  videoPath: string;
  title: string;
  description: string;
  tags: string[];
  mode: "direct" | "draft";
  createdAt?: string;
  status?: PublishTaskStatus;
  errorCode?: PublishErrorCode;
  errorMessage?: string;
  failedAt?: string;
  retryCount?: number;
}): PublishTask {
  const now = input.createdAt ?? new Date().toISOString();

  return {
    id: input.id,
    projectId: input.projectId,
    platformId: input.platformId,
    accountId: input.accountId,
    status: input.status ?? "pending",
    videoPath: input.videoPath,
    title: input.title,
    description: input.description,
    tags: [...input.tags],
    mode: input.mode,
    createdAt: now,
    updatedAt: now,
    errorCode: input.errorCode,
    errorMessage: input.errorMessage,
    failedAt: input.failedAt,
    retryCount: input.retryCount ?? 0,
  };
}
