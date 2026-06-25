<script setup lang="ts">
import { ClipboardCheck, Image } from "lucide-vue-next";
import { computed } from "vue";
import type { PublishMetadata, WorkflowStageStatus } from "@mirax/core";
import StatusBadge from "../ui/StatusBadge.vue";

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
  <section class="workflow-card publish-meta-card" :data-status="status">
    <div class="card-heading">
      <span class="card-icon"><ClipboardCheck :size="19" /></span>
      <h2>6. 标题封面（用于发布）</h2>
      <StatusBadge :status="status" />
    </div>

    <div class="stage-inputs">
      <label>
        <span>标题</span>
        <div class="action-input">
          <input
            :value="metadata.title"
            placeholder="输入视频标题"
            @input="updateTitle(($event.target as HTMLInputElement).value)"
          />
          <button type="button" @click="emit('update', { title: '' })">一键生成</button>
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
        <input
          :value="tagsText"
          placeholder="输入标签后回车，发布时自动拼接 #tag"
          @input="updateTags(($event.target as HTMLInputElement).value)"
        />
      </label>
    </div>

    <div class="stage-output">
      <div class="cover-row">
        <div class="cover-preview"
          :class="{ 'has-value': metadata.coverPath }"
        >
          <Image :size="26" />
          <span>{{ metadata.coverPath ? '封面已生成' : '暂无封面' }}</span>
          <span v-if="metadata.coverPath" class="output-path">{{ metadata.coverPath }}</span>
        </div>
        <div class="cover-actions">
          <button type="button">封面设计</button>
          <button type="button" :disabled="!metadata.coverPath">打开封面</button>
          <button type="button" :disabled="!metadata.coverPath">导出封面</button>
        </div>
      </div>
    </div>

    <div class="stage-inputs">
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
    </div>

    <div class="stage-actions">
      <button class="primary compact-button" type="button" :disabled="disabled" @click="emit('review')">
        <ClipboardCheck :size="16" /> 复核通过
      </button>
    </div>
  </section>
</template>

<style scoped>
/* Card chrome and form elements are styled globally. */
</style>
