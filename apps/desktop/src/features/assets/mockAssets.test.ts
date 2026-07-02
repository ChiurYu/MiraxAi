import { describe, expect, it } from "vitest";
import { voiceAssets } from "./mockAssets.js";

describe("mock voice assets", () => {
  it("provides a samplePath only for ready voices", () => {
    for (const voice of voiceAssets) {
      if (voice.status === "ready") {
        expect(voice.samplePath, `ready voice ${voice.id} should have samplePath`).toBeTruthy();
        expect(voice.samplePath, `ready voice ${voice.id} samplePath should end with .wav`).toMatch(/\.wav$/i);
      } else {
        expect(voice.samplePath, `non-ready voice ${voice.id} should not have samplePath`).toBeUndefined();
      }
    }
  });

  it("uses deterministic mock sample paths", () => {
    const readyVoices = voiceAssets.filter((v) => v.status === "ready");
    const paths = readyVoices.map((v) => v.samplePath);
    expect(new Set(paths).size).toBe(readyVoices.length);
    for (const p of paths) {
      expect(p).toMatch(/^\/tmp\/mirax-ai\/mock-voice-samples\/voice-[a-z0-9-]+\.wav$/);
    }
  });
});
