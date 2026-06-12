<script setup lang="ts">
import { FolderOpen } from "lucide-vue-next";

const props = defineProps<{
  label: string;
  value?: string;
  filters?: { name: string; extensions: string[] }[];
}>();

const emit = defineEmits<{
  selected: [path: string];
}>();

async function pickPath() {
  try {
    const dialog = await import("@tauri-apps/plugin-dialog");
    const selected = await dialog.open({
      multiple: false,
      filters: props.filters,
    });

    if (typeof selected === "string") {
      emit("selected", selected);
      return;
    }
  } catch {
    const fallback = window.prompt(props.label, props.value ?? "");
    if (fallback !== null) {
      emit("selected", fallback.trim());
    }
  }
}
</script>

<template>
  <button type="button" :aria-label="label" @click="pickPath">
    <FolderOpen :size="16" />
  </button>
</template>
