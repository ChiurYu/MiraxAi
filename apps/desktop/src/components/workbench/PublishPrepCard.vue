<script setup lang="ts">
import { ClipboardCheck, Image } from "lucide-vue-next";
import { computed } from "vue";
import type { PublishMetadata, WorkflowStageStatus } from "@mirax/core";
import StatusBadge from "../StatusBadge.vue";

const props = defineProps<{
  metadata: PublishMetadata;
  status: WorkflowStageStatus;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  update: [metadata: Partial<PublishMetadata>];
  review: [];
}>();

function updateTitle(value: string) {
  emit("update", { title: value });
}

function updateDescription(value: string) {
  emit("update", { description: value });
}

function updateTags(value: string) {
  emit("update", { tags: value.split(",").map((tag) => tag.trim()).filter(Boolean) });
}

function updateMode(value: "direct" | "draft") {
  emit("update", { mode: value });
}

const tagsText = computed(() => props.metadata.tags.join(", "));
</script>

<template>
  <section class="workflow-card publish-prep-card">
    <div class="card-heading">
      <span class="card-icon"><ClipboardCheck :size="19" /></span>
      <h2>6. 标题封面（用于发布）</h2>
      <StatusBadge :status="status" />
    </div>

    <label>
      <span>标题</span>
      <div class="action-input">
        <input :value="metadata.title" placeholder="输入视频标题" @input="updateTitle(($event.target as HTMLInputElement).value)" />
        <button @click="emit('update', { title: '' })">一键生成</button>
      </div>
    </label>

    <label>
      <span>描述</span>
      <textarea
        :value="metadata.description"
        placeholder="输入视频描述..."
        @input="updateDescription(($event.target as HTMLTextAreaElement).value)"
      />
    </label>

    <label>
      <span>话题标签</span>
      <input :value="tagsText" placeholder="输入标签后回车，发布时自动拼接 #tag" @input="updateTags(($event.target as HTMLInputElement).value)" />
    </label>

    <div class="cover-row">
      <div class="cover-preview">
        <Image :size="26" />
        <span>{{ metadata.coverPath ? '封面已生成' : '暂无封面' }}</span>
      </div>
      <div class="cover-actions">
        <button>封面设计</button>
        <button :disabled="!metadata.coverPath">打开封面</button>
        <button :disabled="!metadata.coverPath">导出封面</button>
      </div>
    </div>

    <div class="radio-row">
      <label>
        <input
          type="radio"
          value="direct"
          :checked="metadata.mode === 'direct'"
          @change="updateMode('direct')"
        />
        直接发布
      </label>
      <label>
        <input
          type="radio"
          value="draft"
          :checked="metadata.mode === 'draft'"
          @change="updateMode('draft')"
        />
        草稿
      </label>
    </div>

    <div class="button-row">
      <button class="primary compact-button" :disabled="disabled" @click="emit('review')">
        <ClipboardCheck :size="16" /> 复核通过
      </button>
    </div>
  </section>
</template>

<style scoped>
/* Card chrome and form elements are styled globally.
   This component only keeps a small local override for the cover preview ratio. */
</style>
