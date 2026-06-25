<script setup lang="ts">
import { X } from "lucide-vue-next";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useAppSettings } from "../../composables/useAppSettings.js";

const props = withDefaults(
  defineProps<{
    open: boolean;
    title: string;
    closeOnOverlay?: boolean;
    showClose?: boolean;
  }>(),
  {
    open: false,
    title: "",
    closeOnOverlay: true,
    showClose: true,
  },
);

const emit = defineEmits<{
  close: [];
}>();

const { appSettings } = useAppSettings();
const dialogRef = ref<HTMLDivElement | null>(null);
const systemTheme = ref<"light" | "dark">("dark");
let systemThemeQuery: MediaQueryList | undefined;

const theme = computed<"light" | "dark">(() =>
  appSettings.theme === "system" ? systemTheme.value : appSettings.theme,
);

function syncSystemTheme() {
  systemTheme.value = systemThemeQuery?.matches ? "dark" : "light";
}

function handleOverlayClick() {
  if (props.closeOnOverlay) {
    emit("close");
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === "Escape" && props.open) {
    event.preventDefault();
    emit("close");
  }
}

onMounted(() => {
  systemThemeQuery = window.matchMedia?.("(prefers-color-scheme: dark)");
  syncSystemTheme();
  systemThemeQuery?.addEventListener("change", syncSystemTheme);
  document.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
  systemThemeQuery?.removeEventListener("change", syncSystemTheme);
  document.removeEventListener("keydown", handleKeydown);
});

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      // Move focus into the dialog for accessibility.
      setTimeout(() => dialogRef.value?.focus(), 0);
    }
  },
);
</script>

<template>
  <Teleport to="body">
    <Transition name="mx-fade">
      <div
        v-if="open"
        class="mx-dialog-overlay"
        :data-theme="theme"
        role="presentation"
        aria-hidden="true"
        @click="handleOverlayClick"
      />
    </Transition>
    <Transition name="mx-fade">
      <div
        v-if="open"
        ref="dialogRef"
        class="mx-dialog"
        :data-theme="theme"
        role="dialog"
        aria-modal="true"
        tabindex="-1"
        v-bind="$attrs"
      >
        <div class="mx-dialog-header">
          <h2>{{ title }}</h2>
          <button
            v-if="showClose"
            class="ghost-button icon-button"
            type="button"
            aria-label="关闭"
            @click="emit('close')"
          >
            <X :size="16" />
          </button>
        </div>
        <div class="mx-dialog-body">
          <slot />
        </div>
        <div v-if="$slots.actions" class="mx-dialog-footer">
          <slot name="actions" />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.mx-fade-enter-active,
.mx-fade-leave-active {
  transition: opacity 150ms ease;
}

.mx-fade-enter-from,
.mx-fade-leave-to {
  opacity: 0;
}
</style>
