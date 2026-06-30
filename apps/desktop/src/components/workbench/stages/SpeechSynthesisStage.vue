<script setup lang="ts">
import {
  Download,
  FileAudio,
  FolderOpen,
  Info,
  Loader2,
  Mic,
  Pencil,
  RotateCcw,
  Sparkles,
  Volume2,
  Waypoints,
} from "lucide-vue-next";
import { ChevronDown } from "lucide-vue-next";
import { computed, ref } from "vue";
import type { ProjectDraft, WorkflowStageRuntimeMode, WorkflowStageStatus } from "@mirax/core";
import { convertFileSrc } from "@tauri-apps/api/core";

const props = defineProps<{
  modelValue: ProjectDraft;
  voiceName: string;
  running: boolean;
  status: WorkflowStageStatus;
  audioPath: string;
  audioDuration: number;
  mode?: WorkflowStageRuntimeMode;
  errorMessage?: string;
}>();

const emit = defineEmits<{
  run: [];
  editScript: [];
  changeVoice: [];
}>();

const scriptTitle = computed(() => `${props.modelValue.name || "口播视频"}口播文案`);
const scriptText = computed(() => props.modelValue.notes ?? "");
const scriptLength = computed(() => scriptText.value.trim().length);

// 语速、情绪、高级设置均为本阶段 UI 状态；mock provider 暂不消费这些参数。
const SPEED_DEFAULT = 1;
const EMOTION_DEFAULT = "专业";
const speed = ref(SPEED_DEFAULT);
const emotions = ["自然", "专业", "轻快", "沉稳"] as const;
const emotion = ref<(typeof emotions)[number]>(EMOTION_DEFAULT);
const advancedOpen = ref(false);
const pitch = ref(50);
const pauseStrength = ref(50);

const estimatedSeconds = computed(() => {
  const base = Math.max(3, Math.ceil((scriptLength.value || 245) / 5));
  return Math.round(base / speed.value);
});

const hasResult = computed(
  () => props.status === "completed" && Boolean(props.audioPath),
);
const isMock = computed(() => props.mode === "mock" || props.mode === undefined);
const isReal = computed(() => props.mode === "real");
const isNotConnected = computed(() => props.mode === "not-connected");
const hasError = computed(() => !!props.errorMessage?.trim());
const canRun = computed(() => !props.running && !isNotConnected.value);
const modeLabel = computed(() => {
  if (isMock.value) return "Mock 音频";
  if (isReal.value) return "真实 TTS";
  if (isNotConnected.value) return "真实 TTS 未连接";
  return "";
});
const resultDurationLabel = computed(() => {
  if (props.audioDuration > 0) return formatTime(props.audioDuration);
  if (isMock.value) return formatTime(estimatedSeconds.value);
  return "时长未知";
});

function basename(filePath: string): string {
  const trimmed = filePath.trim();
  if (!trimmed) return "";
  return trimmed.split(/[\\/]/).filter(Boolean).at(-1) ?? trimmed;
}

const fileName = computed(() =>
  hasResult.value ? basename(props.audioPath) : `${props.modelValue.name || "口播视频"}_${props.voiceName}_v1.wav`,
);

