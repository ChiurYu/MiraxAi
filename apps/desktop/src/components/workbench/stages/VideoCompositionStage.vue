<script setup lang="ts">
import {
  ChevronDown,
  Download,
  FileVideo,
  Film,
  FolderOpen,
  Image,
  Info,
  Loader2,
  Music,
  RotateCcw,
  Sparkles,
  Type,
  User,
  Volume2,
} from "lucide-vue-next";
import { computed, ref } from "vue";
import type { ProjectDraft, WorkflowStageStatus } from "@mirax/core";
import { convertFileSrc } from "@tauri-apps/api/core";
import PathPickerButton from "../../PathPickerButton.vue";

const props = defineProps<{
  modelValue: ProjectDraft;
  avatarPath: string;
  audioPath: string;
  audioDuration: number;
  avatarName: string;
  running: boolean;
  status: WorkflowStageStatus;
  videoPath: string;
  coverPath: string;
}>();

const emit = defineEmits<{
  run: [];
  "edit-script": [];
  "edit-avatar": [];
}>();

const hasAvatar = computed(() => Boolean(props.avatarPath.trim()));
const hasAudio = computed(() => Boolean(props.audioPath.trim()));
const canRun = computed(() => hasAvatar.value && hasAudio.value && !props.running);
const hasResult = computed(
  () => props.status === "completed" && Boolean(props.videoPath),
);

const avatarFileName = computed(() => basename(props.avatarPath));
const audioFileName = computed(() => basename(props.audioPath));
const videoFileName = computed(() => basename(props.videoPath));
const coverFileName = computed(() => basename(props.coverPath));

// 字幕、背景音乐、音量、画中画、裁切、片头静音、高级设置均为 session-only UI。
const subtitleEnabled = ref(true);
const subtitleStyle = ref("极简白字");
const subtitlePosition = ref("底部安全区");
const subtitleSize = ref("中");

const bgmEnabled = ref(false);
const bgmPath = ref("");
const bgmFilters = [
  { name: "音频文件", extensions: ["wav", "mp3", "m4a", "flac", "aac"] },
];
const voiceVolume = ref(100);
const bgmVolume = ref(20);

const pipEnabled = ref(false);
const cropMode = ref("保持原始 9:16");
const silenceRemoval = ref(true);
const advancedOpen = ref(false);

