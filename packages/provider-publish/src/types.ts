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
}

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

export interface Publisher {
  listAccounts(): Promise<PublishAccount[]>;
  publish(input: PublishHandoffInput): Promise<PublishHandoffResult>;
}
