<script setup lang="ts">
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  GitCompare,
  History,
  Loader2,
  Pencil,
  Sparkles,
} from "lucide-vue-next";
import { computed, ref, watch } from "vue";
import type { ProjectDraft, WorkflowStageRuntimeMode, WorkflowStageStatus } from "@mirax/core";
import { shouldRecordVersion } from "./scriptRewritingStage.utils.js";

const props = defineProps<{
  modelValue: ProjectDraft;
  transcriptText: string;
  running: boolean;
  status: WorkflowStageStatus;
  mode?: WorkflowStageRuntimeMode;
  errorMessage?: string;
  statusMessage?: string;
  activeGoal: string;
  activePreset: string;
  targetLength: number;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: ProjectDraft];
  "update:transcriptText": [value: string];
  "update:activeGoal": [value: string];
  "update:activePreset": [value: string];
  "update:targetLength": [value: number];
  run: [options: { activeGoal: string; activePreset: string; targetLength: number }];
}>();

const rewrittenScript = computed({
  get: () => props.modelValue.notes ?? "",
  set: (value) => emit("update:modelValue", { ...props.modelValue, notes: value }),
});

const scriptLength = computed(() => rewrittenScript.value.length);
const hasTranscript = computed(() => props.transcriptText.trim().length > 0);

const isMock = computed(() => props.mode === "mock" || props.mode === undefined);
const isReal = computed(() => props.mode === "real");
const isNotConnected = computed(() => props.mode === "not-connected");
const hasError = computed(() => !!props.errorMessage?.trim());

const canRun = computed(() => hasTranscript.value && !props.running && !isNotConnected.value);

const modeLabel = computed(() => {
  if (isMock.value) return "Mock 结果";
  if (isReal.value) return "真实 LLM";
  if (isNotConnected.value) return "真实 LLM 未连接";
  return "";
});

const resultPlaceholder = computed(() => {
  if (isNotConnected.value) return "真实 LLM 未连接，无法生成改写文案。";
  if (hasTranscript.value) return "点击「重新生成」让 AI 产出改写文案，或直接在此编辑。";
  return "请先完成素材解析，获取原始文案。";
});

const rewriteGoals = ["保持原意", "更口语化", "更专业", "自定义"] as const;
const activeGoal = computed({
  get: () => props.activeGoal,
  set: (value) => emit("update:activeGoal", value),
});

const promptPresets = [
  "小红书种草风格 (Emoji Enhanced)",
  "B站测评硬核风格",
  "高端奢侈品发布语调",
];
const activePreset = computed({
  get: () => props.activePreset,
  set: (value) => emit("update:activePreset", value),
});

const targetLength = computed({
  get: () => props.targetLength,
  set: (value) => emit("update:targetLength", value),
});
const targetLengthLabel = computed(() => {
  if (targetLength.value < 34) return "精简";
  if (targetLength.value > 66) return "详尽";
  return "适中";
});

interface ScriptVersion {
  id: string;
  label: string;
  text: string;
  createdAt: number;
}

const versions = ref<ScriptVersion[]>([]);
const activeVersionId = ref<string>("");
const showComparison = ref(false);

function addVersion(text: string) {
  const index = versions.value.length + 1;
  const id = `v${index}`;
  versions.value.push({
    id,
    label: index === 1 ? `v1.0` : `v${index}.0 Latest`,
    text,
    createdAt: Date.now(),
  });
  activeVersionId.value = id;
}

watch(
  () => props.status,
  (next, prev) => {
    if (shouldRecordVersion(prev ?? "pending", next, rewrittenScript.value, props.mode)) {
      addVersion(rewrittenScript.value);
    }
  },
);

function applyVersion(version: ScriptVersion) {
  activeVersionId.value = version.id;
  emit("update:modelValue", { ...props.modelValue, notes: version.text });
}

const activeVersion = computed(() => versions.value.find((v) => v.id === activeVersionId.value));

const previousVersion = computed(() => {
  if (!activeVersion.value) return undefined;
  const index = versions.value.findIndex((v) => v.id === activeVersion.value!.id);
  return index > 0 ? versions.value[index - 1] : undefined;
});

