import type {
  ArtifactPathType,
  ArtifactState,
  MediaArtifact,
  MediaArtifactError,
} from "./types.js";
import { MediaRendererError } from "./types.js";

/** 产物类型到生成阶段目录名的映射。 */
export const ARTIFACT_STAGE_NAMES: Record<MediaArtifact["kind"], string> = {
  audio: "speech",
  avatarVideo: "avatar",
  finalVideo: "compose",
  cover: "compose",
  subtitle: "compose",
};

/**
 * 清洗 fileName：
 * - 去除开头的 `/` 与 `\`；
 * - 将反斜杠统一视为路径分隔符；
 * - 中和 `.` / `..` 片段，不能生成跳出 stage 目录的路径；
 * - 保留正常内部层级（如 `thumbs/cover.png`）。
 */
function sanitizeFileName(fileName: string): string {
  const normalized = fileName.replace(/\\/g, "/").replace(/^[\\/]+/, "");
  const segments = normalized.split("/").filter((segment) => segment !== "" && segment !== ".");
  const stack: string[] = [];

  for (const segment of segments) {
    if (segment === "..") {
      if (stack.length > 0) {
        stack.pop();
      }
    } else {
      stack.push(segment);
    }
  }

  return stack.join("/");
}

/**
 * 按真实产物目录规则拼接路径：`<artifactRoot>/<projectId>/<stage>/<fileName>`。
 *
 * 规则：
 * - 去除 `artifactRoot` 末尾的多余 `/`；
 * - `projectId` 与 `stage` 中的路径分隔符会被替换为 `_`，避免目录遍历；
 * - `fileName` 会清洗 `.` / `..`、开头斜杠与反斜杠，保留正常内部层级。
 */
export function buildArtifactPath(
  artifactRoot: string,
  projectId: string,
  stage: string,
  fileName: string,
): string {
  const root = artifactRoot.replace(/\/+$/g, "");
  const cleanProjectId = projectId.replace(/[\\/]/g, "_");
  const cleanStage = stage.replace(/[\\/]/g, "_");
  const cleanFileName = sanitizeFileName(fileName);

  if (!cleanFileName) {
    return `${root}/${cleanProjectId}/${cleanStage}`;
  }

  return `${root}/${cleanProjectId}/${cleanStage}/${cleanFileName}`;
}

/** 根据路径前缀判断其类型：URL、绝对路径或相对路径。 */
export function getArtifactPathType(path: string): ArtifactPathType {
  if (/^https?:\/\//i.test(path)) {
    return "url";
  }

  if (/^(\/|\\)/.test(path) || /^[A-Za-z]:[\\/]/.test(path)) {
    return "absolute";
  }

  return "relative";
}

/** 从路径中提取文件名。 */
export function getArtifactFileName(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) {
    return "";
  }

  const index = Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("\\"));
  return index >= 0 ? trimmed.slice(index + 1) : trimmed;
}

/** 构造一个媒体产物描述对象。 */
export function createMediaArtifact(
  kind: MediaArtifact["kind"],
  path: string,
  state: ArtifactState = "pending",
  error?: MediaArtifactError,
): MediaArtifact {
  return {
    kind,
    path,
    pathType: getArtifactPathType(path),
    fileName: getArtifactFileName(path),
    state,
    ...(error ? { error } : {}),
  };
}

/**
 * 断言前置产物路径已就绪。
 *
 * 若路径为空，抛出 `MediaRendererError`，`code` 为 `missing-prerequisite`。
 * 调用方应捕获该错误并标记对应阶段为 `failed`。
 */
export function assertPrerequisitePath(
  path: string | undefined,
  name: string,
  stageId: string,
): asserts path is string {
  if (!path?.trim()) {
    throw new MediaRendererError(
      "missing-prerequisite",
      `缺少 ${name}，无法继续 ${stageId}`,
      stageId,
    );
  }
}

export { MediaRendererError } from "./types.js";
