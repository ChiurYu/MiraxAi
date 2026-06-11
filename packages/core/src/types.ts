export type WorkflowStageId =
  | "transcribe"
  | "rewrite"
  | "voice-clone"
  | "speech"
  | "avatar"
  | "compose"
  | "review"
  | "publish";

export type WorkflowStageStatus = "pending" | "running" | "completed" | "failed" | "skipped";

export type PublishPlatform = "douyin" | "xiaohongshu" | "kuaishou" | "shipinhao" | "bilibili";

export type ApiKeyProvider = "openai" | "whisper" | "cosyvoice" | "heygem" | "custom";

export interface WorkflowStage {
  id: WorkflowStageId;
  title: string;
  description: string;
  status: WorkflowStageStatus;
  required: boolean;
}

export interface Workflow {
  projectId: string;
  stages: WorkflowStage[];
  createdAt: string;
  updatedAt: string;
}

export interface StageProgress {
  completed: number;
  total: number;
  percent: number;
}

export interface ApiKeyProviderConfig {
  id: string;
  label: string;
  provider: ApiKeyProvider;
  apiKey: string;
  baseUrl?: string;
  model?: string;
  enabled: boolean;
}

export interface ProjectDraft {
  name: string;
  targetPlatforms: PublishPlatform[];
  sourceVideoPath?: string;
  voiceSamplePath?: string;
  notes?: string;
}
