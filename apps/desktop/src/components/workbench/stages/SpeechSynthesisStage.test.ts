import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const srcDir = path.resolve(__dirname);
const source = fs.readFileSync(path.join(srcDir, "SpeechSynthesisStage.vue"), "utf-8");
const template = source.match(/<template>([\s\S]*?)<\/template>/)?.[1] ?? "";
const appSource = fs.readFileSync(path.resolve(srcDir, "../../..", "App.vue"), "utf-8");

describe("SpeechSynthesisStage UI contracts", () => {
  it("renders a mock audio badge", () => {
    expect(source).toContain("Mock 音频");
  });

  it("renders an honest not-connected hint", () => {
    expect(source).toContain("真实 TTS 未连接");
    expect(source).toContain("请在设置中配置并启用 CosyVoice 或 ElevenLabs TTS provider 后再试");
  });

  it("renders a real-mode info hint", () => {
    expect(source).toContain("真实 TTS 模式：将使用设置中启用的 provider 发起真实语音合成。");
  });

  it("renders a failed-state error banner", () => {
    expect(template).toContain("status-banner status-error");
  });

  it("disables synthesize button in not-connected mode", () => {
    expect(template).toMatch(/:disabled="!canRun"/);
  });

  it("does not render apiKey, baseUrl, token or sk- literals in the template", () => {
    const lower = template.toLowerCase();
    expect(lower).not.toContain("apikey");
    expect(lower).not.toContain("baseurl");
    expect(lower).not.toContain("token");
    expect(lower).not.toContain("sk-");
  });

  it("App passes speech mode and safe error message into the stage", () => {
    expect(appSource).toContain(":mode=\"speechMode\"");
    expect(appSource).toContain(":error-message=\"speechErrorMessage\"");
  });

  it("App passes audio output root into the stage for restricted file reads", () => {
    expect(appSource).toContain(':audio-output-root="appSettings.outputPaths.audioOutput"');
  });

  it("does not rely on the unscoped asset protocol for audio preview", () => {
    expect(source).not.toContain("convertFileSrc");
    expect(source).not.toContain('"asset"');
  });

  it("App clears stale audio before real speech synthesis", () => {
    expect(appSource).toContain('if (speechMode === "real") {');
    expect(appSource).toContain('generatedAudioPath.value = "";');
    expect(appSource).toContain('generatedAudioDuration.value = 0;');
  });

  it("keeps manual synthesis on the speech result page", () => {
    expect(appSource).toContain("@run=\"runtime.runStage('speech', { autoAdvance: false })\"");
  });

  it("uses native desktop actions to export and reveal the generated audio", () => {
    expect(source).toContain('invoke<boolean>("export_audio_file"');
    expect(source).toContain('invoke("reveal_audio_file"');
    expect(template).toContain('@click="exportAudio"');
    expect(template).toContain('@click="revealAudio"');
    expect(template).not.toContain('title="本地文件夹访问待接入"');
    expect(template).not.toContain(':download="fileName"');
  });

  it("shows feedback when restoring settings or completing a file action", () => {
    expect(source).toContain('settingsMessage.value = "已恢复默认设置"');
    expect(template).toContain('class="action-feedback"');
  });
});
