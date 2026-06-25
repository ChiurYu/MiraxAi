<script setup lang="ts">
import {
  Check,
  Film,
  FolderOpen,
  Info,
  Loader2,
  Mic,
  Music,
  Plus,
  RotateCcw,
  Sparkles,
} from "lucide-vue-next";
import { ChevronDown, Download } from "lucide-vue-next";
import { computed, ref } from "vue";
import type { ProjectDraft, WorkflowStageStatus } from "@mirax/core";
import { convertFileSrc } from "@tauri-apps/api/core";

const props = defineProps<{
  modelValue: ProjectDraft;
  audioPath: string;
  audioDuration: number;
  voiceName: string;
  running: boolean;
  status: WorkflowStageStatus;
  selectedAvatarId: string;
  avatarPath: string;
  avatarDuration?: number;
}>();

const emit = defineEmits<{
  run: [];
  "update:selectedAvatarId": [value: string];
  "create-avatar": [];
  "change-audio": [];
}>();

const hasAudio = computed(() => Boolean(props.audioPath.trim()));
const hasResult = computed(
  () => props.status === "completed" && Boolean(props.avatarPath),
);
const canRun = computed(() => hasAudio.value && !props.running);

const audioFileName = computed(() => basename(props.audioPath));
const avatarFileName = computed(() => basename(props.avatarPath));

const BUILT_IN_AVATAR = "presenter-a";

// 内置示例形象使用本地 Stitch 示例媒体，避免运行时依赖外部热链。
const avatarPreviewUrl = new URL(
  "../../../assets/stitch/avatars/qinghe-newsroom.jpg",
  import.meta.url,
).href;

const avatarLabel = computed(() =>
  props.selectedAvatarId === BUILT_IN_AVATAR ? "内置示例形象" : "自定义形象",
);

// 模型版本、画面景别、画面比例、输出分辨率均为 session-only UI；provider 暂不消费这些参数。
const modelVersion = ref("高清模型 V2");
const shot = ref("半身 (推荐)");
const aspectRatio = ref("9:16 (竖屏)");
const resolution = ref("1080x1920 (1080P)");
const advancedOpen = ref(false);

