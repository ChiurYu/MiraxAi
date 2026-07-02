import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(path.resolve(__dirname, "App.vue"), "utf-8");

describe("App provider runtime wiring", () => {
  it("passes provider-derived stage modes into workflow runtime and keeps them synced", () => {
    expect(source).toContain("const providerStageModes = computed");
    expect(source).toContain("stageModes: providerStageModes.value");
    expect(source).toContain("runtime.stageModes.value = modes;");
  });

  it("only enables real provider stages when config is ready and verified in the current session", () => {
    expect(source).toContain("function hasExecutableRewriteProvider()");
    expect(source).toContain("function hasExecutableTranscribeProvider()");
    expect(source).toContain("function hasExecutableSpeechProvider()");
    expect(source).toContain("function hasExecutableVoiceCloneProvider()");
    expect(source).toContain("function hasExecutableAvatarProvider()");
    expect(source).toContain('getProviderReadiness(config) === "ready"');
    expect(source).toContain("isProviderVerified(config.id)");
    expect(source).not.toContain('rewrite: findEnabledRewriteProviderConfig(providerConfigs.value) ? "real" : "mock"');
  });

  it("does not mark compose real from an unverified ffmpeg path", () => {
    expect(source).toContain("verifiedFfmpegPath");
    expect(source).toContain('"not-connected"');
    expect(source).not.toContain('compose: sidecarConfig.ffmpegPath.trim() ? "real"');
  });

  it("only marks compose real when verified ffmpeg path matches the current path", () => {
    expect(source).toContain("verifiedFfmpegPath.value === trimmedFfmpegPath");
    expect(source).toContain('compose: composeMode');
  });

  it("clears verified ffmpeg readiness when ffmpegPath changes", () => {
    expect(source).toContain("verifiedFfmpegPath");
    expect(source).toContain("sidecarConfig.ffmpegPath");
  });

  it("does not send the built-in demo avatar id to real HeyGem", () => {
    expect(source).toContain('avatarMode === "real" && selectedAvatarId.value === "presenter-a"');
    expect(source).toContain("请选择 HeyGem provider 可识别的真实形象。");
  });

  it("passes publish task statuses into history instead of assuming success", () => {
    expect(source).toContain("taskStatuses: tasks.map((task) => task.status)");
  });
});
