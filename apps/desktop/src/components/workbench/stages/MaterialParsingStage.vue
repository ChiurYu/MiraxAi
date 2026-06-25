<script setup lang="ts">
import {
  ChevronDown,
  Film,
  FolderOpen,
  History,
  Image,
  Link2,
  Loader2,
  PlayCircle,
  Settings2,
  Sparkles,
} from "lucide-vue-next";
import { computed, onUnmounted, ref, watch } from "vue";
import type { ProjectDraft } from "@mirax/core";
import PathPickerButton from "../../PathPickerButton.vue";

const props = defineProps<{
  modelValue: ProjectDraft;
  running: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: ProjectDraft];
  run: [];
  viewTasks: [];
}>();

const sourceVideoPath = computed({
  get: () => props.modelValue.sourceVideoPath,
  set: (value) =>
    emit("update:modelValue", { ...props.modelValue, sourceVideoPath: value }),
});

const activeTab = ref<"link" | "file">("link");
const settingsOpen = ref(true);

const videoFileFilters = [
  { name: "视频文件", extensions: ["mp4", "mov", "mkv", "webm"] },
];

// 解析设置是 UI 临时状态；真实 sidecar 能力接入后再持久化。
const extractVideo = ref(true);
const extractAudio = ref(true);
const autoTranscribe = ref(true);

const elapsed = ref(0);
let elapsedTimer: ReturnType<typeof setInterval> | null = null;

function clearElapsedTimer() {
  if (elapsedTimer) {
    clearInterval(elapsedTimer);
    elapsedTimer = null;
  }
}

watch(
  () => props.running,
  (isRunning) => {
    if (isRunning) {
      elapsed.value = 0;
      clearElapsedTimer();
      elapsedTimer = setInterval(() => {
        elapsed.value += 1;
      }, 1000);
    } else {
      clearElapsedTimer();
    }
  },
  { immediate: true },
);

onUnmounted(clearElapsedTimer);