function isTauriAvailable(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

const videoSrc = computed(() => {
  if (!props.avatarPath) return "";
  if (isTauriAvailable()) {
    return convertFileSrc(props.avatarPath, "asset");
  }
  return props.avatarPath;
});

const canPlay = computed(
  () => hasResult.value && isTauriAvailable() && Boolean(videoSrc.value),
);

function basename(filePath: string): string {
  const trimmed = filePath.trim();
  if (!trimmed) return "";
  return trimmed.split(/[\\/]/).filter(Boolean).at(-1) ?? trimmed;
}

function formatTime(seconds: number): string {
  const total = Math.round(seconds || 0);
  const mins = Math.floor(total / 60)
    .toString()
    .padStart(2, "0");
  const secs = (total % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

function handleGenerate() {
  if (!canRun.value) return;
  emit("run");
}
</script>

<template>
  <div class="avatar-stage">
    <div class="avatar-controls">
      <section class="panel">
        <div class="panel-head">
          <h3 class="panel-title">输入摘要</h3>
          <span v-if="hasAudio" class="status-pill ready">已就绪</span>
          <span v-else class="status-pill pending">待输入</span>
        </div>

        <div class="summary-card" :class="{ 'is-missing': !hasAudio }">
          <div class="summary-media">
            <span class="summary-icon"><Music :size="18" /></span>
            <div class="summary-meta">
              <span class="summary-name">{{ audioFileName || "未选择音频" }}</span>
              <span class="summary-sub"
                >{{ hasAudio ? formatTime(audioDuration) : "--:--" }} · {{ voiceName || "未选择声音" }}</span
              >
            </div>
          </div>
          <div class="summary-side">
            <span v-if="hasAudio" class="status-dot ready">已就绪</span>
            <button
              v-else
              class="link-button"
              type="button"
              @click="emit('change-audio')"
            >
              去合成音频
            </button>
          </div>
        </div>

        <p v-if="!hasAudio" class="input-warning">
          请先完成语音合成，生成驱动音频后返回此处生成形象视频。
        </p>
      </section>

      <section class="panel">
        <div class="panel-head">
          <h3 class="panel-title">选择形象</h3>
          <button
            class="secondary new-avatar"
            type="button"
            @click="emit('create-avatar')"
          >
            <Plus :size="14" />
            <span>新建形象</span>
          </button>
        </div>

        <div class="avatar-grid">
          <button
            class="avatar-card"
            :class="{ selected: selectedAvatarId === BUILT_IN_AVATAR }"
            type="button"
            @click="emit('update:selectedAvatarId', BUILT_IN_AVATAR)"
          >
            <div class="avatar-thumb">
              <img :src="avatarPreviewUrl" alt="内置示例形象" />
            </div>
            <div class="avatar-info">
              <span class="avatar-name">presenter-a</span>
              <span class="avatar-tag">内置示例形象</span>
            </div>
            <span v-if="selectedAvatarId === BUILT_IN_AVATAR" class="check">
              <Check :size="12" />
            </span>
          </button>
        </div>

        <p class="avatar-note">
          当前仅提供内置示例形象；自定义形象训练将在后续版本接入。
        </p>
      </section>

      <section class="panel">
        <div class="panel-head">
          <h3 class="panel-title">生成设置</h3>
        </div>

        <div class="settings-grid">
          <div class="setting-field">
            <label>驱动模型</label>
            <select v-model="modelVersion" :disabled="running">
              <option>高清模型 V2</option>
              <option>标准模型 V1.5</option>
            </select>
          </div>
          <div class="setting-field">
            <label>画面景别</label>
            <select v-model="shot" :disabled="running">
              <option>半身 (推荐)</option>
              <option>全身</option>
              <option>特写</option>
            </select>
          </div>
          <div class="setting-field">
            <label>画面比例</label>
            <select v-model="aspectRatio" :disabled="running">
              <option>9:16 (竖屏)</option>
              <option>16:9 (横屏)</option>
              <option>1:1 (方图)</option>
            </select>
          </div>
          <div class="setting-field">
            <label>输出分辨率</label>
            <select v-model="resolution" :disabled="running">
              <option>1080x1920 (1080P)</option>
              <option>720x1280 (720P)</option>
              <option>2160x3840 (4K)</option>
            </select>
          </div>
        </div>

        <div class="session-note">
          <Info :size="14" />
          <span
            >模型版本、景别、比例与分辨率当前为会话级配置，不会传给当前 mock provider。</span
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
            <span>高级设置（绿幕抠像、渲染质量等）</span>
          </button>
          <div v-show="advancedOpen" class="advanced-body">
            <p class="advanced-placeholder">
              绿幕抠像、渲染质量等高级参数当前仅做展示，尚未接入真实渲染管线。
            </p>
          </div>
        </div>

        <button
          class="primary generate-button"
          type="button"
          :disabled="!canRun"
          @click="handleGenerate"
        >
          <Loader2 v-if="running" :size="18" class="spin" />
          <Sparkles v-else :size="18" />
          <span>{{ running ? "生成中" : "生成口播视频" }}</span>
        </button>
      </section>
    </div>

    <div class="avatar-result">
      <section class="panel result-panel">
        <div class="panel-head">
          <h3 class="panel-title">生成结果</h3>
          <span v-if="hasResult" class="status-pill done">已完成</span>
          <span v-else-if="running" class="status-pill running">生成中</span>
        </div>

        <template v-if="hasResult">
          <div class="preview-frame has-value">
            <video
              v-if="canPlay"
              class="native-video"
              controls
              :src="videoSrc"
            />
            <p v-else class="player-unavailable">
              请在桌面端预览或下载。
            </p>
          </div>

          <div class="result-file">
            <span class="file-icon"><Film :size="20" /></span>
            <div class="file-meta">
              <span class="file-name">{{ avatarFileName }}</span>
              <span class="file-sub">{{ formatTime(avatarDuration || 0) }} · MP4</span>
            </div>
          </div>

          <div class="result-actions">
            <button
              class="secondary"
              type="button"
              :disabled="running"
              @click="handleGenerate"
            >
              <RotateCcw :size="14" />
              <span>重新生成</span>
            </button>
            <a
              v-if="canPlay"
              class="secondary download-link"
              :href="videoSrc"
              :download="avatarFileName"
            >
              <Download :size="14" />
              <span>下载视频</span>
            </a>
            <span
              v-else
              class="secondary download-link disabled"
              aria-disabled="true"
            >
              <Download :size="14" />
              <span>下载视频</span>
            </span>
            <span class="secondary disabled" aria-disabled="true">
              <FolderOpen :size="14" />
              <span>在文件夹中显示</span>
            </span>
          </div>

          <p class="result-note">
            更换音频、形象或生成设置后，需重新生成口播视频。
          </p>
        </template>

        <div v-else class="result-empty">
          <span class="empty-icon">
            <Loader2 v-if="running" :size="32" class="spin" />
            <Film v-else :size="32" />
          </span>
          <p>
            {{ running ? "正在生成形象视频…" : "完成设置后点击「生成口播视频」" }}
          </p>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.avatar-stage {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
  width: 100%;
  height: 100%;
  min-height: 0;
}

.avatar-controls {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
  min-width: 0;
  overflow-y: auto;
}

.avatar-result {
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
  min-width: 0;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
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
  color: var(--mx-success);
  background: var(--mx-success-bg);
}

.status-pill.pending {
  color: var(--mx-warning);
  background: var(--mx-warning-bg);
}

.status-pill.done {
  color: var(--mx-success);
  background: var(--mx-success-bg);
}

.status-pill.running {
  color: var(--mx-warning);
  background: var(--mx-warning-bg);
}

.summary-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--mx-border-default);
  border-radius: var(--mx-radius-lg);
  background: var(--mx-bg-panel);
}

.summary-card.is-missing {
  border-style: dashed;
  background: var(--mx-bg-elevated);
}

.summary-media {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.summary-icon {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: var(--mx-radius-md);
  color: var(--mx-accent);
  background: var(--mx-accent-soft-bg);
}

.summary-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.summary-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--mx-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.summary-sub {
  font-size: 11px;
  color: var(--mx-text-tertiary);
}

.summary-side {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.status-dot {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 9px;
  border-radius: var(--mx-radius-pill);
  font-size: 11px;
  font-weight: 600;
}

.status-dot.ready {
  color: var(--mx-success);
  background: var(--mx-success-bg);
}

.input-warning {
  margin: 0;
  padding: 10px 12px;
  border-radius: var(--mx-radius-md);
  background: var(--mx-warning-bg);
  color: var(--mx-text-secondary);
  font-size: 12px;
  line-height: 1.5;
}

.new-avatar {
  height: 30px;
  padding: 0 12px;
}

.avatar-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 12px;
}

.avatar-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border: 1px solid var(--mx-border-default);
  border-radius: var(--mx-radius-lg);
  background: var(--mx-bg-elevated);
  color: var(--mx-text-primary);
  text-align: left;
  cursor: pointer;
}

.avatar-card.selected {
  border-color: var(--mx-accent);
  background: var(--mx-accent-soft-bg);
}

.avatar-thumb {
  display: grid;
  place-items: center;
  aspect-ratio: 9 / 16;
  border-radius: var(--mx-radius-md);
  background: var(--mx-bg-input);
  color: var(--mx-text-muted);
}

.avatar-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.avatar-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--mx-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.avatar-tag {
  font-size: 10px;
  color: var(--mx-text-tertiary);
}

.check {
  position: absolute;
  top: 8px;
  right: 8px;
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  color: var(--mx-accent-text);
  background: var(--mx-accent);
}

.avatar-note {
  margin: 0;
  font-size: 11px;
  color: var(--mx-text-tertiary);
  line-height: 1.5;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.setting-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.setting-field label {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  color: var(--mx-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.session-note {
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

.session-note svg {
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
  margin-top: 12px;
}

.advanced-placeholder {
  margin: 0;
  font-size: 12px;
  color: var(--mx-text-tertiary);
  line-height: 1.5;
}

.generate-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 42px;
  font-size: 14px;
  font-weight: 600;
}

.preview-frame {
  display: grid;
  place-items: center;
  width: 100%;
  max-width: 260px;
  margin: 0 auto;
  aspect-ratio: 9 / 16;
  border: 1px dashed var(--mx-border-active);
  border-radius: var(--mx-radius-lg);
  background: var(--mx-bg-elevated);
  overflow: hidden;
}

.preview-frame.has-value {
  border-style: solid;
  border-color: var(--mx-border-default);
}

.native-video {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #000;
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

.download-link.disabled,
.result-actions .secondary.disabled {
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
  min-height: 240px;
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

.avatar-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

@media (max-width: 1100px) {
  .avatar-stage {
    grid-template-columns: 1fr;
  }

  .avatar-result {
    border-left: 0;
    border-top: 1px solid var(--mx-border-subtle);
  }
}
</style>
