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

/**
 * 阶段运行时能力模式。
 *
 * - `mock`：当前使用 mock provider / renderer，产物为模拟路径或占位数据。
 * - `real`：已切换到真实 provider / sidecar（本阶段 5 仅作设计，不实际接入）。
 * - `not-connected`：真实能力已配置但依赖未就绪（如 sidecar 缺失、provider 未连接）。
 */
export type WorkflowStageRuntimeMode = "mock" | "real" | "not-connected";

export type PublishPlatform = "douyin" | "xiaohongshu" | "kuaishou" | "shipinhao" | "bilibili";

export type ApiKeyProvider = "openai" | "whisper" | "local-whisper" | "cosyvoice" | "heygem" | "custom";

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
  /** 语音合成产物路径（绝对路径、项目相对路径或 URL）。 */
  audioPath?: string;
  /** 数字人口播视频产物路径。 */
  avatarVideoPath?: string;
  /** 最终成片产物路径。 */
  finalVideoPath?: string;
  /** 封面图产物路径。 */
  coverPath?: string;
}

/** 媒体产物生成状态。 */
export type ArtifactState = "pending" | "running" | "ready" | "failed" | "stale";

/** 媒体产物路径类型。 */
export type ArtifactPathType = "absolute" | "relative" | "url";

/** 媒体产物错误信息。 */
export interface MediaArtifactError {
  code: string;
  message: string;
  stageId?: string;
}

/** 单个媒体产物描述。 */
export interface MediaArtifact {
  kind: "audio" | "avatarVideo" | "finalVideo" | "cover" | "subtitle";
  path: string;
  pathType: ArtifactPathType;
  fileName: string;
  generatedAt?: string;
  state: ArtifactState;
  error?: MediaArtifactError;
}

export type AppTheme = "light" | "dark" | "system";

export interface AppOutputPaths {
  baseOutput: string;
  audioOutput: string;
  videoOutput: string;
  draftOutput: string;
  exportOutput: string;
  thumbsOutput: string;
}

export interface AppSettings {
  id: string;
  theme: AppTheme;
  outputPaths: AppOutputPaths;
  rewriteProviderConfigId?: string;
}

export interface PublishMetadata {
  title: string;
  description: string;
  tags: string[];
  coverPath?: string;
  mode: "direct" | "draft";
}