interface DiffSegment {
  type: "same" | "removed" | "added";
  text: string;
}

function diffText(oldText: string, newText: string): DiffSegment[] {
  if (oldText === newText) {
    return [{ type: "same", text: oldText }];
  }
  const oldChars = [...oldText];
  const newChars = [...newText];
  let prefix = 0;
  while (
    prefix < oldChars.length &&
    prefix < newChars.length &&
    oldChars[prefix] === newChars[prefix]
  ) {
    prefix++;
  }
  let suffix = 0;
  while (
    suffix < oldChars.length - prefix &&
    suffix < newChars.length - prefix &&
    oldChars[oldChars.length - 1 - suffix] === newChars[newChars.length - 1 - suffix]
  ) {
    suffix++;
  }
  const removed = oldChars.slice(prefix, oldChars.length - suffix).join("");
  const added = newChars.slice(prefix, newChars.length - suffix).join("");
  const segments: DiffSegment[] = [];
  if (prefix > 0) segments.push({ type: "same", text: oldChars.slice(0, prefix).join("") });
  if (removed) segments.push({ type: "removed", text: removed });
  if (added) segments.push({ type: "added", text: added });
  if (suffix > 0) segments.push({ type: "same", text: oldChars.slice(oldChars.length - suffix).join("") });
  return segments;
}

const comparisonSegments = computed<DiffSegment[]>(() => {
  if (!activeVersion.value || !previousVersion.value) return [];
  return diffText(previousVersion.value.text, activeVersion.value.text);
});

function handleRegenerate() {
  if (!canRun.value) return;
  emit("run", { activeGoal: activeGoal.value, activePreset: activePreset.value, targetLength: targetLength.value });
}
</script>

