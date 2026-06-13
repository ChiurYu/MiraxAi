import type { PublishAccount, PublishHandoffInput, PublishHandoffResult, Publisher } from "./types.js";

const MOCK_ACCOUNTS: PublishAccount[] = [
  { id: "account-douyin", platformId: "douyin", displayName: "Mirax 抖音号", status: "active" },
  { id: "account-xiaohongshu", platformId: "xiaohongshu", displayName: "Mirax 小红书号", status: "active" },
  { id: "account-kuaishou", platformId: "kuaishou", displayName: "Mirax 快手号", status: "active" },
  { id: "account-shipinhao", platformId: "shipinhao", displayName: "Mirax 视频号", status: "active" },
  { id: "account-bilibili", platformId: "bilibili", displayName: "Mirax Bilibili", status: "active" },
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

      return {
        success: true,
        message: `已创建 ${input.platformIds.length} 个${input.mode === "draft" ? "草稿" : "发布"}任务`,
        taskIds: input.platformIds.map((platformId) => `mock-publish-${input.projectId}-${platformId}`),
      };
    },
  };
}
