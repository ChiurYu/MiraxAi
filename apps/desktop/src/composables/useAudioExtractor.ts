import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import { buildArtifactPath, MediaRendererError } from "@mirax/media-pipeline";
import type { WorkflowStageRuntimeMode } from "@mirax/core";

export type AudioExtractorInvoke = (command: string, args: Record<string, unknown>) => Promise<unknown>;

export interface AudioExtractorSelectionInput {
  stageMode: WorkflowStageRuntimeMode;
  ffmpegPath: string;
  verifiedFfmpegPath?: string;
  artifactRoot?: string;
  invoke?: AudioExtractorInvoke;
}

export interface AudioExtractor {
  extract(input: { sourceVideoPath: string; projectId: string }): Promise<{ audioPath: string }>;
}

export type AudioExtractorSelectionResult =
  | { ok: true; extractor: AudioExtractor }
  | { ok: false; error: MediaRendererError };

export function selectAudioExtractor(input: AudioExtractorSelectionInput): AudioExtractorSelectionResult {
  if (input.stageMode !== "real") {
    return {
      ok: false,
      error: new MediaRendererError("not-connected", "音频抽取仅在 real 模式下可用。", "transcribe"),
    };
  }

  const trimmedFfmpegPath = input.ffmpegPath.trim();
  if (!trimmedFfmpegPath || input.verifiedFfmpegPath !== trimmedFfmpegPath) {
    return {
      ok: false,
      error: new MediaRendererError("not-connected", "FFmpeg 未验证，无法抽取音频。", "transcribe"),
    };
  }

  return {
    ok: true,
    extractor: createTauriAudioExtractor({
      ffmpegPath: trimmedFfmpegPath,
      artifactRoot: input.artifactRoot,
      invoke: input.invoke,
    }),
  };
}

interface TauriAudioExtractorOptions {
  ffmpegPath: string;
  artifactRoot?: string;
  invoke?: AudioExtractorInvoke;
}

function createTauriAudioExtractor(options: TauriAudioExtractorOptions): AudioExtractor {
  const artifactRoot = options.artifactRoot ?? "/Users/Shared/MiraxAI/audio";
  const invoke = options.invoke ?? tauriInvoke;

  return {
    async extract(input: { sourceVideoPath: string; projectId: string }): Promise<{ audioPath: string }> {
      if (!input.sourceVideoPath.trim()) {
        throw new MediaRendererError("missing-input", "缺少源视频路径，无法抽取音频。", "transcribe");
      }

      const audioPath = buildArtifactPath(artifactRoot, input.projectId, "transcribe", "extracted-audio.wav");

      try {
        const payload = await invoke("extract_audio", {
          ffmpegPath: options.ffmpegPath,
          inputPath: input.sourceVideoPath,
          outputPath: audioPath,
        });

        if (payload && typeof payload === "object" && "ok" in payload && (payload as { ok?: unknown }).ok === false) {
          throw new MediaRendererError("extract-failed", "FFmpeg 音频抽取失败。", "transcribe");
        }

        return { audioPath };
      } catch (error) {
        if (error instanceof MediaRendererError) {
          throw error;
        }
        throw new MediaRendererError("extract-failed", "FFmpeg 音频抽取失败。", "transcribe");
      }
    },
  };
}
