<script setup lang="ts">
import { ChevronLeft, ChevronRight, Save } from "lucide-vue-next";
import { computed } from "vue";
import type { WorkflowStage, WorkflowStageId, WorkflowStageStatus } from "@mirax/core";

const props = defineProps<{
  stage: WorkflowStage;
  status: WorkflowStageStatus;
  canGoPrevious: boolean;
  canGoNext: boolean;
  running: boolean;
}>();

const emit = defineEmits<{
  previous: [];
  next: [];
  save: [];
}>();

const canAdvance = computed(() => props.status === "completed" && props.canGoNext);
</script>

<template>
  <section class="workbench-stage" :data-stage="stage.id" :data-status="status">
    <div class="stage-workspace">
      <div class="stage-controls">
        <div class="stage-controls-body">
          <slot name="controls" />
        </div>
      </div>
      <div class="stage-preview">
        <slot name="preview" />
      </div>
    </div>

    <footer class="workbench-footer">
      <div class="footer-meta">Mirax AI Desktop v1.0.4</div>
      <div class="footer-actions">
        <button
          class="secondary"
          type="button"
          :disabled="!canGoPrevious || running"
          @click="emit('previous')"
        >
          <ChevronLeft :size="16" />
          <span>上一步</span>
        </button>
        <button class="secondary" type="button" @click="emit('save')">
          <Save :size="16" />
          <span>保存草稿</span>
        </button>
        <button
          class="primary"
          type="button"
          :disabled="!canAdvance || running"
          @click="emit('next')"
        >
          <span>下一步</span>
          <ChevronRight :size="16" />
        </button>
      </div>
    </footer>
  </section>
</template>

<style scoped>
/* .stage-controls-header 已删除；StageProgress 是唯一的阶段编号/名称导航。 */
</style>
