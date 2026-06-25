<script setup lang="ts">
import { computed } from "vue";
import type { WorkflowStage, WorkflowStageId, WorkflowStageStatus } from "@mirax/core";
import WorkbenchStageFrame from "./WorkbenchStageFrame.vue";
import StageProgress from "./StageProgress.vue";

const props = defineProps<{
  stages: WorkflowStage[];
  activeStageId: WorkflowStageId;
  running: boolean;
}>();

const emit = defineEmits<{
  selectStage: [stageId: WorkflowStageId];
  previous: [];
  next: [];
  save: [];
}>();

const stageOrder: WorkflowStageId[] = [
  "transcribe",
  "rewrite",
  "voice-clone",
  "speech",
  "avatar",
  "compose",
  "review",
  "publish",
];

const activeStage = computed(() => props.stages.find((s) => s.id === props.activeStageId)!);
const activeStatus = computed(() => activeStage.value.status);
const activeIndex = computed(() => stageOrder.indexOf(props.activeStageId));
const canGoPrevious = computed(() => activeIndex.value > 0);
const canGoNext = computed(() => activeIndex.value < stageOrder.length - 1);
const stageStatus = computed(() =>
  Object.fromEntries(props.stages.map((s) => [s.id, s.status])) as Record<WorkflowStageId, WorkflowStageStatus>,
);

function handleSelect(stageId: WorkflowStageId) {
  emit("selectStage", stageId);
}

function handlePrevious() {
  emit("previous");
}

function handleNext() {
  emit("next");
}

function handleSave() {
  emit("save");
}
</script>

<template>
  <div class="workbench-view">
    <StageProgress
      :stages="stages"
      :stage-status="stageStatus"
      :active-stage-id="activeStageId"
      direction="horizontal"
      @select="handleSelect"
    />
    <WorkbenchStageFrame
      :stage="activeStage"
      :status="activeStatus"
      :can-go-previous="canGoPrevious"
      :can-go-next="canGoNext"
      :running="running"
      @previous="handlePrevious"
      @next="handleNext"
      @save="handleSave"
    >
      <template #controls>
        <slot name="stage-controls" :stage="activeStage" />
      </template>
      <template #preview>
        <slot name="stage-preview" :stage="activeStage" />
      </template>
    </WorkbenchStageFrame>
  </div>
</template>
