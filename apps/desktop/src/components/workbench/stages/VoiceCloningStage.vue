<script setup lang="ts">
import { CheckCircle2, Info, Loader2, Plus, Volume2 } from "lucide-vue-next";
import { computed, ref } from "vue";
import type { WorkflowStageRuntimeMode, WorkflowStageStatus } from "@mirax/core";

const props = withDefaults(defineProps<{
  scriptText: string;
  voiceId?: string;
  voiceName?: string;
  pendingSamplePath: string;
  pendingSampleName: string;
  selectedProviderConfigId: string;
  selectedProviderLabel: string;
  externalSampleUrl: string;
  requiresExternalSampleUrl?: boolean;
  providerOptions?: Array<{ id: string; label: string }>;
  consentAccepted?: boolean;
  rootReady?: boolean;
  lifecycleState?: string;
  managedSampleAvailable?: boolean;
  projectCloneBound?: boolean;
  remoteVoiceDeletable?: boolean;
  remoteVoiceDeleteBlockedMessage?: string;
  running: boolean;
  status: WorkflowStageStatus;
  mode?: WorkflowStageRuntimeMode;
  errorMessage?: string;
  diagnosticLogs?: Array<{ id: number; timestamp: string; message: string }>;
}>(), {
  voiceId: "",
  voiceName: "",
  consentAccepted: false,
  rootReady: false,
  lifecycleState: "",
  managedSampleAvailable: false,
  projectCloneBound: false,
  remoteVoiceDeletable: false,
  requiresExternalSampleUrl: false,
  remoteVoiceDeleteBlockedMessage: "远端声音可能仍被另一条本地记录引用，暂时无法删除。",
  errorMessage: "",
  diagnosticLogs: () => [],
});

const emit = defineEmits<{
  "update:voiceName": [value: string];
  "update:consentAccepted": [value: boolean];
  "update:selectedProviderConfigId": [value: string];
  "update:externalSampleUrl": [value: string];
  "chooseSample": [];
  "deleteManagedSample": [];
  "removeProjectBinding": [];
  "deleteRemoteVoice": [];
  "clearDiagnosticLogs": [];
  run: [];
  createVoice: [];
}>();

const editableVoiceName = computed({
  get: () => props.voiceName,
  set: (value: string) => emit("update:voiceName", value),
});

const consent = computed({
  get: () => props.consentAccepted,
  set: (value: boolean) => emit("update:consentAccepted", value),
});
const selectedProvider = computed({
  get: () => props.selectedProviderConfigId,
  set: (value: string) => emit("update:selectedProviderConfigId", value),
});
const externalSampleUrl = computed({
  get: () => props.externalSampleUrl,
  set: (value: string) => emit("update:externalSampleUrl", value),
});
const hasPendingSample = computed(() => props.pendingSamplePath.trim().length > 0);
const hasSelectedProvider = computed(() => props.selectedProviderConfigId.trim().length > 0);
const isMock = computed(() => props.mode === "mock" || props.mode === undefined);
const isReal = computed(() => props.mode === "real");
const isNotConnected = computed(() => props.mode === "not-connected");
const hasError = computed(() => props.status === "failed" || !!props.errorMessage?.trim());
const displayedErrorMessage = computed(() => props.errorMessage?.trim() || "声音克隆失败，未返回可读错误。请查看本次会话诊断日志后重试。");
const hasResult = computed(() => Boolean(props.voiceId) && (props.status === "completed" || props.projectCloneBound));
const canRun = computed(() => hasPendingSample.value
  && hasSelectedProvider.value
  && props.voiceName.trim().length > 0
  && props.consentAccepted
  && props.rootReady
  && (!props.requiresExternalSampleUrl || externalSampleUrl.value.trim().startsWith("https://"))
  && !hasResult.value
  && !props.running
  && !isNotConnected.value);
const scriptLength = computed(() => props.scriptText.trim().length);
const modeLabel = computed(() => {
  if (isMock.value) return "Mock 声音";
  if (isReal.value) return "真实声音克隆";
  if (isNotConnected.value) return "真实声音克隆未连接";
  return "";
});
const lifecycleLabel = computed(() => props.lifecycleState || (hasResult.value ? "远端声音已创建并绑定项目" : "尚未创建远端声音"));
const remoteDeleteConfirmationOpen = ref(false);

function handleConfirm() {
  if (!canRun.value) return;
  emit("run");
}

