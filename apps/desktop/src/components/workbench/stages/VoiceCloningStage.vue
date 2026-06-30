<script setup lang="ts">
import { CheckCircle2, Info, Loader2, Plus, Volume2 } from "lucide-vue-next";
import { computed } from "vue";
import type { ProjectDraft, WorkflowStageRuntimeMode, WorkflowStageStatus } from "@mirax/core";
import PathPickerButton from "../../PathPickerButton.vue";

const props = defineProps<{
  modelValue: ProjectDraft;
  scriptText: string;
  voiceId: string;
  voiceName: string;
  running: boolean;
  status: WorkflowStageStatus;
  mode?: WorkflowStageRuntimeMode;
  errorMessage?: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: ProjectDraft];
  run: [];
  createVoice: [];
}>();

const voiceSamplePath = computed({
  get: () => props.modelValue.voiceSamplePath ?? "",
  set: (value) => emit("update:modelValue", { ...props.modelValue, voiceSamplePath: value }),
});

const audioFilters = [
  { name: "音频文件", extensions: ["wav", "mp3", "m4a", "flac", "aac"] },
];

const hasSample = computed(() => voiceSamplePath.value.trim().length > 0);
const isMock = computed(() => props.mode === "mock" || props.mode === undefined);
const isReal = computed(() => props.mode === "real");
const isNotConnected = computed(() => props.mode === "not-connected");
const hasError = computed(() => !!props.errorMessage?.trim());
const hasResult = computed(() => props.status === "completed" && Boolean(props.voiceId));
const canRun = computed(() => hasSample.value && !props.running && !isNotConnected.value);
const scriptLength = computed(() => props.scriptText.trim().length);
const modeLabel = computed(() => {
  if (isMock.value) return "Mock 声音";
  if (isReal.value) return "真实声音克隆";
  if (isNotConnected.value) return "真实声音克隆未连接";
  return "";
});

function fileName(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) return "";
  const index = Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("\\"));
  return index >= 0 ? trimmed.slice(index + 1) : trimmed;
}

function handleConfirm() {
  if (!canRun.value) return;
  emit("run");
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
          本地样本路径
        </label>
        <PathPickerButton
          v-model="voiceSamplePath"
          label="选择声音样本"
          :filters="audioFilters"
          placeholder="请选择 .wav / .mp3 等音频文件"
        />
        <p v-if="!hasSample" class="sample-hint">
          请先选择一段清晰的干声样本，系统将据此克隆音色。
        </p>
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
          <span>真实声音克隆未连接。请在设置中配置并启用 CosyVoice provider。</span>
        </div>
        <div v-else-if="isReal && hasError" class="status-banner status-error">
          <Info :size="16" />
          <span>{{ errorMessage }}</span>
        </div>
        <div v-else-if="isReal && status !== 'completed'" class="status-banner status-info">
          <Info :size="16" />
          <span>真实声音克隆模式：将使用设置中启用的 provider 生成 voiceId。</span>
        </div>

        <div class="detail-meta">
          <div class="meta-cell">
            <span class="meta-key">样本文件</span>
            <span class="meta-val">{{ fileName(voiceSamplePath) || "未选择" }}</span>
          </div>
          <div class="meta-cell">
            <span class="meta-key">文案长度</span>
            <span class="meta-val">{{ scriptLength }} 字</span>
          </div>
        </div>

        <button
          class="primary confirm-button"
          type="button"
          :disabled="!canRun"
          @click="handleConfirm"
        >
          <Loader2 v-if="running" :size="16" class="spin" />
          <CheckCircle2 v-else :size="16" />
          <span>{{ running ? "克隆中" : "开始克隆" }}</span>
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

.voice-detail-panel {
  display: flex;
  align-items: center;
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
