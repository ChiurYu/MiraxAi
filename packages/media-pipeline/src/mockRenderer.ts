import type { MediaRenderer, MockMediaRendererOptions, RenderInput, RenderResult } from "./types.js";

const DEFAULT_ARTIFACT_ROOT = "/tmp/mirax/output";

export function createMockMediaRenderer(options: MockMediaRendererOptions = {}): MediaRenderer {
  const artifactRoot = options.artifactRoot ?? DEFAULT_ARTIFACT_ROOT;

  return {
    async render(input: RenderInput): Promise<RenderResult> {
      const projectRoot = joinPath(artifactRoot, input.projectId);

      return {
        videoPath: joinPath(projectRoot, "final.mp4"),
        coverPath: joinPath(projectRoot, "cover.png"),
        subtitlePath: joinPath(projectRoot, "subtitles.srt"),
      };
    },
  };
}

function joinPath(...segments: string[]): string {
  return segments
    .map((segment, index) => (index === 0 ? segment.replace(/\/+$/g, "") : segment.replace(/^\/+|\/+$/g, "")))
    .filter(Boolean)
    .join("/");
}
