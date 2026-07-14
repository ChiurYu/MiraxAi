import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const srcDir = path.resolve(__dirname);
const source = fs.readFileSync(path.join(srcDir, "VoiceCloningStage.vue"), "utf-8");
const template = source.match(/<template>([\s\S]*?)<\/template>/)?.[1] ?? "";
describe("VoiceCloningStage UI contracts", () => {
  it("keeps the pending sample path session-only and renders only its safe name", () => {
    expect(source).toContain("pendingSamplePath: string");
    expect(source).toContain("pendingSampleName: string");
    expect(source).toContain('"chooseSample": []');
    expect(source).not.toContain("voiceSamplePath");
    expect(template).not.toContain("pendingSamplePath");
    expect(template).toContain("pendingSampleName");
  });

  it("shows the explicitly selected voice-clone provider id and safe label", () => {
    expect(source).toContain("selectedProviderConfigId: string");
    expect(source).toContain("selectedProviderLabel: string");
    expect(template).toContain("声音克隆 Provider");
    expect(template).toContain("selectedProviderLabel");
    expect(template).toContain("selectedProviderConfigId");
  });

  it("starts with unchecked consent and warns about provider upload and credit use", () => {
    expect(source).toContain("consentAccepted: false");
    expect(template).toContain('type="checkbox"');
    expect(template).toContain('v-model="consent"');
    expect(template).toContain("声音样本将上传至所选服务");
    expect(template).toContain("额度或计费消耗");
  });

  it("requires sample, selected provider, voice name, consent, and a writable root before cloning", () => {
    expect(source).toMatch(/hasPendingSample\.value\s*&&\s*hasSelectedProvider\.value\s*&&\s*props\.voiceName\.trim\(\)\.length\s*>\s*0\s*&&\s*props\.consentAccepted\s*&&\s*props\.rootReady/);
    expect(template).toMatch(/:disabled="!canRun"/);
    expect(template).toContain("声音样本目录已就绪");
    expect(template).toContain("请先在设置中选择声音样本存储目录");
  });

  it("renders lifecycle state and only a safe lifecycle error", () => {
    expect(source).toContain("lifecycleState?: string");
    expect(template).toContain("lifecycleLabel");
    expect(source).toContain("errorMessage");
  });

  it("shows an unambiguous completed state and prevents duplicate cloning", () => {
    expect(source).toContain('Boolean(props.voiceId) && (props.status === "completed" || props.projectCloneBound)');
    expect(source).toContain('hasResult.value ? "远端声音已创建并绑定项目"');
    expect(source).toContain("&& !hasResult.value");
    expect(template).toContain('class="status-banner status-success"');
    expect(template).toContain("声音克隆已完成，可以进入语音合成。");
    expect(template).toContain('hasResult ? "克隆已完成"');
  });

  it("keeps destructive actions collapsed until the user explicitly opens management", () => {
    expect(template).toContain('<details v-if="managedSampleAvailable || projectCloneBound" class="deletion-actions">');
    expect(template).toContain("<summary>管理已克隆声音</summary>");
  });

  it("never calls a failed clone waiting when no readable provider error is returned", () => {
    expect(source).toContain('props.status === "failed"');
    expect(source).toContain("声音克隆失败，未返回可读错误。请查看本次会话诊断日志后重试。");
  });

  it("renders only clearable session diagnostics, not raw provider responses", () => {
    expect(source).toContain("diagnosticLogs?: Array");
    expect(source).toContain('"clearDiagnosticLogs": []');
    expect(template).toContain("本次会话诊断日志");
    expect(template).toContain("diagnosticLogs");
    expect(template).toContain("clearDiagnosticLogs");
  });

  it("does not render credentials, source paths, or raw provider responses", () => {
    const lower = template.toLowerCase();
    expect(lower).not.toContain("apikey");
    expect(lower).not.toContain("xi-api-key");
    expect(lower).not.toContain("token");
    expect(lower).not.toContain("raw response");
    expect(template).not.toContain("voiceSamplePath");
    expect(template).not.toContain("pendingSamplePath");
  });

  it("offers separate local-sample and project-binding deletion actions", () => {
    expect(source).toContain("managedSampleAvailable?: boolean");
    expect(source).toContain("projectCloneBound?: boolean");
    expect(source).toContain('"deleteManagedSample": []');
    expect(source).toContain('"removeProjectBinding": []');
    expect(template).toContain("删除本地托管样本");
    expect(template).toContain("移除项目声音绑定");
    expect(template).toContain("@click=\"emit('deleteManagedSample')\"");
    expect(template).toContain("@click=\"emit('removeProjectBinding')\"");
  });

  it("requires a second explicit confirmation before requesting remote voice deletion", () => {
    expect(source).toContain("remoteVoiceDeletable?: boolean");
    expect(source).toContain("const remoteDeleteConfirmationOpen = ref(false)");
    expect(source).toContain('"deleteRemoteVoice": []');
    expect(template).toContain("删除 ElevenLabs 远端声音");
    expect(template).toContain("确认删除远端声音");
    expect(template).toContain("remoteDeleteConfirmationOpen");
    expect(template).toContain("confirmRemoteVoiceDeletion");
    expect(template).toContain("另一条本地记录仍在引用");
  });

  it("keeps a long clone form top-aligned inside its scrollable panel", () => {
    const style = source.match(/<style scoped>([\s\S]*?)<\/style>/)?.[1] ?? "";
    const detailPanel = style.match(/\.voice-detail-panel\s*\{[\s\S]*?\n\}/)?.[0] ?? "";
    expect(detailPanel).toContain("align-items: flex-start");
    expect(detailPanel).toContain("overflow-y: auto");
  });

  it("uses a fixed-size checkbox so the global input width cannot squeeze consent copy", () => {
    const style = source.match(/<style scoped>([\s\S]*?)<\/style>/)?.[1] ?? "";
    expect(template).toContain('class="consent-checkbox"');
    expect(template).toContain('class="consent-copy"');
    expect(style).toContain("grid-template-columns: 20px minmax(0, 1fr)");
    expect(style).toContain("width: 20px");
  });

  it("shows a session-only HTTPS OSS URL input only when the selected provider requires it", () => {
    expect(source).toContain("requiresExternalSampleUrl?: boolean");
    expect(source).toContain("externalSampleUrl: string");
    expect(source).toContain('"update:externalSampleUrl"');
    expect(template).toContain("CosyVoice OSS 样本 URL");
    expect(template).toContain('v-if="requiresExternalSampleUrl"');
    expect(template).toContain("externalSampleUrl");
    expect(template).not.toContain("signature");
  });
});
