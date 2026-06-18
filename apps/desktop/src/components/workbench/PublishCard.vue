<script setup lang="ts">
import { CloudUpload, FolderOpen } from "lucide-vue-next";
import { computed } from "vue";
import type { PublishPlatform, WorkflowStageStatus } from "@mirax/core";
import { SUPPORTED_PLATFORM_PROFILES } from "@mirax/provider-publish";
import StatusBadge from "../StatusBadge.vue";

const props = defineProps<{
  projectId: string;
  projectName: string;
  videoPath: string;
  targetPlatforms: PublishPlatform[];
  mode: "direct" | "draft";
  status: WorkflowStageStatus;
  disabled?: boolean;
  isPublishing?: boolean;
}>();

const emit = defineEmits<{
  publish: [];
  updateMode: [mode: "direct" | "draft"];
  updatePlatforms: [platforms: PublishPlatform[]];
}>();

const platformOptions = computed(() =>
  SUPPORTED_PLATFORM_PROFILES.map((profile) => ({
    id: profile.id,
    label: profile.label,
  })),
);

const accountDisplayText = computed(() => {
  if (props.targetPlatforms.length === 0) {
    return "选择账号";
  }
  return props.targetPlatforms.map((platformId) => {
    const profile = SUPPORTED_PLATFORM_PROFILES.find((p) => p.id === platformId);
    return profile?.label ?? platformId;
  }).join("、");
});

function togglePlatform(platformId: PublishPlatform, checked: boolean) {
  const next = new Set(props.targetPlatforms);
  if (checked) {
    next.add(platformId);
  } else {
    next.delete(platformId);
  }
  emit("updatePlatforms", Array.from(next));
}

function publish() {
  emit("publish");
}
</script>

<template>
  <section class="workflow-card publish-card">
    <div class="card-heading">
      <span class="card-icon"><CloudUpload :size="19" /></span>
      <h2>7. 视频发布</h2>
      <StatusBadge :status="status" />
    </div>

    <label>
      <span>视频地址</span>
      <div class="action-input">
        <input :value="videoPath || '自动使用上一步视频，或手动选择'" readonly />
        <button><FolderOpen :size="16" /></button>
      </div>
    </label>

    <label>
      <span>发布账号</span>
      <select disabled>
        <option>{{ accountDisplayText }}</option>
      </select>
    </label>

    <div class="platforms compact-platforms">
      <label v-for="platform in platformOptions" :key="platform.id">
        <input
          type="checkbox"
          :value="platform.id"
          :checked="targetPlatforms.includes(platform.id)"
          @change="togglePlatform(platform.id, ($event.target as HTMLInputElement).checked)"
        />
        {{ platform.label }}
      </label>
    </div>

    <div class="radio-row">
      <label>
        <input
          type="radio"
          value="direct"
          :checked="mode === 'direct'"
          @change="emit('updateMode', 'direct')"
        />
        直接发布
      </label>
      <label>
        <input
          type="radio"
          value="draft"
          :checked="mode === 'draft'"
          @change="emit('updateMode', 'draft')"
        />
        草稿
      </label>
    </div>

    <div class="button-row">
      <button
        class="primary wide-button"
        :disabled="disabled || targetPlatforms.length === 0 || !videoPath"
        @click="publish"
      >
        <CloudUpload :size="16" />
        {{ isPublishing ? '发布中...' : '立即发布' }}
      </button>
    </div>
  </section>
</template>

<style scoped>
/* Card chrome and form elements are styled globally. */
</style>
