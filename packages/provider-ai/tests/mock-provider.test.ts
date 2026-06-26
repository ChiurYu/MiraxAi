import { describe, expect, it } from "vitest";
import { createMockAiProvider } from "../src/index.js";

describe("mock ai provider", () => {
  it("returns deterministic transcript and rewritten script from local inputs", async () => {
    const provider = createMockAiProvider();

    const transcript = await provider.transcribe({
      sourceVideoPath: "/tmp/demo.mp4",
      language: "zh-CN",
    });
    const rewritten = await provider.rewriteScript({
      transcript: transcript.text,
      productName: "轻奢女包",
      sellingPoints: ["通勤", "大容量"],
    });

    expect(transcript.text).toContain("demo.mp4");
    expect(rewritten.script).toContain("轻奢女包");
    expect(rewritten.titleSuggestions).toHaveLength(3);
    expect(rewritten.coverTextSuggestions).toHaveLength(2);
  });

  it("ignores optional rewrite fields and keeps existing behavior", async () => {
    const provider = createMockAiProvider();

    const rewritten = await provider.rewriteScript({
      transcript: "原始文案",
      productName: "通勤包",
      sellingPoints: ["大容量"],
      activeGoal: "种草",
      activePreset: "口播",
      targetLength: 300,
    });

    expect(rewritten.script).toContain("通勤包");
    expect(rewritten.script).toContain("大容量");
    expect(rewritten.titleSuggestions).toHaveLength(3);
    expect(rewritten.coverTextSuggestions).toHaveLength(2);
  });

  it("simulates voice and avatar generation with artifact paths", async () => {
    const provider = createMockAiProvider({ artifactRoot: "/tmp/mirax" });

    const voice = await provider.cloneVoice({
      voiceSamplePath: "/tmp/voice.wav",
      projectId: "project-1",
    });
    const speech = await provider.synthesizeSpeech({
      voiceId: voice.voiceId,
      script: "大家好，今天给大家介绍一款通勤包。",
      projectId: "project-1",
    });
    const avatar = await provider.generateAvatarVideo({
      audioPath: speech.audioPath,
      avatarId: "presenter-a",
      projectId: "project-1",
    });

    expect(voice.voiceId).toBe("mock-voice-project-1");
    expect(speech.audioPath).toBe("/tmp/mirax/project-1/speech.wav");
    expect(avatar.videoPath).toBe("/tmp/mirax/project-1/avatar.mp4");
  });
});