function isTauriAvailable(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

const audioSrc = computed(() => {
  if (!props.audioPath) return "";
  if (isTauriAvailable()) {
    return convertFileSrc(props.audioPath, "asset");
  }
  return props.audioPath;
});

const canPlay = computed(() => hasResult.value && isTauriAvailable() && Boolean(audioSrc.value));

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

function resetSettings() {
  speed.value = SPEED_DEFAULT;
  emotion.value = EMOTION_DEFAULT;
  pitch.value = 50;
  pauseStrength.value = 50;
}

function handleSynthesize() {
  if (!canRun.value) return;
  emit("run");
}
</script>

<template>
  <div class="speech-stage">
    <div class="speech-controls">
      <section class="panel">
        <div class="panel-head">
          <h3 class="panel-title">输入摘要</h3>
          <span class="status-pill ready">已就绪</span>
        </div>
        <div class="summary-grid">
          <div class="summary-cell">
            <span class="summary-key">文案标题</span>
            <span class="summary-val">{{ scriptTitle }}</span>
          </div>
          <div class="summary-cell">
            <span class="summary-key">字数统计</span>
            <span class="summary-val">{{ scriptLength }} 字</span>
          </div>
          <div class="summary-cell">
            <span class="summary-key">选择声音</span>
            <span class="summary-val with-icon"
              ><Volume2 :size="14" /> {{ voiceName || "未选择" }}</span
            >
          </div>
          <div class="summary-cell">
            <span class="summary-key">当前风格</span>
            <span class="summary-val">{{ emotion }}</span>
          </div>
        </div>
        <div class="summary-actions">
          <button class="secondary" type="button" @click="emit('editScript')">
            <Pencil :size="14" />
            <span>编辑文案</span>
          </button>
          <button class="secondary" type="button" @click="emit('changeVoice')">
            <Mic :size="14" />
            <span>更换声音</span>
          </button>
        </div>
      </section>

      <section class="panel">
        <div class="panel-head">
          <h3 class="panel-title">合成设置</h3>
          <span v-if="modeLabel" class="mode-badge">{{ modeLabel }}</span>
        </div>

        <div v-if="isNotConnected" class="status-banner status-warning">
          <Info :size="14" />
          <span>真实 TTS 未连接。请在设置中配置并启用 CosyVoice provider 后再试。</span>
        </div>
        <div v-else-if="isReal && hasError" class="status-banner status-error">
          <Info :size="14" />
          <span>{{ errorMessage }}</span>
        </div>
        <div v-else-if="isReal && status !== 'completed'" class="status-banner status-info">
          <Info :size="14" />
          <span>真实 TTS 模式：将使用设置中启用的 provider 发起真实语音合成。</span>
        </div>

        <div class="setting-block">
          <div class="slider-head">
            <span class="setting-label">语速调节</span>
            <span class="slider-value">{{ speed.toFixed(1) }}x</span>
          </div>
          <input
            v-model.number="speed"
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            class="mx-range"
            :disabled="running"
          />
          <div class="slider-scale">
            <span>0.5x</span>
            <span>2.0x</span>
          </div>
        </div>

        <div class="setting-block">
          <span class="setting-label">情绪/语气</span>
          <div class="chip-group">
            <button
              v-for="item in emotions"
              :key="item"
              class="chip"
              :class="{ active: emotion === item }"
              type="button"
              :disabled="running"
              @click="emotion = item"
            >
              {{ item }}
            </button>
          </div>
        </div>

        <div class="info-note">
          <Info :size="14" />
          <span
            >预计合成音频时长约为 {{ formatTime(estimatedSeconds) }}。时长受所选语速及标点停顿影响。</span
          >
        </div>

        <div class="advanced">
          <button
            class="advanced-head"
            type="button"
            @click="advancedOpen = !advancedOpen"
          >
            <ChevronDown
              :size="16"
              class="advanced-chevron"
              :class="{ open: advancedOpen }"
            />
            <span>高级设置</span>
          </button>
          <div v-show="advancedOpen" class="advanced-body">
            <div class="setting-block">
              <div class="slider-head">
                <span class="setting-label"
                  ><Waypoints :size="13" /> 音调</span
                >
                <span class="slider-value">{{ pitch }}</span>
              </div>
              <input
                v-model.number="pitch"
                type="range"
                min="0"
                max="100"
                class="mx-range"
                :disabled="running"
              />
            </div>
            <div class="setting-block">
              <div class="slider-head">
                <span class="setting-label">停顿强度</span>
                <span class="slider-value">{{ pauseStrength }}</span>
              </div>
              <input
                v-model.number="pauseStrength"
                type="range"
                min="0"
                max="100"
                class="mx-range"
                :disabled="running"
              />
            </div>
          </div>
        </div>

        <div class="settings-actions">
          <button
            class="secondary"
            type="button"
            :disabled="running"
            @click="resetSettings"
          >
            <RotateCcw :size="14" />
            <span>恢复默认设置</span>
          </button>
          <button
            class="primary synth-button"
            type="button"
            :disabled="!canRun"
            @click="handleSynthesize"
          >
            <Loader2 v-if="running" :size="16" class="spin" />
            <Sparkles v-else :size="16" />
            <span>{{ running ? "合成中" : "开始合成" }}</span>
          </button>
        </div>
      </section>
    </div>

    <div class="speech-result">
      <section class="panel result-panel">
        <div class="panel-head">
          <h3 class="panel-title">合成结果</h3>
          <span v-if="hasResult" class="status-pill done">已完成</span>
          <span v-else-if="running" class="status-pill running">合成中</span>
          <span v-else-if="hasError" class="status-pill failed">失败</span>
        </div>

        <template v-if="hasResult">
          <div class="result-file">
            <span class="file-icon"><FileAudio :size="20" /></span>
            <div class="file-meta">
              <span class="file-name">{{ fileName }}</span>
              <span class="file-sub">{{ resultDurationLabel }} · WAV</span>
            </div>
          </div>

          <div class="result-player">
            <audio
              v-if="canPlay"
              class="native-audio"
              controls
              :src="audioSrc"
            />
            <p v-else class="player-unavailable">
              请在桌面端预览或下载。
            </p>
          </div>

          <div class="result-actions">
            <button
              class="secondary"
              type="button"
              :disabled="running"
              @click="handleSynthesize"
            >
              <RotateCcw :size="14" />
              <span>重新合成</span>
            </button>
            <a
              v-if="canPlay"
              class="secondary download-link"
              :href="audioSrc"
              :download="fileName"
            >
              <Download :size="14" />
              <span>下载音频</span>
            </a>
            <span
              v-else
              class="secondary download-link disabled"
              aria-disabled="true"
            >
              <Download :size="14" />
              <span>下载音频</span>
            </span>
            <button
              class="secondary"
              type="button"
              disabled
              title="本地文件夹访问待接入"
            >
              <FolderOpen :size="14" />
              <span>在文件夹中显示</span>
            </button>
          </div>

          <p class="result-note">
            修改文案、声音、语速或语气后，需重新合成音频。
          </p>
        </template>

        <div v-else class="result-empty">
          <span class="empty-icon">
            <Loader2 v-if="running" :size="32" class="spin" />
            <FileAudio v-else :size="32" />
          </span>
          <p>
            {{ running ? "正在合成音频…" : hasError ? "语音合成失败，请检查配置后重试。" : "完成设置后点击「开始合成」生成音频" }}
          </p>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.speech-stage {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
  width: 100%;
  height: 100%;
  min-height: 0;
}

.speech-controls {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
  min-width: 0;
  overflow-y: auto;
}

.speech-result {
  display: flex;
  padding: 24px;
  border-left: 1px solid var(--mx-border-subtle);
  background: var(--mx-bg-base);
  min-width: 0;
  overflow-y: auto;
}

.panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  border: 1px solid var(--mx-border-subtle);
  border-radius: var(--mx-radius-lg);
  background: var(--mx-bg-surface);
}

