import type { ApiKeyProviderConfig } from "@mirax/core";
import type { AiProvider } from "@mirax/provider-ai";
import type { ProjectVoiceCloneRecord, VoiceSampleRecord, VoiceSampleStorageRootRecord } from "@mirax/local-store";
import type { ManagedVoiceSampleMetadata } from "./tauriVoiceSamples.js";

export type RunVoiceCloneInput = {
  projectId: string;
  providerConfigId: string;
  sourcePath: string;
  voiceName: string;
  /** 百炼 CosyVoice 的单次 OSS HTTPS 样本 URL；绝不持久化。 */
  externalSampleUrl?: string;
  consent: { accepted: true; policyVersion: string; acceptedAt: string };
};

export class VoiceCloneLifecycleError extends Error {
  constructor(readonly code: "local-store-unavailable" | "consent-required" | "not-configured" | "invalid-source" | "remote-outcome-unrecorded" | "activation-failed", message: string) {
    super(message);
    this.name = "VoiceCloneLifecycleError";
  }
}

type CloneProvider = Pick<AiProvider, "cloneVoice"> & { deleteRemoteVoice?(voiceId: string): Promise<void> };

export interface VoiceCloneLifecycleDeps {
  requireDb(): Promise<unknown>;
  requireActiveWritableRoot(): Promise<VoiceSampleStorageRootRecord>;
  providerConfig: ApiKeyProviderConfig;
  provider: CloneProvider;
  validateSource(path: string): Promise<boolean>;
  createId(): string;
  now(): string;
  saveSample(record: VoiceSampleRecord): Promise<void>;
  saveClone(record: ProjectVoiceCloneRecord): Promise<void>;
  importManagedVoiceSample(input: { sourcePath: string; allowedRoot: string; relativePath: string }): Promise<ManagedVoiceSampleMetadata>;
  readManagedVoiceSample(input: { path: string; allowedRoot: string }): Promise<Uint8Array>;
  replaceActiveProjectVoiceClone(db: unknown, projectId: string, cloneId: string): Promise<void>;
}

export async function runVoiceClone(input: RunVoiceCloneInput, deps: VoiceCloneLifecycleDeps): Promise<ProjectVoiceCloneRecord> {
  let db: unknown;
  let root: VoiceSampleStorageRootRecord;
  try {
    db = await deps.requireDb();
    root = await deps.requireActiveWritableRoot();
  } catch {
    throw new VoiceCloneLifecycleError("local-store-unavailable", "本地 SQLite 或声音样本目录不可用。");
  }
  if (!input.consent?.accepted) throw new VoiceCloneLifecycleError("consent-required", "请先确认拥有声音样本授权。");
  if (!input.voiceName.trim() || !input.sourcePath.trim()) throw new VoiceCloneLifecycleError("not-configured", "声音克隆参数不完整。");
  if (!isReadyVoiceCloneConfig(input.providerConfigId, deps.providerConfig)) {
    throw new VoiceCloneLifecycleError("not-configured", "请选择已启用且配置完整的声音克隆 provider。");
  }
  if (deps.providerConfig.provider === "bailian-cosyvoice" && !isHttpsUrl(input.externalSampleUrl ?? "")) {
    throw new VoiceCloneLifecycleError("not-configured", "百炼 CosyVoice 需要有效的 HTTPS 样本地址。");
  }
  if (!(await deps.validateSource(input.sourcePath))) throw new VoiceCloneLifecycleError("invalid-source", "声音样本文件无效。");

  const sampleId = deps.createId();
  const fileName = safeFileName(input.sourcePath);
  const relativePath = `${sampleId}/${fileName}`;
  const createdAt = deps.now();
  let sample: VoiceSampleRecord = {
    id: sampleId, storageRootId: root.id, relativePath, originalFileName: fileName, mimeType: "", sizeBytes: 0,
    consentedAt: input.consent.acceptedAt, consentPolicyVersion: input.consent.policyVersion, state: "creating", createdAt,
  };
  let clone: ProjectVoiceCloneRecord = {
    id: `${sampleId}-clone`, projectId: input.projectId, sampleId, providerConfigId: input.providerConfigId,
    provider: deps.providerConfig.provider, state: "creating", createdAt,
  };
  await deps.saveSample(sample);
  await deps.saveClone(clone);

  const imported = await deps.importManagedVoiceSample({ sourcePath: input.sourcePath, allowedRoot: root.path, relativePath });
  sample = { ...sample, relativePath: imported.relativePath, originalFileName: imported.fileName, mimeType: imported.mimeType, sizeBytes: imported.sizeBytes, state: "managed" };
  await deps.saveSample(sample);

  const managedPath = joinPath(root.path, imported.relativePath);
  clone = { ...clone, requestStartedAt: deps.now() };
  await deps.saveClone(clone);
  await deps.readManagedVoiceSample({ path: managedPath, allowedRoot: root.path });

  const remote = await deps.provider.cloneVoice({
    voiceSamplePath: managedPath,
    projectId: input.projectId,
    sampleId,
    voiceName: input.voiceName.trim(),
    externalSampleUrl: input.externalSampleUrl,
  });
  clone = { ...clone, remoteVoiceId: remote.voiceId, remoteCreatedAt: deps.now(), state: "remote-created" };
  try {
    await deps.saveClone(clone);
  } catch {
    await cleanupRemoteVoice(deps.provider, remote.voiceId);
    throw new VoiceCloneLifecycleError("remote-outcome-unrecorded", "远端声音已创建，但本地记录未保存；未激活该声音。");
  }
  if (remote.requiresVerification) {
    clone = { ...clone, state: "pending-verification" };
    await deps.saveClone(clone);
    return clone;
  }
  try {
    await deps.replaceActiveProjectVoiceClone(db, input.projectId, clone.id);
    return { ...clone, state: "active" };
  } catch {
    const cleanupSucceeded = await cleanupRemoteVoice(deps.provider, remote.voiceId);
    clone = { ...clone, state: cleanupSucceeded ? "failed" : "remote-cleanup-required" };
    await deps.saveClone(clone);
    throw new VoiceCloneLifecycleError("activation-failed", "本地项目声音绑定失败，远端声音已保留或等待清理。");
  }
}

function isReadyVoiceCloneConfig(id: string, config: ApiKeyProviderConfig): boolean {
  if (config.id !== id || !config.enabled || !config.apiKey.trim() || !config.model?.trim()) return false;
  if (config.provider === "elevenlabs-tts") return true;
  return (config.provider === "bailian-qwen-tts" || config.provider === "bailian-cosyvoice") && Boolean(config.baseUrl?.trim());
}

function isHttpsUrl(value: string): boolean {
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}

async function cleanupRemoteVoice(provider: CloneProvider, voiceId: string): Promise<boolean> {
  if (!provider.deleteRemoteVoice) return false;
  try {
    await provider.deleteRemoteVoice(voiceId);
    return true;
  } catch {
    return false;
  }
}

function safeFileName(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).pop() || "sample";
}

function joinPath(root: string, relative: string): string {
  return `${root.replace(/[\\/]+$/, "")}/${relative}`;
}