function formatElapsed(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = (totalSeconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

function handleParse() {
  if (props.running || !sourceVideoPath.value) return;
  emit("run");
}
</script>

<template>
  <div class="material-parsing-stage">
    <h2 class="stage-title">导入源素材</h2>

    <div class="stage-tabs" :class="{ 'is-disabled': running }">
      <button
        class="tab"
        :class="{ active: activeTab === 'link' }"
        type="button"
        :disabled="running"
        @click="activeTab = 'link'"
      >
        视频链接
      </button>
      <button
        class="tab"
        :class="{ active: activeTab === 'file' }"
        type="button"
        :disabled="running"
        @click="activeTab = 'file'"
      >
        本地文件
      </button>
    </div>

    <template v-if="activeTab === 'link'">
      <div class="input-section">
        <label class="field-label">粘贴视频或主页链接</label>
        <div class="link-input" :class="{ 'is-disabled': running }">
          <Link2 :size="16" class="link-icon" />
          <input
            v-model="sourceVideoPath"
            type="text"
            placeholder="https://..."
            :disabled="running"
          />
        </div>
        <div class="platform-hints">
          <span>支持平台:</span>
          <span><PlayCircle :size="14" /> 抖音</span>
          <span><Image :size="14" /> 小红书</span>
          <span><Film :size="14" /> 快手/B站</span>
        </div>
      </div>

      <div class="divider">
        <span>OR</span>
      </div>

      <button class="library-button" type="button" :disabled="running">
        <FolderOpen :size="18" />
        <span>从素材库选择...</span>
      </button>
    </template>

    <div v-else class="input-section file-section">
      <label class="field-label">选择本地视频文件</label>
      <PathPickerButton
        v-model="sourceVideoPath"
        label="选择本地视频文件"
        :disabled="running"
        :filters="videoFileFilters"
        placeholder="请选择 mp4 / mov / mkv / webm 文件"
      />
    </div>

    <div class="settings-panel" :class="{ 'is-disabled': running }">
      <button
        class="settings-header"
        type="button"
        :disabled="running"
        @click="settingsOpen = !settingsOpen"
      >
        <div class="settings-title">
          <Settings2 :size="18" />
          <span>解析设置</span>
        </div>
        <ChevronDown
          :size="18"
          class="settings-chevron"
          :class="{ open: settingsOpen }"
        />
      </button>
      <div v-show="settingsOpen" class="settings-body">
        <label class="setting-row mx-switch-row">
          <span>提取画面</span>
          <span class="mx-switch">
            <input
              v-model="extractVideo"
              type="checkbox"
              role="switch"
              :disabled="running"
            />
            <span class="mx-switch-track" aria-hidden="true" />
          </span>
        </label>
        <label class="setting-row mx-switch-row">
          <span>提取音频/人声</span>
          <span class="mx-switch">
            <input
              v-model="extractAudio"
              type="checkbox"
              role="switch"
              :disabled="running"
            />
            <span class="mx-switch-track" aria-hidden="true" />
          </span>
        </label>
        <label class="setting-row mx-switch-row">
          <span>自动识别文案</span>
          <span class="mx-switch">
            <input
              v-model="autoTranscribe"
              type="checkbox"
              role="switch"
              :disabled="running"
            />
            <span class="mx-switch-track" aria-hidden="true" />
          </span>
        </label>
      </div>
    </div>

    <div v-if="running" class="processing-panel">
      <div class="processing-header">
        <span class="processing-title">正在提取音轨与识别文案</span>
      </div>
      <div class="mx-progress-indeterminate" aria-label="处理中">
        <div class="mx-progress-bar" />
      </div>
      <div class="processing-meta">
        <span class="elapsed">已用时间: {{ formatElapsed(elapsed) }}</span>
        <div class="processing-actions">
          <button
            class="link-button"
            type="button"
            @click="emit('viewTasks')"
          >
            查看任务详情
          </button>
          <button
            class="link-button is-disabled"
            type="button"
            disabled
            title="当前 runtime 不支持取消处理"
          >
            取消处理
          </button>
        </div>
      </div>
      <p class="processing-note">
        任务将在后台继续运行，你可以离开此页面。
      </p>
    </div>

    <button
      class="primary wide-button parse-button"
      type="button"
      :disabled="running || !sourceVideoPath"
      @click="handleParse"
    >
      <Loader2 v-if="running" :size="20" class="spin" />
      <Sparkles v-else :size="20" />
      <span>{{ running ? "正在解析" : "解析素材" }}</span>
    </button>

    <div class="recent-materials">
      <h3>
        <History :size="14" />
        最近解析
      </h3>
      <div class="recent-list">
        <div class="recent-item">
          <div class="recent-thumb">
            <Film :size="20" />
          </div>
          <div class="recent-meta">
            <p>夏日通勤基础款搭配公式.mp4</p>
            <span>2 mins ago • 14.2 MB</span>
          </div>
        </div>
        <div class="recent-item">
          <div class="recent-thumb">
            <Link2 :size="20" />
          </div>
          <div class="recent-meta">
            <p>抖音 - 职场穿搭干货</p>
            <span>Yesterday • Link Extracted</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.material-parsing-stage {
  width: 100%;
  min-width: 0;
}

.stage-title {
  margin: 0 0 24px;
  font-size: 20px;
  font-weight: 600;
  line-height: 28px;
  color: var(--mx-text-primary);
}

.stage-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
  border: 1px solid var(--mx-border-default);
  border-radius: var(--mx-radius-md);
  padding: 3px;
  background: var(--mx-bg-elevated);
}

.stage-tabs.is-disabled {
  opacity: 0.5;
  pointer-events: none;
}

.tab {
  flex: 1;
  height: 32px;
  border: 0;
  border-radius: var(--mx-radius-sm);
  color: var(--mx-text-secondary);
  background: transparent;
  font-size: 12px;
  font-weight: 500;
}

.tab.active {
  color: var(--mx-text-primary);
  background: var(--mx-bg-panel);
  box-shadow: var(--mx-shadow-sm);
}

.input-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 32px;
}

