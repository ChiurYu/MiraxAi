<script setup lang="ts">
import { ImageOff } from "lucide-vue-next";

defineProps<{
  label?: string;
}>();
</script>

<template>
  <div class="workbench-preview-placeholder">
    <div class="preview-frame">
      <ImageOff :size="32" />
      <p>{{ label || "预览区域" }}</p>
    </div>
  </div>
</template>

<style scoped>
.workbench-preview-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 24px;
}

.preview-frame {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: min(100%, 260px);
  aspect-ratio: 9 / 16;
  border: 1px dashed var(--mx-border-active);
  border-radius: var(--mx-radius-lg);
  background: var(--mx-bg-surface);
  color: var(--mx-text-tertiary);
  text-align: center;
}

.preview-frame p {
  margin: 0;
  padding: 0 16px;
  font-size: 12px;
  color: var(--mx-text-secondary);
}
</style>