function requestRemoteVoiceDeletion() {
  if (props.running || !props.remoteVoiceDeletable) return;
  remoteDeleteConfirmationOpen.value = true;
}

function confirmRemoteVoiceDeletion() {
  if (props.running || !props.remoteVoiceDeletable || !remoteDeleteConfirmationOpen.value) return;
  remoteDeleteConfirmationOpen.value = false;
  emit("deleteRemoteVoice");
}
</script>

<template>
  <div class="voice-stage">
    <div class="voice-list-panel">
      <div class="list-head">
        <h2 class="panel-title">声音样本</h2>
        <p class="panel-sub">选择用于克隆的音频文件 · {{ scriptLength }} 字文案待配音</p>
      </div>

      <section class="sample-section">
        <label class="field-label">
          <Volume2 :size="14" />
          声音样本
        </label>
        <button class="secondary choose-sample" type="button" :disabled="running" @click="emit('chooseSample')">
          <Plus :size="16" />
          <span>{{ pendingSampleName || "选择声音样本" }}</span>
        </button>
        <p v-if="!hasPendingSample" class="sample-hint">
          请先选择一段清晰的干声样本，系统将据此克隆音色。
        </p>
        <p v-else class="sample-hint">已选择：{{ pendingSampleName }}</p>
      </section>

      <button class="secondary new-voice" type="button" @click="emit('createVoice')">
        <Plus :size="16" />
        <span>新建声音</span>
      </button>
    </div>

    <div class="voice-detail-panel">
      <div class="detail-card">
        <div class="detail-header">
          <div class="detail-title-row">
            <h2 class="detail-name">{{ voiceName || "未选择声音" }}</h2>
            <span v-if="modeLabel" class="mode-badge">{{ modeLabel }}</span>
            <span v-if="hasResult" class="voice-badge ready">已就绪</span>
            <span v-else-if="running" class="voice-badge training">克隆中</span>
            <span v-else-if="hasError" class="voice-badge failed">失败</span>
            <span v-else class="voice-badge training">待克隆</span>
          </div>
          <p class="detail-desc">
            {{ voiceId ? `Voice ID：${voiceId}` : "选择样本后点击「开始克隆」，生成 voiceId 后进入语音合成。" }}
          </p>
        </div>

        <div v-if="isNotConnected" class="status-banner status-warning">
          <Info :size="16" />
          <span>真实声音克隆未连接。请在设置中配置并明确选择声音克隆 Provider。</span>
        </div>
        <div v-else-if="isReal && hasError" class="status-banner status-error">
          <Info :size="16" />
          <span>{{ displayedErrorMessage }}</span>
        </div>
        <div v-else-if="hasResult" class="status-banner status-success">
          <CheckCircle2 :size="16" />
          <span>声音克隆已完成，可以进入语音合成。</span>
        </div>
        <div v-else-if="isReal && status !== 'completed'" class="status-banner status-info">
          <Info :size="16" />
          <span>真实声音克隆将使用下方明确选择的 Provider。</span>
        </div>

        <section v-if="diagnosticLogs.length > 0" class="diagnostic-log-panel" aria-label="本次会话诊断日志">
          <div class="diagnostic-log-header">
            <span class="field-label">本次会话诊断日志</span>
            <button class="diagnostic-clear" type="button" :disabled="running" @click="emit('clearDiagnosticLogs')">清除</button>
          </div>
          <ol class="diagnostic-log-list">
            <li v-for="entry in diagnosticLogs" :key="entry.id">
              <time>{{ entry.timestamp }}</time>
              <span>{{ entry.message }}</span>
            </li>
          </ol>
        </section>

        <div class="detail-meta">
          <div class="meta-cell">
            <span class="meta-key">样本文件</span>
            <span class="meta-val">{{ pendingSampleName || "未选择" }}</span>
          </div>
          <div class="meta-cell">
            <span class="meta-key">声音克隆 Provider</span>
            <span class="meta-val">{{ selectedProviderLabel || "未选择" }}</span>
            <span class="meta-id">{{ selectedProviderConfigId || "未选择配置 ID" }}</span>
          </div>
          <div class="meta-cell">
            <span class="meta-key">远端状态</span>
            <span class="meta-val">{{ lifecycleLabel }}</span>
          </div>
          <div class="meta-cell">
            <span class="meta-key">文案长度</span>
            <span class="meta-val">{{ scriptLength }} 字</span>
          </div>
        </div>

        <label class="sample-section">
          <span class="field-label">声音克隆 Provider</span>
          <select v-model="selectedProvider" class="field-input" :disabled="running">
            <option value="">请选择声音克隆 Provider</option>
            <option v-for="provider in providerOptions" :key="provider.id" :value="provider.id">{{ provider.label }}</option>
          </select>
        </label>

        <label class="sample-section">
          <span class="field-label">声音名称</span>
          <input v-model="editableVoiceName" class="field-input" type="text" :disabled="running" placeholder="例如：我的旁白声音" />
        </label>

        <label v-if="requiresExternalSampleUrl" class="sample-section">
          <span class="field-label">CosyVoice OSS 样本 URL</span>
          <input v-model="externalSampleUrl" class="field-input" type="url" inputmode="url" :disabled="running" placeholder="https://…" />
          <span class="sample-hint">请手工上传当前所选样本的同一份副本，并粘贴短期 HTTPS 访问地址；该地址仅用于本次克隆。</span>
        </label>

        <div class="root-status" :class="rootReady ? 'ready' : 'warning'">
          <CheckCircle2 :size="16" />
          <span>{{ rootReady ? "声音样本目录已就绪" : "请先在设置中选择声音样本存储目录" }}</span>
        </div>

        <label class="consent-row">
          <input v-model="consent" class="consent-checkbox" type="checkbox" :disabled="running" />
          <span class="consent-copy">我确认拥有该声音样本的使用授权；声音样本将上传至所选服务，可能产生其账户额度或计费消耗。</span>
        </label>

        <details v-if="managedSampleAvailable || projectCloneBound" class="deletion-actions">
          <summary>管理已克隆声音</summary>
          <p v-if="managedSampleAvailable" class="sample-hint">删除本地托管样本不会删除远端声音或项目绑定。</p>
          <button
            v-if="managedSampleAvailable"
            class="secondary destructive"
            type="button"
            :disabled="running"
            @click="emit('deleteManagedSample')"
          >
            删除本地托管样本
          </button>
          <button
            v-if="projectCloneBound"
            class="secondary destructive"
            type="button"
            :disabled="running"
            @click="emit('removeProjectBinding')"
          >
            移除项目声音绑定
          </button>
          <div v-if="projectCloneBound && (remoteVoiceDeletable || remoteVoiceDeleteBlockedMessage)" class="remote-delete-actions">
            <p v-if="!remoteVoiceDeletable" class="sample-hint">{{ remoteVoiceDeleteBlockedMessage }} 另一条本地记录仍在引用时不可删除。</p>
            <button
              class="secondary destructive"
              type="button"
              :disabled="running || !remoteVoiceDeletable"
              @click="requestRemoteVoiceDeletion"
            >
              删除 ElevenLabs 远端声音
            </button>
          </div>
          <div v-if="remoteDeleteConfirmationOpen" class="remote-delete-confirmation">
            <p>此操作会删除 ElevenLabs 中的远端声音，且不可恢复。请再次确认。</p>
            <div class="confirmation-actions">
              <button class="secondary" type="button" :disabled="running" @click="remoteDeleteConfirmationOpen = false">取消</button>
              <button class="secondary destructive" type="button" :disabled="running" @click="confirmRemoteVoiceDeletion">确认删除远端声音</button>
            </div>
          </div>
        </details>

        <button
          class="primary confirm-button"
          type="button"
          :disabled="!canRun"
          @click="handleConfirm"
        >
          <Loader2 v-if="running" :size="16" class="spin" />
          <CheckCircle2 v-else :size="16" />
          <span>{{ running ? "克隆中" : hasResult ? "克隆已完成" : "开始克隆" }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.voice-stage {
  display: grid;
  grid-template-columns: 360px minmax(0, 1fr);
  width: 100%;
  height: 100%;
  min-height: 0;
}

.voice-list-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
  border-right: 1px solid var(--mx-border-subtle);
  background: var(--mx-bg-surface);
  min-width: 0;
  overflow-y: auto;
}

