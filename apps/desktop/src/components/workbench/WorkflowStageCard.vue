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
/* Card chrome is styled globally so all workflow cards share the same
   density, border, radius and heading treatment. */
</style>
