<script setup lang="ts">
import { computed } from "vue";
import type { WorkflowStage, WorkflowStageStatus } from "@mirax/core";
import StatusBadge from "../ui/StatusBadge.vue";

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
  <section class="workflow-card" :data-stage="stage.id" :data-status="status">
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

    <div class="stage-actions">
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
/* Card chrome and status surfaces are styled globally in styles.css.
   This component only wires the data-status attribute and slot layout. */
</style>