.list-head {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.panel-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--mx-text-primary);
}

.panel-sub {
  margin: 0;
  font-size: 12px;
  color: var(--mx-text-tertiary);
}

.sample-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.field-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  color: var(--mx-text-tertiary);
}

.sample-hint {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--mx-text-tertiary);
}

.new-voice {
  height: 40px;
  width: 100%;
  border-style: dashed;
}

.choose-sample {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 40px;
}

.voice-detail-panel {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 32px;
  background: var(--mx-bg-base);
  min-width: 0;
  overflow-y: auto;
}

.detail-card {
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
  max-width: 520px;
  padding: 28px;
  border: 1px solid var(--mx-border-subtle);
  border-radius: var(--mx-radius-lg);
  background: var(--mx-bg-surface);
  box-shadow: var(--mx-shadow-md);
}

.detail-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.detail-name {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: var(--mx-text-primary);
}

.detail-desc {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--mx-text-secondary);
}

.voice-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: var(--mx-radius-pill);
  font-size: 10px;
  font-weight: 600;
}

.voice-badge.ready {
  color: var(--mx-success);
  background: var(--mx-success-bg);
}

.voice-badge.training {
  color: var(--mx-warning);
  background: var(--mx-warning-bg);
}

.voice-badge.failed {
  color: var(--mx-error);
  background: var(--mx-error-bg);
}