function isTauriAvailable(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

const videoSrc = computed(() => {
  if (!props.videoPath) return "";
  if (isTauriAvailable()) {
    return convertFileSrc(props.videoPath, "asset");
  }
  return props.videoPath;
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

function handleCompose() {
  if (!canRun.value) return;
  emit("run");
}
</script>

<template>
  <div class="compose-stage">
    <div class="compose-controls">
      <section class="panel">
        <div class="panel-head">
          <h3 class="panel-title">输入摘要</h3>
          <button class="link-button" type="button" @click="emit('edit-avatar')">
            更换源素材
          </button>
        </div>

        <div class="input-summary">
          <div class="summary-card" :class="{ 'is-missing': !hasAvatar }">
            <div class="summary-media">
              <span class="summary-icon avatar"><User :size="18" /></span>
              <div class="summary-meta">
                <span class="summary-name">{{ avatarFileName || "未生成形象视频" }}</span>
                <span class="summary-sub"
                  >{{ hasAvatar ? formatTime(audioDuration) : "--:--" }} · 9:16</span
                >
              </div>
            </div>
            <span v-if="hasAvatar" class="status-dot ready">已就绪</span>
            <span v-else class="status-dot pending">待生成</span>
          </div>

          <div class="summary-card" :class="{ 'is-missing': !hasAudio }">
            <div class="summary-media">
              <span class="summary-icon audio"><Volume2 :size="18" /></span>
              <div class="summary-meta">
                <span class="summary-name">{{ audioFileName || "未合成音频" }}</span>
                <span class="summary-sub">{{ hasAudio ? formatTime(audioDuration) : "--:--" }} · AI 生成音频</span
                >
              </div>
            </div>
            <span v-if="hasAudio" class="status-dot ready">已就绪</span>
            <span v-else class="status-dot pending">待合成</span>
          </div>

          <div class="summary-card">
            <div class="summary-media">
              <span class="summary-icon avatar-name"><User :size="18" /></span>
              <span class="summary-name">{{ avatarName || "未选择形象" }}</span>
            </div>
            <span class="status-dot ready">已就绪</span>
          </div>
        </div>

        <p v-if="!hasAvatar || !hasAudio" class="input-warning">
          需要先生成形象视频与音频，才能进行视频合成。
        </p>
      </section>

      <section class="panel">
        <div class="panel-head">
          <div class="switch-label">
            <h3 class="panel-title">字幕</h3>
            <label class="mx-switch">
              <input
                v-model="subtitleEnabled"
                type="checkbox"
                role="switch"
                aria-label="启用字幕"
                :disabled="running"
              />
              <span class="mx-switch-track" aria-hidden="true" />
            </label>
          </div>
          <button class="link-button" type="button" @click="emit('edit-script')">
            编辑文案
          </button>
        </div>

        <div class="settings-grid">
          <div class="setting-field">
            <label>样式</label>
            <select v-model="subtitleStyle" :disabled="running || !subtitleEnabled">
              <option>极简白字</option>
              <option>描边白字</option>
              <option>黄底黑字</option>
            </select>
          </div>
          <div class="setting-field">
            <label>位置</label>
            <select v-model="subtitlePosition" :disabled="running || !subtitleEnabled">
              <option>底部安全区</option>
              <option>中部</option>
              <option>顶部</option>
            </select>
          </div>
          <div class="setting-field full">
            <label>字号</label>
            <div class="segmented">
              <button
                type="button"
                :class="{ selected: subtitleSize === '小' }"
                :disabled="running || !subtitleEnabled"
                @click="subtitleSize = '小'"
              >
                小
              </button>
              <button
                type="button"
                :class="{ selected: subtitleSize === '中' }"
                :disabled="running || !subtitleEnabled"
                @click="subtitleSize = '中'"
              >
                中
              </button>
              <button
                type="button"
                :class="{ selected: subtitleSize === '大' }"
                :disabled="running || !subtitleEnabled"
                @click="subtitleSize = '大'"
              >
                大
              </button>
            </div>
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="panel-head">
          <div class="switch-label">
            <h3 class="panel-title">背景音乐</h3>
            <label class="mx-switch">
              <input
                v-model="bgmEnabled"
                type="checkbox"
                role="switch"
                aria-label="启用背景音乐"
                :disabled="running"
              />
              <span class="mx-switch-track" aria-hidden="true" />
            </label>
          </div>
        </div>

        <div class="bgm-picker">
          <PathPickerButton
            v-model="bgmPath"
            label="选择背景音乐"
            :filters="bgmFilters"
            placeholder="请选择背景音乐文件"
            :disabled="running || !bgmEnabled"
          />
        </div>

        <div class="volume-list">
          <div class="volume-row">
            <span class="volume-label">人声音量</span>
            <input
              v-model.number="voiceVolume"
              type="range"
              min="0"
              max="200"
              class="mx-range"
              :disabled="running"
            />
            <span class="volume-value">{{ voiceVolume }}%</span>
          </div>
          <div class="volume-row">
            <span class="volume-label">配乐音量</span>
            <input
              v-model.number="bgmVolume"
              type="range"
              min="0"
              max="100"
              class="mx-range"
              :disabled="running || !bgmEnabled"
            />
            <span class="volume-value">{{ bgmVolume }}%</span>
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="panel-head">
          <h3 class="panel-title">画面设置</h3>
        </div>

        <div class="video-settings">
          <div class="toggle-row">
            <span>画中画模式 (PiP)</span>
            <label class="mx-switch">
              <input
                v-model="pipEnabled"
                type="checkbox"
                role="switch"
                aria-label="启用画中画"
                :disabled="running"
              />
              <span class="mx-switch-track" aria-hidden="true" />
            </label>
          </div>
          <div class="setting-field">
            <label>画面比例</label>
            <select v-model="cropMode" :disabled="running">
              <option>保持原始 9:16</option>
              <option>智能裁切</option>
              <option>等比缩放</option>
            </select>
          </div>
          <div class="toggle-row">
            <span>自动消除静音片段</span>
            <label class="mx-switch">
              <input
                v-model="silenceRemoval"
                type="checkbox"
                role="switch"
                aria-label="自动消除静音片段"
                :disabled="running"
              />
              <span class="mx-switch-track" aria-hidden="true" />
            </label>
          </div>
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
      </section>

      <section class="panel layer-panel">
        <div class="panel-head">
          <h3 class="panel-title">图层摘要</h3>
        </div>

        <ul class="layer-list">
          <li :class="{ ready: hasAvatar }">
            <User :size="14" />
            <div>
              <span class="layer-name">形象层</span>
              <span class="layer-path">{{ avatarFileName || "待生成" }}</span>
            </div>
          </li>
          <li :class="{ ready: hasAudio }">
            <Volume2 :size="14" />
            <div>
              <span class="layer-name">音频层</span>
              <span class="layer-path">{{ audioFileName || "待合成" }}</span>
            </div>
          </li>
          <li class="ready">
            <Type :size="14" />
            <div>
              <span class="layer-name">字幕层</span>
              <span class="layer-path">{{ modelValue.notes ? "来自文案改写" : "未设置" }}</span>
            </div>
          </li>
          <li class="ready">
            <Image :size="14" />
            <div>
              <span class="layer-name">封面层</span>
              <span class="layer-path">{{ modelValue.name || "未设置" }}</span>
            </div>
          </li>
        </ul>

        <button
          class="primary compose-button"
          type="button"
          :disabled="!canRun"
          @click="handleCompose"
        >
          <Loader2 v-if="running" :size="18" class="spin" />
          <Sparkles v-else :size="18" />
          <span>{{ running ? "合成中" : "开始合成成片" }}</span>
        </button>
      </section>
    </div>

    <div class="compose-result">
      <section class="panel result-panel">
        <div class="panel-head">
          <h3 class="panel-title">合成结果</h3>
          <span v-if="hasResult" class="status-pill done">已完成</span>
          <span v-else-if="running" class="status-pill running">合成中</span>
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

          <div class="output-list">
            <div class="result-file">
              <span class="file-icon"><FileVideo :size="20" /></span>
              <div class="file-meta">
                <span class="file-name">{{ videoFileName }}</span>
                <span class="file-sub">{{ formatTime(audioDuration) }} · MP4</span>
              </div>
            </div>
            <div class="result-file">
              <span class="file-icon cover"><Image :size="20" /></span>
              <div class="file-meta">
                <span class="file-name">{{ coverFileName }}</span>
                <span class="file-sub">封面图 · PNG</span>
              </div>
            </div>
          </div>

          <div class="result-actions">
            <button
              class="secondary"
              type="button"
              :disabled="running"
              @click="handleCompose"
            >
              <RotateCcw :size="14" />
              <span>重新生成</span>
            </button>
            <a
              v-if="canPlay"
              class="secondary download-link"
              :href="videoSrc"
              :download="videoFileName"
            >
              <Download :size="14" />
              <span>下载成片</span>
            </a>
            <span
              v-else
              class="secondary download-link disabled"
              aria-disabled="true"
            >
              <Download :size="14" />
              <span>下载成片</span>
            </span>
            <span class="secondary disabled" aria-disabled="true">
              <FolderOpen :size="14" />
              <span>在文件夹中显示</span>
            </span>
          </div>

          <p class="result-note">
            修改源素材、字幕或画面设置后，需重新合成成片。
          </p>
        </template>

        <div v-else class="result-empty">
          <span class="empty-icon">
            <Loader2 v-if="running" :size="32" class="spin" />
            <Film v-else :size="32" />
          </span>
          <p>
            {{ running ? "正在合成成片…" : "完成设置后点击「开始合成成片」" }}
          </p>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.compose-stage {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
  width: 100%;
  height: 100%;
  min-height: 0;
}

.compose-controls {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
  min-width: 0;
  overflow-y: auto;
}

.compose-result {
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

.status-pill.done {
  color: var(--mx-success);
  background: var(--mx-success-bg);
}

.status-pill.running {
  color: var(--mx-warning);
  background: var(--mx-warning-bg);
}

.link-button {
  border: 0;
  padding: 0;
  background: transparent;
  color: var(--mx-cyan);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}

.link-button:hover:not(:disabled) {
  text-decoration: underline;
}

.input-summary {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.summary-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
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
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: var(--mx-radius-md);
  color: var(--mx-accent);
  background: var(--mx-accent-soft-bg);
}

.summary-icon.audio {
  color: var(--mx-warning);
  background: var(--mx-warning-bg);
}

.summary-icon.avatar-name {
  color: var(--mx-text-secondary);
  background: var(--mx-bg-elevated);
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

.status-dot {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 9px;
  border-radius: var(--mx-radius-pill);
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
}

.status-dot.ready {
  color: var(--mx-success);
  background: var(--mx-success-bg);
}

.status-dot.pending {
  color: var(--mx-warning);
  background: var(--mx-warning-bg);
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

.switch-label {
  display: inline-flex;
  align-items: center;
  gap: 10px;
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

.setting-field.full {
  grid-column: 1 / -1;
}

.setting-field label {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  color: var(--mx-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.segmented {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0;
  border: 1px solid var(--mx-border-default);
  border-radius: var(--mx-radius-md);
  overflow: hidden;
}

.segmented button {
  min-height: 32px;
  border: 0;
  color: var(--mx-text-secondary);
  background: transparent;
  font-size: 12px;
}

.segmented button:hover:not(:disabled) {
  color: var(--mx-text-primary);
  background: var(--mx-bg-hover);
}

.segmented button.selected {
  color: var(--mx-accent-text);
  background: var(--mx-accent);
  font-weight: 600;
}

.bgm-picker {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.volume-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.volume-row {
  display: grid;
  grid-template-columns: 70px 1fr 42px;
  gap: 10px;
  align-items: center;
}

.volume-label {
  font-size: 12px;
  color: var(--mx-text-secondary);
}

.volume-value {
  font-size: 12px;
  color: var(--mx-text-secondary);
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.video-settings {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 12px;
  color: var(--mx-text-secondary);
}

.toggle-row .mx-switch {
  flex-shrink: 0;
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
  cursor: pointer;
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

.layer-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.layer-list li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--mx-border-default);
  border-radius: var(--mx-radius-md);
  background: var(--mx-bg-elevated);
  color: var(--mx-text-tertiary);
}

.layer-list li.ready {
  color: var(--mx-text-secondary);
  border-color: var(--mx-border-subtle);
}

.layer-list li div {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.layer-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--mx-text-primary);
}

.layer-path {
  font-size: 11px;
  color: var(--mx-text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.compose-button {
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

.output-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
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

.file-icon.cover {
  color: var(--mx-success);
  background: var(--mx-success-bg);
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
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--mx-accent);
  border: 2px solid var(--mx-bg-surface);
}

.mx-range::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--mx-accent);
  border: 2px solid var(--mx-bg-surface);
}

.mx-range:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

@media (max-width: 1100px) {
  .compose-stage {
    grid-template-columns: 1fr;
  }

  .compose-result {
    border-left: 0;
    border-top: 1px solid var(--mx-border-subtle);
  }
}
</style>
