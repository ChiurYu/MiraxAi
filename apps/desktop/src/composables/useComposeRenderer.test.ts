import { describe, expect, it } from "vitest";
import { createMockMediaRenderer, MediaRendererError } from "@mirax/media-pipeline";
import { createTauriComposeRenderer, selectComposeRenderer } from "./useComposeRenderer.js";

describe("selectComposeRenderer", () => {
  const mockRenderer = createMockMediaRenderer();

  it("returns mock renderer in mock mode", () => {
    const result = selectComposeRenderer({ stageMode: "mock", ffmpegPath: "", mockRenderer });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.renderer).toBe(mockRenderer);
    }
  });

  it("returns not-connected when real mode has no ffmpeg path", () => {
    const result = selectComposeRenderer({ stageMode: "real", ffmpegPath: "", mockRenderer });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("not-connected");
    }
  });

  it("returns not-connected when stage mode is not-connected even with a non-empty ffmpeg path", () => {
    const result = selectComposeRenderer({ stageMode: "not-connected", ffmpegPath: "/opt/ffmpeg", mockRenderer });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("not-connected");
    }
  });
});

describe("createTauriComposeRenderer", () => {
  it("invokes the desktop compose command with trusted output paths", async () => {
    const calls: Array<{ command: string; args: Record<string, unknown> }> = [];
    const renderer = createTauriComposeRenderer({
      ffmpegPath: "/opt/ffmpeg",
      artifactRoot: "/tmp/mirax",
      invoke: async (command, args) => {
        calls.push({ command, args });
        return null;
      },
    });

    const result = await renderer.render({
      projectId: "project-1",
      avatarVideoPath: "/tmp/avatar.mp4",
      audioPath: "/tmp/audio.wav",
      subtitleText: "大家好",
      coverText: "通勤女包",
    });

    expect(result).toEqual({
      videoPath: "/tmp/mirax/project-1/compose/final.mp4",
      coverPath: "/tmp/mirax/project-1/compose/cover.png",
      subtitlePath: "/tmp/mirax/project-1/compose/subtitles.srt",
    });
    expect(calls[0]).toMatchObject({
      command: "render_compose",
      args: {
        ffmpegPath: "/opt/ffmpeg",
        avatarVideoPath: "/tmp/avatar.mp4",
        audioPath: "/tmp/audio.wav",
        subtitleText: "大家好",
        videoPath: result.videoPath,
        coverPath: result.coverPath,
        subtitlePath: result.subtitlePath,
      },
    });
  });

  it("maps command failure to render-failed without leaking paths", async () => {
    const renderer = createTauriComposeRenderer({
      ffmpegPath: "/secret/ffmpeg",
      artifactRoot: "/tmp/mirax",
      invoke: async () => {
        throw new Error("failed for /secret/avatar.mp4");
      },
    });

    let caught: unknown;
    try {
      await renderer.render({
        projectId: "project-1",
        avatarVideoPath: "/secret/avatar.mp4",
        audioPath: "/secret/audio.wav",
        subtitleText: "大家好",
        coverText: "通勤女包",
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(MediaRendererError);
    expect((caught as MediaRendererError).code).toBe("render-failed");
    expect((caught as Error).message).not.toContain("/secret");
  });

  it("rejects structured failure responses and does not return output paths", async () => {
    const renderer = createTauriComposeRenderer({
      ffmpegPath: "/opt/ffmpeg",
      artifactRoot: "/tmp/mirax",
      invoke: async () => ({ ok: false, error: "failed for /tmp/mirax/project-1/compose/final.mp4" }),
    });

    let caught: unknown;
    try {
      await renderer.render({
        projectId: "project-1",
        avatarVideoPath: "/tmp/avatar.mp4",
        audioPath: "/tmp/audio.wav",
        subtitleText: "大家好",
        coverText: "通勤女包",
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(MediaRendererError);
    expect((caught as MediaRendererError).code).toBe("render-failed");
    expect((caught as Error).message).not.toContain("/tmp/mirax");
    expect((caught as Error).message).not.toContain("final.mp4");
  });
});
