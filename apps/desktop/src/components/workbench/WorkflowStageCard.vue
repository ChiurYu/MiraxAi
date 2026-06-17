<script setup lang="ts">
import { computed } from "vue";
import type { WorkflowStage, WorkflowStageStatus } from "@mirax/core";
import StatusBadge from "../StatusBadge.vue";

const props = defineProps<{
  stage: WorkflowStage;
  status: WorkflowStageStatus;
}>();

const emit = defineEmits<{
  run: [stageId: WorkflowStage["id"]];
}>();

const isRunDisabled = computed(() => props.status === "running" || props.status === "completed");
</script>

<template>
  <section class="workflow-card" :data-stage="stage.id">
    <div class="card-heading">
      <span class="card-icon">
        <slot name="icon" />
      </span>
      <h2>{{ stage.title }}</h2>
      <StatusBadge :status="status" />
      <slot name="heading-extra" />
    </div>

    <div class="card-body">
      <slot />
    </div>

    <div class="card-actions">
      <slot name="actions">
        <button
          class="primary compact-button"
          :disabled="isRunDisabled"
          @click="emit('run', stage.id)"
        >
          执行 {{ stage.title }}
        </button>
      </slot>
    </div>
  </section>
</template>

<style scoped>
.workflow-card {
  border: 1px solid var(--mx-border-default);
  border-radius: var(--mx-radius-lg);
  padding: 16px;
  background: var(--mx-bg-panel);
}

.card-heading {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.card-heading h2 {
  margin: 0;
  font-size: 16px;
  flex: 1;
}

.card-icon {
  display: inline-flex;
  color: var(--mx-text-secondary);
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card-actions {
  margin-top: 12px;
  display: flex;
  gap: 8px;
}
</style>
