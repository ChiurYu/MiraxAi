import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import {
  assertPrerequisitePath,
  buildArtifactPath,
  MediaRendererError,
  type MediaRenderer,
  type RenderInput,
  type RenderResult,
} from "@mirax/media-pipeline";
import type { WorkflowStageRuntimeMode } from "@mirax/core";

export type ComposeInvoke = (command: string, args: Record<string, unknown>) => Promise<unknown>;

export interface ComposeRendererSelectionInput {
  stageMode: WorkflowStageRuntimeMode;
  ffmpegPath: string;
  mockRenderer: MediaRenderer;
  artifactRoot?: string;
  invoke?: ComposeInvoke;
}

export type ComposeRendererSelectionResult =
  | { ok: true; renderer: MediaRenderer }
  | { ok: false; error: MediaRendererError };

export function selectComposeRenderer(input: ComposeRendererSelectionInput): ComposeRendererSelectionResult {
  if (input.stageMode === "mock") {
    return { ok: true, renderer: input.mockRenderer };
  }

  if (input.stageMode === "not-connected" || !input.ffmpegPath.trim()) {
    return {
      ok: false,
      error: new MediaRendererError("not-connected", "Compose 真实 FFmpeg 未连接。", "compose"),
    };
  }

  return {
    ok: true,
    renderer: createTauriComposeRenderer({
      ffmpegPath: input.ffmpegPath,
      artifactRoot: input.artifactRoot,
      invoke: input.invoke,
    }),
  };
}

export interface TauriComposeRendererOptions {
  ffmpegPath: string;
  artifactRoot?: string;
  invoke?: ComposeInvoke;
}

export function createTauriComposeRenderer(options: TauriComposeRendererOptions): MediaRenderer {
  const artifactRoot = options.artifactRoot ?? "/Users/Shared/MiraxAI/video";
  const invoke = options.invoke ?? tauriInvoke;

  return {
    async render(input: RenderInput): Promise<RenderResult> {
      assertPrerequisitePath(input.avatarVideoPath, "数字人视频", "compose");
      assertPrerequisitePath(input.audioPath, "音频", "compose");

      const result = {
        videoPath: buildArtifactPath(artifactRoot, input.projectId, "compose", "final.mp4"),
        coverPath: buildArtifactPath(artifactRoot, input.projectId, "compose", "cover.png"),
        subtitlePath: buildArtifactPath(artifactRoot, input.projectId, "compose", "subtitles.srt"),
      };

      try {
        const payload = await invoke("render_compose", {
          ffmpegPath: options.ffmpegPath,
          avatarVideoPath: input.avatarVideoPath,
          audioPath: input.audioPath,
          subtitleText: input.subtitleText,
          coverText: input.coverText,
          videoPath: result.videoPath,
          coverPath: result.coverPath,
          subtitlePath: result.subtitlePath,
        });

        if (
          payload &&
          typeof payload === "object" &&
          "ok" in payload &&
          (payload as { ok?: unknown }).ok === false
        ) {
          throw new MediaRendererError("render-failed", "FFmpeg 合成失败。", "compose");
        }
      } catch (error) {
        if (error instanceof MediaRendererError) {
          throw error;
        }
        throw new MediaRendererError("render-failed", "FFmpeg 合成失败。", "compose");
      }

      return result;
    },
  };
}
