import { describe, expect, it } from "vitest";
import {
  buildArtifactPath,
  buildExtractAudioCommand,
  buildVerticalComposeCommand,
  createMediaArtifact,
  createMockMediaRenderer,
  getArtifactFileName,
  getArtifactPathType,
  MediaRendererError,
} from "../src/index.js";

describe("artifact path helpers", () => {
  it("builds paths in outputRoot/<projectId>/<stage>/<fileName> form", () => {
    expect(buildArtifactPath("/tmp/mirax", "project-1", "compose", "final.mp4")).toBe(
      "/tmp/mirax/project-1/compose/final.mp4",
    );
  });

  it("sanitizes projectId and stage to prevent directory traversal", () => {
    expect(buildArtifactPath("/tmp/mirax", "../etc", "../../secret", "file.txt")).toBe(
      "/tmp/mirax/.._etc/.._.._secret/file.txt",
    );
  });

  it("strips trailing slashes from artifact root", () => {
    expect(buildArtifactPath("/tmp/mirax///", "project-1", "speech", "audio.wav")).toBe(
      "/tmp/mirax/project-1/speech/audio.wav",
    );
  });

  it("sanitizes fileName to prevent directory traversal", () => {
    const result = buildArtifactPath("/tmp/mirax", "p", "compose", "../secret.mp4");
    expect(result).not.toContain("/compose/../");
    expect(result).toBe("/tmp/mirax/p/compose/secret.mp4");
  });

  it("preserves normal internal hierarchy in fileName", () => {
    expect(buildArtifactPath("/tmp/mirax", "p", "compose", "thumbs/cover.png")).toBe(
      "/tmp/mirax/p/compose/thumbs/cover.png",
    );
    expect(buildArtifactPath("/tmp/mirax", "p", "compose", "thumbs\\cover.png")).toBe(
      "/tmp/mirax/p/compose/thumbs/cover.png",
    );
  });

  it("neutralizes dot segments in fileName", () => {
    expect(buildArtifactPath("/tmp/mirax", "p", "compose", "./cover.png")).toBe(
      "/tmp/mirax/p/compose/cover.png",
    );
    expect(buildArtifactPath("/tmp/mirax", "p", "compose", "a/../b/c.png")).toBe(
      "/tmp/mirax/p/compose/b/c.png",
    );
  });

  it("classifies path types correctly", () => {
    expect(getArtifactPathType("http://localhost:9000/audio.wav")).toBe("url");
    expect(getArtifactPathType("https://cdn.example.com/video.mp4")).toBe("url");
    expect(getArtifactPathType("/Users/Shared/MiraxAI/audio.wav")).toBe("absolute");
    expect(getArtifactPathType("C:\\Users\\Mirax\\audio.wav")).toBe("absolute");
    expect(getArtifactPathType("project/audio.wav")).toBe("relative");
  });

  it("extracts file names from mixed path styles", () => {
    expect(getArtifactFileName("/tmp/mirax/project-1/compose/final.mp4")).toBe("final.mp4");
    expect(getArtifactFileName("cover.png")).toBe("cover.png");
    expect(getArtifactFileName("")).toBe("");
  });

  it("creates a media artifact with real metadata only", () => {
    const artifact = createMediaArtifact("finalVideo", "/tmp/mirax/project-1/compose/final.mp4", "ready");

    expect(artifact.kind).toBe("finalVideo");
    expect(artifact.pathType).toBe("absolute");
    expect(artifact.fileName).toBe("final.mp4");
    expect(artifact.state).toBe("ready");
    expect(artifact.generatedAt).toBeUndefined();
    expect(artifact.error).toBeUndefined();
  });

  it("creates a failed artifact with error context", () => {
    const artifact = createMediaArtifact(
      "audio",
      "",
      "failed",
      { code: "missing-prerequisite", message: "缺少音频", stageId: "speech" },
    );

    expect(artifact.state).toBe("failed");
    expect(artifact.error?.code).toBe("missing-prerequisite");
    expect(artifact.error?.stageId).toBe("speech");
  });
});

