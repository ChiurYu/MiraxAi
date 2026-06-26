import {
  assertPrerequisitePath,
  buildArtifactPath,
} from "./artifactPaths.js";
import type { MediaRenderer, MockMediaRendererOptions, RenderInput, RenderResult } from "./types.js";

const DEFAULT_ARTIFACT_ROOT = "/tmp/mirax/output";

/**
 * 创建 mock 媒体渲染器。
 *
 * 产物路径遵循真实目录规则：`<artifactRoot>/<projectId>/<stage>/<fileName>`。
 * 本实现不调用 FFmpeg，也不创建真实文件；仅返回与真实规则一致的产物路径，
 * 并在缺少前置产物时抛出诚实的 `MediaRendererError`。
 */
export function createMockMediaRenderer(options: MockMediaRendererOptions = {}): MediaRenderer {
  const artifactRoot = options.artifactRoot ?? DEFAULT_ARTIFACT_ROOT;

  return {
    async render(input: RenderInput): Promise<RenderResult> {
      assertPrerequisitePath(input.avatarVideoPath, "数字人视频", "compose");
      assertPrerequisitePath(input.audioPath, "音频", "compose");

      return {
        videoPath: buildArtifactPath(artifactRoot, input.projectId, "compose", "final.mp4"),
        coverPath: buildArtifactPath(artifactRoot, input.projectId, "compose", "cover.png"),
        subtitlePath: buildArtifactPath(artifactRoot, input.projectId, "compose", "subtitles.srt"),
      };
    },
  };
}
