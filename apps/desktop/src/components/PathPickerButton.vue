<script setup lang="ts">
import { AlertCircle, CheckCircle2, FolderOpen, Loader2 } from "lucide-vue-next";
import { computed, ref } from "vue";

const props = defineProps<{
  label: string;
  modelValue?: string;
  filters?: { name: string; extensions: string[] }[];
  placeholder?: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
  selected: [value: string];
}>();

type PickerStatus = "empty" | "selecting" | "selected" | "error";

const status = ref<PickerStatus>(props.modelValue ? "selected" : "empty");
const errorMessage = ref("");

const displayName = computed(() => {
  const raw = props.modelValue?.trim() ?? "";
  if (!raw) {
    return "";
  }

  const index = Math.max(raw.lastIndexOf("/"), raw.lastIndexOf("\\"));
  return index >= 0 ? raw.slice(index + 1) : raw;
});

function isTauriAvailable(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function commitValue(next: string) {
  emit("update:modelValue", next);
  emit("selected", next);
}

function onInputChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const next = target.value.trim();
  status.value = next ? "selected" : "empty";
  errorMessage.value = "";
  commitValue(next);
}

async function pickPath() {
  status.value = "selecting";
  errorMessage.value = "";

  if (!isTauriAvailable()) {
    const fallback = window.prompt(props.label, props.modelValue ?? "");
    if (fallback !== null) {
      const trimmed = fallback.trim();
      status.value = trimmed ? "selected" : "empty";
      if (trimmed) {
        commitValue(trimmed);
      }
    } else {
      status.value = props.modelValue ? "selected" : "empty";
    }
    return;
  }

  try {
    const dialog = await import("@tauri-apps/plugin-dialog");
    const selected = await dialog.open({
      multiple: false,
      filters: props.filters,
    });

    if (selected === null) {
      status.value = props.modelValue ? "selected" : "empty";
      return;
    }

    if (typeof selected === "string") {
      status.value = "selected";
      commitValue(selected);
      return;
    }

    status.value = "error";
    errorMessage.value = "选择结果格式异常";
  } catch (error) {
    status.value = "error";
    errorMessage.value = error instanceof Error ? error.message : "选择失败";
  }
}
</script>

<template>
  <div class="path-picker">
    <div class="action-input">
      <input
        :value="modelValue"
        :placeholder="placeholder ?? '请输入路径或点击右侧选择文件'"
        @change="onInputChange"
      />
      <button
        type="button"
        :disabled="status === 'selecting'"
        :aria-label="label"
        @click="pickPath"
      >
        <Loader2 v-if="status === 'selecting'" :size="16" class="spin" />
        <FolderOpen v-else :size="16" />
      </button>
    </div>
    <div class="path-status" :class="status">
      <span v-if="status === 'error'" class="status-row status-error">
        <AlertCircle :size="14" />
        {{ errorMessage }}
      </span>
      <span v-else-if="modelValue" class="status-row status-selected">
        <CheckCircle2 :size="14" />
        已选择：{{ displayName }}
      </span>
      <span v-else class="status-row status-empty">未选择</span>
    </div>
  </div>
</template>