.mode-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: var(--mx-radius-pill);
  font-size: 10px;
  font-weight: 600;
  color: var(--mx-text-secondary);
  background: var(--mx-bg-muted);
}

.status-banner {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: var(--mx-radius-md);
  font-size: 12px;
  line-height: 1.5;
}

.status-info {
  color: var(--mx-info);
  background: var(--mx-info-bg);
}

.status-warning {
  color: var(--mx-warning);
  background: var(--mx-warning-bg);
}

.status-error {
  color: var(--mx-error);
  background: var(--mx-error-bg);
}

.status-success {
  color: var(--mx-success);
  background: var(--mx-success-bg);
}

.diagnostic-log-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--mx-border-subtle);
  border-radius: var(--mx-radius-md);
  background: var(--mx-bg-base);
}

.diagnostic-log-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.diagnostic-clear {
  border: 0;
  padding: 0;
  color: var(--mx-text-secondary);
  background: transparent;
  cursor: pointer;
}

.diagnostic-clear:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.diagnostic-log-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.diagnostic-log-list li {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 8px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--mx-text-secondary);
}

.diagnostic-log-list time {
  color: var(--mx-text-tertiary);
  white-space: nowrap;
}

.diagnostic-log-list span {
  min-width: 0;
  overflow-wrap: anywhere;
}

.detail-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.meta-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.meta-key {
  font-size: 11px;
  letter-spacing: 0.3px;
  color: var(--mx-text-tertiary);
}

.meta-val {
  font-size: 13px;
  font-weight: 600;
  color: var(--mx-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.meta-id {
  overflow: hidden;
  color: var(--mx-text-tertiary);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.field-input {
  width: 100%;
  min-height: 40px;
  box-sizing: border-box;
  padding: 0 12px;
  border: 1px solid var(--mx-border-subtle);
  border-radius: var(--mx-radius-md);
  color: var(--mx-text-primary);
  background: var(--mx-bg-base);
}

.root-status,
.consent-row {
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  line-height: 1.5;
}

.root-status {
  display: flex;
}

.root-status.ready {
  color: var(--mx-success);
}

.root-status.warning {
  color: var(--mx-warning);
}

.consent-row {
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr);
  margin: 0;
  color: var(--mx-text-secondary);
}

.consent-checkbox {
  box-sizing: border-box;
  width: 20px;
  min-width: 20px;
  height: 20px;
  min-height: 20px;
  margin: 0;
  padding: 0;
}

.consent-copy {
  min-width: 0;
}

.deletion-actions,
.remote-delete-confirmation {
  padding: 14px;
  border: 1px solid var(--mx-border-subtle);
  border-radius: var(--mx-radius-md);
}

.deletion-actions summary {
  cursor: pointer;
  color: var(--mx-text-secondary);
  font-size: 12px;
  font-weight: 600;
}

.deletion-actions[open] {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.remote-delete-confirmation {
  color: var(--mx-error);
  background: var(--mx-error-bg);
}

.remote-delete-confirmation p {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
}

.confirmation-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.destructive {
  color: var(--mx-error);
}

.confirm-button {
  align-self: flex-end;
  height: 40px;
  padding: 0 20px;
  font-size: 13px;
  font-weight: 600;
}

@media (max-width: 1100px) {
  .voice-stage {
    grid-template-columns: 1fr;
  }

  .voice-list-panel {
    border-right: 0;
    border-bottom: 1px solid var(--mx-border-subtle);
  }
}
</style>
