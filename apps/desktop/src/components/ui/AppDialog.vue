<script setup lang="ts">
import { X } from "lucide-vue-next";
import { onMounted, onUnmounted, ref, watch } from "vue";

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

const dialogRef = ref<HTMLDivElement | null>(null);

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
  document.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
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
