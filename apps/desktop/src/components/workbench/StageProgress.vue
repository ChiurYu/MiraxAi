<script setup lang="ts">
import { Check } from "lucide-vue-next";
import { computed } from "vue";
import type { WorkflowStage, WorkflowStageStatus } from "@mirax/core";

const props = withDefaults(
  defineProps<{
    stages: WorkflowStage[];
    stageStatus: Record<WorkflowStage["id"], WorkflowStageStatus>;
    activeStageId: WorkflowStage["id"];
    direction?: "horizontal" | "vertical";
  }>(),
  {
    direction: "horizontal",
  },
);

const emit = defineEmits<{
  select: [stageId: WorkflowStage["id"]];
}>();

const displayLabels: Record<WorkflowStage["id"], string> = {
  transcribe: "素材解析",
  rewrite: "文案改写",
  "voice-clone": "声音克隆",
  speech: "语音合成",
  avatar: "形象生成",
  compose: "视频合成",
  review: "内容复核",
  publish: "发布",
};

const items = computed(() =>
  props.stages.map((stage, index) => ({
    id: stage.id,
    title: displayLabels[stage.id] ?? stage.title,
    number: index + 1,
    status: props.stageStatus[stage.id] ?? "pending",
  })),
);

function itemClass(status: WorkflowStageStatus, isActive: boolean) {
  if (isActive) return "is-active";
  if (status === "completed" || status === "skipped") return "is-completed";
  if (status === "failed") return "is-failed";
  return "is-pending";
}

function isClickable(status: WorkflowStageStatus, index: number): boolean {
  if (status === "completed" || status === "skipped") return true;
  const previous = items.value.slice(0, index);
  return previous.every((s) => s.status === "completed" || s.status === "skipped" || s.id === "review");
}
</script>

<template>
  <nav
    class="stage-progress"
    :class="{ 'is-vertical': direction === 'vertical' }"
    aria-label="工作流阶段"
  >
    <ol class="stepper-list">
      <li
        v-for="(item, index) in items"
        :key="item.id"
        class="stepper-item"
        :class="[itemClass(item.status, item.id === activeStageId), { 'is-clickable': isClickable(item.status, index) }]"
        @click="isClickable(item.status, index) ? emit('select', item.id) : undefined"
      >
        <span class="stepper-number">
          <Check v-if="item.status === 'completed' || item.status === 'skipped'" :size="12" />
          <span v-else>{{ item.number }}</span>
        </span>
        <span class="stepper-label">{{ item.title }}</span>
        <span v-if="index < items.length - 1" class="stepper-connector" aria-hidden="true" />
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.stepper-list {
  display: flex;
  align-items: center;
  gap: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

.stage-progress.is-vertical .stepper-list {
  flex-direction: column;
  align-items: stretch;
  gap: 2px;
}

.stepper-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  color: var(--mx-text-secondary);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  white-space: nowrap;
  transition: color 120ms ease, background 120ms ease;
}

.stepper-item.is-clickable {
  cursor: pointer;
}

.stepper-item.is-clickable:hover {
  color: var(--mx-text-primary);
  background: var(--mx-bg-hover);
}

.stepper-item.is-active {
  color: var(--mx-accent);
  border-bottom: 2px solid var(--mx-accent);
}

.stage-progress.is-vertical .stepper-item.is-active {
  border-bottom: 0;
  border-left: 2px solid var(--mx-accent);
}

.stepper-item.is-completed {
  color: var(--mx-success);
}

.stepper-item.is-failed {
  color: var(--mx-error);
}

.stepper-number {
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--mx-bg-elevated);
  color: var(--mx-text-tertiary);
  font-size: 10px;
  font-weight: 700;
  border: 1px solid var(--mx-border-default);
  flex-shrink: 0;
}

.stepper-item.is-active .stepper-number {
  background: var(--mx-accent);
  color: var(--mx-accent-text);
  border-color: var(--mx-accent);
}

.stepper-item.is-completed .stepper-number {
  background: var(--mx-success);
  color: #ffffff;
  border-color: var(--mx-success);
}

.stepper-item.is-failed .stepper-number {
  background: var(--mx-error);
  color: #ffffff;
  border-color: var(--mx-error);
}

.stepper-connector {
  display: inline-block;
  width: 16px;
  height: 1px;
  background: var(--mx-border-default);
  margin: 0 4px;
  flex-shrink: 0;
}

.stage-progress {
  display: flex;
  align-items: center;
  height: 48px;
  padding: 0 24px;
  border-bottom: 1px solid var(--mx-border-subtle);
  background: var(--mx-bg-base);
  overflow-x: auto;
}

.stage-progress.is-vertical {
  align-items: stretch;
  height: auto;
  padding: 8px 6px;
  border-bottom: 0;
  border-right: 1px solid var(--mx-border-subtle);
  background: var(--mx-bg-surface);
}

.stage-progress.is-vertical .stepper-connector {
  display: none;
}
</style>