.input-section.file-section {
  gap: 12px;
}

.field-label {
  margin: 0;
  font-size: 12px;
  font-weight: 500;
  color: var(--mx-text-secondary);
}

.link-input {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  border: 1px solid var(--mx-border-default);
  border-radius: var(--mx-radius-md);
  background: var(--mx-bg-input);
}

.link-input.is-disabled {
  opacity: 0.5;
}

.link-input:focus-within {
  border-color: var(--mx-accent);
  box-shadow: var(--mx-focus-ring);
}

.link-input input {
  flex: 1;
  min-height: 38px;
  border: 0;
  padding: 0;
  background: transparent;
  box-shadow: none;
}

.link-input input:focus {
  box-shadow: none;
}

.link-input input:disabled {
  cursor: not-allowed;
}

.link-icon {
  color: var(--mx-text-tertiary);
  flex-shrink: 0;
}

.platform-hints {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  font-size: 11px;
  color: var(--mx-text-tertiary);
}

.platform-hints span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.divider {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 6px 0 14px;
  color: var(--mx-text-muted);
  font-size: 11px;
  font-weight: 600;
}

.divider::before,
.divider::after {
  content: "";
  flex: 1;
  height: 1px;
  background: var(--mx-border-default);
}

.library-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 40px;
  margin-bottom: 16px;
  border: 1px dashed var(--mx-border-active);
  border-radius: var(--mx-radius-md);
  color: var(--mx-text-secondary);
  background: var(--mx-bg-elevated);
  font-size: 12px;
  font-weight: 500;
}

.library-button:hover:not(:disabled) {
  border-color: var(--mx-border-default);
  color: var(--mx-text-primary);
  background: var(--mx-bg-hover);
}

.library-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.settings-panel {
  margin-bottom: 32px;
  border: 1px solid var(--mx-border-subtle);
  border-radius: var(--mx-radius-md);
  background: var(--mx-bg-elevated);
  overflow: hidden;
}

.settings-panel.is-disabled {
  opacity: 0.5;
  pointer-events: none;
}

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 16px;
  border: 0;
  background: transparent;
  color: var(--mx-text-primary);
  font-size: 12px;
  font-weight: 600;
}

.settings-header:disabled {
  cursor: not-allowed;
}

.settings-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.settings-chevron {
  color: var(--mx-text-tertiary);
  transition: transform 150ms ease;
}

.settings-chevron.open {
  transform: rotate(180deg);
}

.settings-body {
  display: grid;
  gap: 16px;
  padding: 0 16px 16px;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  color: var(--mx-text-secondary);
}

.processing-panel {
  margin-bottom: 24px;
}

.processing-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.processing-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--mx-text-primary);
}

.processing-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
}

.processing-meta .elapsed {
  font-size: 11px;
  color: var(--mx-text-tertiary);
}

.processing-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.processing-actions .link-button {
  font-size: 12px;
}

.processing-actions .link-button.is-disabled {
  color: var(--mx-text-muted);
  cursor: not-allowed;
}

.processing-note {
  margin: 10px 0 0;
  font-size: 11px;
  line-height: 1.5;
  color: var(--mx-text-tertiary);
}

.parse-button {
  height: 42px;
  font-size: 14px;
  font-weight: 600;
}

.recent-materials {
  margin-top: 32px;
}

.recent-materials h3 {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 10px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  color: var(--mx-text-tertiary);
}

.recent-list {
  display: grid;
  gap: 8px;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border: 1px solid var(--mx-border-default);
  border-radius: var(--mx-radius-md);
  background: var(--mx-bg-input);
}

.recent-thumb {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: var(--mx-radius-md);
  background: var(--mx-bg-elevated);
  color: var(--mx-text-tertiary);
}

.recent-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.recent-meta p {
  margin: 0;
  font-size: 12px;
  font-weight: 500;
  color: var(--mx-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recent-meta span {
  font-size: 11px;
  color: var(--mx-text-tertiary);
}
</style>
