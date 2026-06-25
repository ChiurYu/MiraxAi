<script setup lang="ts">
import { AlertCircle } from "lucide-vue-next";
import type { Component } from "vue";

withDefaults(
  defineProps<{
    title?: string;
    description?: string;
    icon?: Component;
  }>(),
  {
    title: "暂无内容",
    description: "",
    icon: undefined,
  },
);
</script>

<template>
  <div class="mx-empty-state" role="status">
    <div class="mx-empty-state-icon">
      <component :is="icon || AlertCircle" :size="22" />
    </div>
    <p class="mx-empty-state-title">{{ title }}</p>
    <p v-if="description" class="mx-empty-state-description">{{ description }}</p>
    <slot />
  </div>
</template>
