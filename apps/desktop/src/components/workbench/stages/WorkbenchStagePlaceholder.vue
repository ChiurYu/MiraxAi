<script setup lang="ts">
import { Construction } from "lucide-vue-next";
import type { WorkflowStage } from "@mirax/core";

defineProps<{
  stage: WorkflowStage;
}>();
</script>

<template>
  <div class="stage-placeholder">
    <div class="placeholder-icon">
      <Construction :size="32" />
    </div>
    <h3>{{ stage.title }}</h3>
    <p>该阶段骨架将在后续 Task 中按 Stitch 参考实现。</p>
  </div>
</template>

<style scoped>
.stage-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: 100%;
  height: 100%;
  padding: 32px;
  color: var(--mx-text-secondary);
  text-align: center;
}

.placeholder-icon {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border-radius: var(--mx-radius-lg);
  background: var(--mx-bg-elevated);
  color: var(--mx-text-muted);
}

.stage-placeholder h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--mx-text-primary);
}

.stage-placeholder p {
  margin: 0;
  max-width: 280px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--mx-text-tertiary);
}
</style>
