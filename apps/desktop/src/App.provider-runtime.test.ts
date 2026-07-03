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

  it("marks provider stages as not-connected when enabled but not verified, instead of falling back to mock", () => {
    expect(source).toContain("function hasEnabledTranscribeProvider()");
    expect(source).toContain("function hasEnabledSpeechProvider()");
    expect(source).toContain("function hasEnabledVoiceCloneProvider()");
    expect(source).toContain("function hasEnabledAvatarProvider()");
    expect(source).toMatch(
      /transcribe:\s*hasExecutableTranscribeProvider\(\)\s*\?\s*"real"\s*:\s*hasEnabledTranscribeProvider\(\)\s*\?\s*"not-connected"\s*:\s*"mock"/s,
    );
    expect(source).toMatch(
      /"voice-clone":\s*hasExecutableVoiceCloneProvider\(\)\s*\?\s*"real"\s*:\s*hasEnabledVoiceCloneProvider\(\)\s*\?\s*"not-connected"\s*:\s*"mock"/s,
    );
    expect(source).toMatch(
      /speech:\s*hasExecutableSpeechProvider\(\)\s*\?\s*"real"\s*:\s*hasEnabledSpeechProvider\(\)\s*\?\s*"not-connected"\s*:\s*"mock"/s,
    );
    expect(source).toMatch(
      /avatar:\s*hasExecutableAvatarProvider\(\)\s*\?\s*"real"\s*:\s*hasEnabledAvatarProvider\(\)\s*\?\s*"not-connected"\s*:\s*"mock"/s,
    );
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

  it("writes selected voice samplePath into project.voiceSamplePath for mock flow", () => {
    expect(source).toContain("function handleVoiceSelect(item: AssetListItem)");
    expect(source).toContain("if (item.samplePath)");
    expect(source).toContain("voiceSamplePath: item.samplePath");
  });

  it("passes publish task statuses into history instead of assuming success", () => {
    expect(source).toContain("taskStatuses: tasks.map((task) => task.status)");
  });

  it("wires ScriptRewritingStage transcript edits back to the persisted draft", () => {
    expect(source).toContain('v-model="project"');
    expect(source).toContain(":transcript-text=\"transcriptText\"");
    expect(source).toContain('@update:transcript-text=');
    expect(source).toContain("draft.transcriptText");
  });

  it("passes persisted rewrite UI options into rewriteScript call", () => {
    expect(source).toContain("activeGoal: draft.activeGoal");
    expect(source).toContain("activePreset: draft.activePreset");
    expect(source).toContain("targetLength: draft.targetLength");
  });

  it("binds activeGoal, activePreset and targetLength to ScriptRewritingStage as controlled props", () => {
    expect(source).toContain('v-model:active-goal="draft.activeGoal"');
    expect(source).toContain('v-model:active-preset="draft.activePreset"');
    expect(source).toContain('v-model:target-length="draft.targetLength"');
  });

  it("syncs async restored draft state into workflow runtime", () => {
    expect(source).toContain("ready: draftReady");
    expect(source).toContain("function syncRuntimeFromDraft()");
    expect(source).toContain("void draftReady.then(syncRuntimeFromDraft)");
  });

  it("extracts audio before real transcribe when sourceVideoPath is present", () => {
    expect(source).toContain("selectAudioExtractor");
    expect(source).toContain("extract_audio");
    expect(source).toContain("audioPath");
  });
});