describe("ffmpeg command builders", () => {
  it("builds a deterministic audio extraction command", () => {
    expect(buildExtractAudioCommand("/input/source.mp4", "/output/audio.wav")).toEqual([
      "ffmpeg",
      "-y",
      "-i",
      "/input/source.mp4",
      "-vn",
      "-acodec",
      "pcm_s16le",
      "-ar",
      "16000",
      "-ac",
      "1",
      "/output/audio.wav",
    ]);
  });

  it("builds a vertical compose command with subtitle burn-in", () => {
    expect(buildVerticalComposeCommand("/input/avatar.mp4", "/input/subtitles.srt", "/output/final.mp4")).toEqual([
      "ffmpeg",
      "-y",
      "-i",
      "/input/avatar.mp4",
      "-vf",
      "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,subtitles=/input/subtitles.srt",
      "-c:a",
      "copy",
      "/output/final.mp4",
    ]);
  });

  it("rejects empty input path for audio extraction", () => {
    expect(() => buildExtractAudioCommand("", "/output/audio.wav")).toThrow(MediaRendererError);
    expect(() => buildExtractAudioCommand("", "/output/audio.wav")).toThrow("输入路径不能为空");
  });

  it("rejects empty output path for audio extraction", () => {
    expect(() => buildExtractAudioCommand("/input/source.mp4", "")).toThrow(MediaRendererError);
    expect(() => buildExtractAudioCommand("/input/source.mp4", "  ")).toThrow(MediaRendererError);
  });

  it("rejects empty inputs for vertical compose", () => {
    expect(() => buildVerticalComposeCommand("", "/sub.srt", "/out.mp4")).toThrow(MediaRendererError);
    expect(() => buildVerticalComposeCommand("/in.mp4", "", "/out.mp4")).toThrow(MediaRendererError);
    expect(() => buildVerticalComposeCommand("/in.mp4", "/sub.srt", "")).toThrow(MediaRendererError);
  });

  it("does not leak paths in error messages", () => {
    const sensitivePath = "/Users/bob/secret/source.mp4";
    try {
      buildExtractAudioCommand(sensitivePath, "");
      expect.fail("should throw");
    } catch (error) {
      expect(error).toBeInstanceOf(MediaRendererError);
      expect((error as MediaRendererError).message).not.toContain(sensitivePath);
    }
  });
});

describe("mock media renderer", () => {
  it("returns artifact paths organized by stage", async () => {
    const renderer = createMockMediaRenderer({ artifactRoot: "/tmp/mirax" });
    const result = await renderer.render({
      projectId: "project-1",
      avatarVideoPath: "/tmp/avatar.mp4",
      audioPath: "/tmp/speech.wav",
      subtitleText: "大家好",
      coverText: "通勤女包",
    });

    expect(result.videoPath).toBe("/tmp/mirax/project-1/compose/final.mp4");
    expect(result.coverPath).toBe("/tmp/mirax/project-1/compose/cover.png");
    expect(result.subtitlePath).toBe("/tmp/mirax/project-1/compose/subtitles.srt");
  });

  it("throws honest error when avatar video is missing", async () => {
    const renderer = createMockMediaRenderer({ artifactRoot: "/tmp/mirax" });

    await expect(
      renderer.render({
        projectId: "project-1",
        avatarVideoPath: "",
        audioPath: "/tmp/speech.wav",
        subtitleText: "大家好",
        coverText: "通勤女包",
      }),
    ).rejects.toBeInstanceOf(MediaRendererError);

    await expect(
      renderer.render({
        projectId: "project-1",
        avatarVideoPath: "",
        audioPath: "/tmp/speech.wav",
        subtitleText: "大家好",
        coverText: "通勤女包",
      }),
    ).rejects.toThrow("缺少 数字人视频");
  });

  it("throws honest error when audio is missing", async () => {
    const renderer = createMockMediaRenderer({ artifactRoot: "/tmp/mirax" });

    await expect(
      renderer.render({
        projectId: "project-1",
        avatarVideoPath: "/tmp/avatar.mp4",
        audioPath: "",
        subtitleText: "大家好",
        coverText: "通勤女包",
      }),
    ).rejects.toThrow("缺少 音频");
  });
});
