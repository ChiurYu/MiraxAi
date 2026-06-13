import { describe, expect, it } from "vitest";
import { buildExtractAudioCommand, buildVerticalComposeCommand, createMockMediaRenderer } from "../src/index.js";

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
});

describe("mock media renderer", () => {
  it("returns stable video and cover artifact paths", async () => {
    const renderer = createMockMediaRenderer({ artifactRoot: "/tmp/mirax" });
    const result = await renderer.render({
      projectId: "project-1",
      avatarVideoPath: "/tmp/avatar.mp4",
      audioPath: "/tmp/speech.wav",
      subtitleText: "大家好",
      coverText: "通勤女包",
    });

    expect(result.videoPath).toBe("/tmp/mirax/project-1/final.mp4");
    expect(result.coverPath).toBe("/tmp/mirax/project-1/cover.png");
    expect(result.subtitlePath).toBe("/tmp/mirax/project-1/subtitles.srt");
  });
});