<template>
  <div class="rewrite-stage">
    <div class="rewrite-main">
      <section class="field-block">
        <label class="field-label">
          <FileText :size="14" />
          原始文案
        </label>
        <textarea
          class="transcript-box"
          :value="transcriptText"
          :placeholder="hasTranscript ? '' : '尚未获取原始文案，可在此粘贴或编辑。'"
          rows="3"
          :disabled="running"
          @input="emit('update:transcriptText', ($event.target as HTMLTextAreaElement).value)"
        />
      </section>

      <div class="field-grid">
        <section class="field-block">
          <label class="field-label">改写目标</label>
          <div class="chip-group">
            <button
              v-for="goal in rewriteGoals"
              :key="goal"
              class="chip"
              :class="{ active: activeGoal === goal }"
              type="button"
              :disabled="running"
              @click="activeGoal = goal"
            >
              {{ goal }}
            </button>
          </div>
        </section>

        <section class="field-block">
          <label class="field-label">提示词模板</label>
          <div class="preset-row">
            <select v-model="activePreset" :disabled="running">
              <option v-for="preset in promptPresets" :key="preset" :value="preset">
                {{ preset }}
              </option>
            </select>
            <button class="icon-edit" type="button" title="编辑提示词" :disabled="running">
              <Pencil :size="14" />
            </button>
          </div>
        </section>
      </div>

      <section class="field-block">
        <div class="slider-head">
          <label class="field-label">目标字数</label>
          <span class="slider-value">{{ targetLengthLabel }}</span>
        </div>
        <input
          v-model.number="targetLength"
          type="range"
          min="0"
          max="100"
          class="mx-range"
          :disabled="running"
        />
        <div class="slider-scale">
          <span>精简</span>
          <span>详尽</span>
        </div>
      </section>

      <section class="field-block">
        <div class="slider-head">
          <label class="field-label">
            改写结果
            <span v-if="modeLabel" class="mode-badge">{{ modeLabel }}</span>
          </label>
          <span class="char-count">{{ scriptLength }} / 500</span>
        </div>
        <textarea
          v-model="rewrittenScript"
          class="result-box"
          :placeholder="resultPlaceholder"
          rows="6"
          :disabled="running || isNotConnected"
        />
      </section>

      <div v-if="isNotConnected" class="status-banner status-warning">
        <AlertCircle :size="14" />
        <span>{{ errorMessage || "真实 LLM 未连接。请在设置中配置并启用 OpenAI-compatible provider 后再试。" }}</span>
      </div>

      <div v-else-if="isReal && hasError" class="status-banner status-error">
        <AlertCircle :size="14" />
        <span>{{ errorMessage }}</span>
      </div>

      <div v-else-if="isReal && status !== 'completed'" class="status-banner status-info">
        <AlertCircle :size="14" />
        <span>真实 LLM 模式：将使用设置中启用的 provider 发起真实调用。</span>
      </div>

      <p v-if="statusMessage" class="run-status">{{ statusMessage }}</p>

      <div class="action-row">
        <button
          class="primary action-main"
          type="button"
          :disabled="!canRun"
          @click="handleRegenerate"
        >
          <Loader2 v-if="running" :size="16" class="spin" />
          <Sparkles v-else :size="16" />
          <span>{{ running ? "生成中" : "重新生成" }}</span>
        </button>
        <button
          class="secondary"
          type="button"
          :disabled="running || versions.length < 2"
          @click="showComparison = !showComparison"
        >
          <GitCompare :size="16" />
          <span>对比</span>
        </button>
      </div>

      <p v-if="!hasTranscript" class="empty-hint">
        <AlertCircle :size="14" />
        <span>原始文案为空时无法改写，请回到「素材解析」阶段完成转写。</span>
      </p>
    </div>

    <aside class="rewrite-aside">
      <section class="aside-section">
        <h3 class="aside-title">
          <History :size="14" />
          版本历史
        </h3>
        <div v-if="versions.length === 0" class="version-empty">
          暂无生成记录，首次改写后将在此处保存会话级版本。
        </div>
        <div v-else class="version-list">
          <button
            v-for="version in versions"
            :key="version.id"
            class="version-item"
            :class="{ active: activeVersionId === version.id }"
            type="button"
            @click="applyVersion(version)"
          >
            <div class="version-meta">
              <span class="version-label">{{ version.label }}</span>
              <span class="version-time">{{ new Date(version.createdAt).toLocaleTimeString() }}</span>
            </div>
            <CheckCircle2 v-if="activeVersionId === version.id" :size="16" class="version-check" />
          </button>
        </div>
      </section>

      <section v-if="showComparison" class="aside-section comparison-section">
        <div class="comparison-head">
          <h3 class="aside-title">变更对比</h3>
          <div class="comparison-legend">
            <span class="legend add">新增</span>
            <span class="legend del">删除</span>
          </div>
        </div>
        <p v-if="comparisonSegments.length === 0" class="comparison-body">
          版本不足，无法生成对比。请至少完成两次改写。
        </p>
        <p v-else class="comparison-body">
          <template v-for="(segment, index) in comparisonSegments" :key="index">
            <del v-if="segment.type === 'removed'">{{ segment.text }}</del>
            <ins v-else-if="segment.type === 'added'">{{ segment.text }}</ins>
            <span v-else>{{ segment.text }}</span>
          </template>
        </p>
      </section>
    </aside>
  </div>
</template>

<style scoped>
.rewrite-stage {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 0;
  width: 100%;
  height: 100%;
  min-height: 0;
}

.rewrite-main {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
  min-width: 0;
  overflow-y: auto;
}

.rewrite-aside {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
  border-left: 1px solid var(--mx-border-subtle);
  background: var(--mx-bg-surface);
  overflow-y: auto;
}

.field-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.field-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 20px;
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

.transcript-box {
  color: var(--mx-text-secondary);
  background: var(--mx-bg-elevated);
  resize: none;
  cursor: default;
}

.chip-group {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chip {
  height: 30px;
  padding: 0 12px;
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

.preset-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
}

.icon-edit {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 1px solid var(--mx-border-default);
  border-radius: var(--mx-radius-md);
  color: var(--mx-text-secondary);
  background: var(--mx-bg-elevated);
}

.icon-edit:hover:not(:disabled) {
  color: var(--mx-text-primary);
  background: var(--mx-bg-hover);
}

.slider-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.slider-value {
  font-size: 12px;
  color: var(--mx-text-secondary);
}

.slider-scale {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--mx-text-muted);
}