.result-panel {
  flex: 1 1 auto;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.panel-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--mx-text-primary);
}

.status-pill {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: var(--mx-radius-pill);
  font-size: 11px;
  font-weight: 600;
}

.status-pill.ready {
  color: var(--mx-accent);
  background: var(--mx-accent-soft-bg);
}

.status-pill.done {
  color: var(--mx-success);
  background: var(--mx-success-bg);
}

.status-pill.running {
  color: var(--mx-warning);
  background: var(--mx-warning-bg);
}

.status-pill.failed {
  color: var(--mx-error);
  background: var(--mx-error-bg);
}

.mode-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: var(--mx-radius-pill);
  background: var(--mx-bg-elevated);
  color: var(--mx-text-secondary);
  font-size: 11px;
  font-weight: 600;
}

.status-banner {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  border-radius: var(--mx-radius-md);
  font-size: 12px;
  line-height: 1.5;
}

.status-banner svg {
  flex-shrink: 0;
  margin-top: 2px;
}

.status-warning {
  color: var(--mx-text-secondary);
  background: var(--mx-warning-bg);
}

.status-error {
  color: var(--mx-error);
  background: var(--mx-error-bg);
}

.status-info {
  color: var(--mx-text-secondary);
  background: var(--mx-info-bg);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.summary-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.summary-key {
  font-size: 11px;
  color: var(--mx-text-tertiary);
}

.summary-val {
  font-size: 13px;
  font-weight: 600;
  color: var(--mx-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.summary-val.with-icon {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.summary-actions {
  display: flex;
  gap: 10px;
}

.summary-actions .secondary,
.settings-actions .secondary,
.result-actions .secondary,
.download-link {
  height: 34px;
  padding: 0 14px;
}

.setting-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.setting-label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 500;
  color: var(--mx-text-secondary);
}

.slider-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.slider-value {
  font-size: 12px;
  color: var(--mx-text-secondary);
  font-variant-numeric: tabular-nums;
}

.slider-scale {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--mx-text-muted);
}

.chip-group {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chip {
  height: 30px;
  padding: 0 14px;
  border: 1px solid var(--mx-border-default);
  border-radius: var(--mx-radius-pill);
  color: var(--mx-text-secondary);
  background: var(--mx-bg-elevated);
  font-size: 12px;
  font-weight: 500;
}

.chip.active {
  border-color: var(--mx-accent);
  color: var(--mx-accent-text);
  background: var(--mx-accent);
}

.chip:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.info-note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  border-radius: var(--mx-radius-md);
  background: var(--mx-info-bg);
  color: var(--mx-text-secondary);
  font-size: 12px;
  line-height: 1.5;
}

.info-note svg {
  color: var(--mx-info);
  flex-shrink: 0;
  margin-top: 2px;
}

.advanced {
  border-top: 1px solid var(--mx-border-subtle);
  padding-top: 12px;
}

.advanced-head {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--mx-text-secondary);
  font-size: 12px;
  font-weight: 500;
}

.advanced-chevron {
  transition: transform 150ms ease;
}

.advanced-chevron.open {
  transform: rotate(180deg);
}

.advanced-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 14px;
}

