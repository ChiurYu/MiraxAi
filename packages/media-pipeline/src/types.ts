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

/**
 * media-pipeline 专用错误类型。
 *
 * 设计边界：
 * - 错误中不携带具体文件绝对路径或 URL；
 * - 通过 `code` 与 `stageId` 让调用方判断失败场景；
 * - 真实调用阶段可在此基础上扩展重试、清理等逻辑。
 */
export class MediaRendererError extends Error {
  readonly code: string;
  readonly stageId?: string;

  constructor(code: string, message: string, stageId?: string) {
    super(message);
    this.name = "MediaRendererError";
    this.code = code;
    this.stageId = stageId;
  }

  toMediaArtifactError(): MediaArtifactError {
    return { code: this.code, message: this.message, stageId: this.stageId };
  }
}

export interface RenderInput {
  projectId: string;
  /** 驱动数字人的音频产物路径（绝对路径、项目相对路径或 URL）。 */
  audioPath: string;
  /** 数字人口播视频产物路径。 */
  avatarVideoPath: string;
  /** 用于烧录字幕的文案；未来可替换为 subtitlePath 产物。 */
  subtitleText: string;
  /** 封面文案；未来由封面模板消费。 */
  coverText: string;
}

/**
 * 渲染输出。
 *
 * 注意：当前 mock renderer 只返回路径，不真正生成文件。
 * 真实渲染失败时应抛出 `MediaRendererError`，调用方通过 `error.code` 与
 * `error.stageId` 展示错误；`RenderResult` 仅在成功路径下有效。
 */
export interface RenderResult {
  videoPath: string;
  coverPath: string;
  subtitlePath: string;
}

export interface MediaRenderer {
  render(input: RenderInput): Promise<RenderResult>;
}

export interface MockMediaRendererOptions {
  artifactRoot?: string;
}
