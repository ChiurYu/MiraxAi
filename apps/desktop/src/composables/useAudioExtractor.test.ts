import { describe, expect, it } from "vitest";
import { selectAudioExtractor } from "./useAudioExtractor.js";

describe("selectAudioExtractor", () => {
  it("returns not-connected when stage mode is not real", () => {
    const result = selectAudioExtractor({
      stageMode: "mock",
      ffmpegPath: "/usr/local/bin/ffmpeg",
      verifiedFfmpegPath: "/usr/local/bin/ffmpeg",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("not-connected");
    }
  });

  it("returns not-connected when ffmpeg path is not verified", () => {
    const result = selectAudioExtractor({
      stageMode: "real",
      ffmpegPath: "/usr/local/bin/ffmpeg",
      verifiedFfmpegPath: "",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("not-connected");
    }
  });

  it("returns not-connected when current ffmpeg path does not match verified path", () => {
    const result = selectAudioExtractor({
      stageMode: "real",
      ffmpegPath: "/usr/local/bin/ffmpeg",
      verifiedFfmpegPath: "/other/ffmpeg",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("not-connected");
    }
  });

  it("extracts audio via Tauri invoke when verified", async () => {
    const invocations: unknown[] = [];
    const result = selectAudioExtractor({
      stageMode: "real",
      ffmpegPath: "/usr/local/bin/ffmpeg",
      verifiedFfmpegPath: "/usr/local/bin/ffmpeg",
      artifactRoot: "/Users/Shared/MiraxAI/audio",
      invoke: async (command, args) => {
        invocations.push({ command, args });
        return undefined;
      },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      const extractResult = await result.extractor.extract({
        sourceVideoPath: "/tmp/source.mp4",
        projectId: "demo-project",
      });
      expect(extractResult.audioPath).toBe(
        "/Users/Shared/MiraxAI/audio/demo-project/transcribe/extracted-audio.wav",
      );
      expect(invocations).toHaveLength(1);
      const call = invocations[0] as { command: string; args: Record<string, unknown> };
      expect(call.command).toBe("extract_audio");
      expect(call.args.ffmpegPath).toBe("/usr/local/bin/ffmpeg");
      expect(call.args.inputPath).toBe("/tmp/source.mp4");
      expect(call.args.outputPath).toMatch(/extracted-audio\.wav$/);
    }
  });
});

describe("createTauriAudioExtractor", () => {
  it("maps command failures to extract-failed without leaking paths", async () => {
    const extractorResult = selectAudioExtractor({
      stageMode: "real",
      ffmpegPath: "/opt/ffmpeg",
      verifiedFfmpegPath: "/opt/ffmpeg",
      artifactRoot: "/tmp/mirax",
      invoke: async () => {
        throw new Error("failed for /secret/source.mp4");
      },
    });

    expect(extractorResult.ok).toBe(true);
    if (!extractorResult.ok) return;

    let caught: unknown;
    try {
      await extractorResult.extractor.extract({
        sourceVideoPath: "/secret/source.mp4",
        projectId: "project-1",
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).not.toContain("/secret");
  });
});