.char-count {
  font-size: 11px;
  color: var(--mx-text-tertiary);
}

.result-box {
  min-height: 132px;
  line-height: 1.6;
}

.action-row {
  display: flex;
  gap: 10px;
}

.action-main {
  flex: 1;
  height: 40px;
  font-size: 13px;
  font-weight: 600;
}

.run-status {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--mx-text-secondary);
}

.action-row .secondary {
  height: 40px;
  padding: 0 16px;
}

.empty-hint {
  display: inline-flex;
  align-items: flex-start;
  gap: 8px;
  margin: 0;
  padding: 10px 12px;
  border-radius: var(--mx-radius-md);
  background: var(--mx-warning-bg);
  color: var(--mx-text-secondary);
  font-size: 12px;
  line-height: 1.5;
}

.empty-hint svg {
  color: var(--mx-warning);
  flex-shrink: 0;
  margin-top: 2px;
}

.aside-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.aside-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  color: var(--mx-text-tertiary);
}

.version-empty {
  padding: 12px;
  border: 1px solid var(--mx-border-subtle);
  border-radius: var(--mx-radius-md);
  background: var(--mx-bg-input);
  color: var(--mx-text-tertiary);
  font-size: 12px;
  line-height: 1.5;
}

.version-list {
  display: grid;
  gap: 8px;
}

.version-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--mx-border-default);
  border-radius: var(--mx-radius-md);
  background: var(--mx-bg-elevated);
  text-align: left;
}

.version-item.active {
  border-color: var(--mx-accent);
  background: var(--mx-accent-soft-bg);
}

.version-meta {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.version-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--mx-text-primary);
}

.version-time {
  font-size: 11px;
  color: var(--mx-text-tertiary);
}

.version-check {
  color: var(--mx-accent);
  flex-shrink: 0;
}

.comparison-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.comparison-legend {
  display: flex;
  gap: 10px;
}

.legend {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--mx-text-tertiary);
}

.legend::before {
  content: "";
  width: 8px;
  height: 8px;
  border-radius: 2px;
}

.legend.add::before {
  background: var(--mx-success);
}

.legend.del::before {
  background: var(--mx-error);
}

.comparison-body {
  margin: 0;
  padding: 12px;
  border: 1px solid var(--mx-border-subtle);
  border-radius: var(--mx-radius-md);
  background: var(--mx-bg-input);
  font-size: 12px;
  line-height: 1.7;
  color: var(--mx-text-secondary);
}

.comparison-body ins {
  text-decoration: none;
  color: var(--mx-success);
  background: var(--mx-success-bg);
  border-radius: 3px;
  padding: 0 2px;
}

.comparison-body del {
  color: var(--mx-error);
  background: var(--mx-error-bg);
  border-radius: 3px;
  padding: 0 2px;
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

.mode-badge {
  margin-left: 6px;
  padding: 2px 6px;
  border-radius: var(--mx-radius-pill);
  background: var(--mx-accent-soft-bg);
  color: var(--mx-accent);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.2px;
  text-transform: none;
}

.status-banner {
  display: inline-flex;
  align-items: flex-start;
  gap: 8px;
  margin: 0;
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
  background: var(--mx-warning-bg);
  color: var(--mx-text-secondary);
}

.status-warning svg {
  color: var(--mx-warning);
}

.status-error {
  background: var(--mx-error-bg);
  color: var(--mx-text-secondary);
}

.status-error svg {
  color: var(--mx-error);
}

.status-info {
  background: var(--mx-info-bg);
  color: var(--mx-text-secondary);
}

.status-info svg {
  color: var(--mx-info);
}

@media (max-width: 1100px) {
  .rewrite-stage {
    grid-template-columns: 1fr;
  }

  .rewrite-aside {
    border-left: 0;
    border-top: 1px solid var(--mx-border-subtle);
  }
}
</style>