.settings-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.synth-button {
  height: 34px;
  padding: 0 18px;
  font-weight: 600;
}

.result-file {
  display: flex;
  align-items: center;
  gap: 12px;
}

.file-icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: var(--mx-radius-md);
  color: var(--mx-accent);
  background: var(--mx-accent-soft-bg);
}

.file-meta {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.file-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--mx-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-sub {
  font-size: 11px;
  color: var(--mx-text-tertiary);
}

.result-player {
  display: flex;
  align-items: center;
  gap: 12px;
}

.native-audio {
  width: 100%;
  height: 40px;
}

.player-unavailable {
  margin: 0;
  padding: 10px 12px;
  border-radius: var(--mx-radius-md);
  background: var(--mx-warning-bg);
  color: var(--mx-text-secondary);
  font-size: 12px;
  line-height: 1.5;
}

.result-actions {
  display: flex;
  gap: 10px;
}

.result-actions .secondary,
.download-link {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid var(--mx-border-default);
  border-radius: var(--mx-radius-md);
  color: var(--mx-text-secondary);
  background: var(--mx-bg-elevated);
  font-size: 12px;
  font-weight: 500;
  text-decoration: none;
}

.download-link.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.result-actions .secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.result-note {
  margin: 0;
  font-size: 11px;
  line-height: 1.5;
  color: var(--mx-text-tertiary);
}

.result-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  flex: 1 1 auto;
  min-height: 220px;
  color: var(--mx-text-tertiary);
  text-align: center;
}

.empty-icon {
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  border-radius: var(--mx-radius-lg);
  color: var(--mx-text-muted);
  background: var(--mx-bg-elevated);
}

.result-empty p {
  margin: 0;
  font-size: 13px;
  color: var(--mx-text-secondary);
}

.mx-range {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  min-height: 0;
  height: 4px;
  padding: 0;
  border: 0;
  border-radius: var(--mx-radius-pill);
  background: var(--mx-border-active);
  cursor: pointer;
}

.mx-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--mx-accent);
  border: 2px solid var(--mx-bg-surface);
  box-shadow: var(--mx-shadow-sm);
}

.mx-range::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--mx-accent);
  border: 2px solid var(--mx-bg-surface);
}

.mx-range:focus-visible {
  box-shadow: var(--mx-focus-ring);
}

@media (max-width: 1100px) {
  .speech-stage {
    grid-template-columns: 1fr;
  }

  .speech-result {
    border-left: 0;
    border-top: 1px solid var(--mx-border-subtle);
  }
}
</style>
