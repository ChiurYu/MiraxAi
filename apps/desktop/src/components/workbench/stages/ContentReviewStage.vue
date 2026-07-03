<script setup lang="ts">
import { Check, FileVideo, Image, X } from "lucide-vue-next";
import { computed, ref, watch } from "vue";
import type { PublishMetadata, PublishPlatform, WorkflowStageStatus } from "@mirax/core";
import { deriveContentReviewReadiness, fileName } from "./contentReviewReadiness.js";

interface PlatformInfo {
  id: PublishPlatform;
  label: string;
  titleMaxLength: number;
  descriptionMaxLength: number;
  supportsDraftMode: boolean;
}

const props = withDefaults(
  defineProps<{
    metadata: PublishMetadata;
    videoPath: string;
    coverPath: string;
    coverCandidates?: string[];
    targetPlatforms: PublishPlatform[];
    platformProfiles: PlatformInfo[];
    running: boolean;
    status: WorkflowStageStatus;
  }>(),
  {
    coverCandidates: () => [],
  },
);

const emit = defineEmits<{
  "update:metadata": [Partial<PublishMetadata>];
  confirm: [];
  "open-video": [];
  "return-to-compose": [];
}>();

const effectiveCandidates = computed(() => {
  if (props.coverCandidates.length > 0) {
    return props.coverCandidates.slice(0, 3);
  }
  return props.coverPath ? [props.coverPath] : [];
});

// WB-08 默认选中第一张本地封面候选，避免封面空缺。
watch(
  effectiveCandidates,
  (urls) => {
    if (!props.metadata.coverPath && urls.length > 0) {
      selectCover(urls[0]);
    }
  },
  { immediate: true },
);

const tagInput = ref("");

const titleLimit = computed(() => {
  if (props.targetPlatforms.length === 0) return 55;
  return Math.min(
    ...props.targetPlatforms.map((id) => {
      const profile = props.platformProfiles.find((p) => p.id === id);
      return profile?.titleMaxLength ?? 55;
    }),
  );
});

const descriptionLimit = computed(() => {
  if (props.targetPlatforms.length === 0) return 2200;
  return Math.min(
    ...props.targetPlatforms.map((id) => {
      const profile = props.platformProfiles.find((p) => p.id === id);
      return profile?.descriptionMaxLength ?? 2200;
    }),
  );
});

function updateTitle(value: string) {
  emit("update:metadata", { title: value });
}

function updateDescription(value: string) {
  emit("update:metadata", { description: value });
}

function addTag() {
  const raw = tagInput.value.trim();
  if (!raw) return;
  const tags = raw
    .split(/[,，]/)
    .map((t) => t.trim())
    .filter(Boolean);
  const next = [...new Set([...props.metadata.tags, ...tags])];
  emit("update:metadata", { tags: next });
  tagInput.value = "";
}

function removeTag(tag: string) {
  emit("update:metadata", { tags: props.metadata.tags.filter((t) => t !== tag) });
}

function selectCover(path: string) {
  emit("update:metadata", { coverPath: path });
}

const platformLabels = computed(() =>
  Object.fromEntries(
    props.platformProfiles.map((profile) => [profile.id, profile.label]),
  ) as Record<PublishPlatform, string>,
);

const readinessItems = computed(() =>
  deriveContentReviewReadiness({
    metadata: props.metadata,
    videoPath: props.videoPath,
    targetPlatforms: props.targetPlatforms,
    platformLabels: platformLabels.value,
  }),
);

const allReady = computed(() => readinessItems.value.every((item) => item.ok));

const confirmDisabled = computed(() => props.running || !allReady.value || !props.videoPath);

function handleTagKeydown(event: KeyboardEvent) {
  if (event.key === "Enter") {
    event.preventDefault();
    addTag();
  }
}
</script>

<template>
  <div class="review-stage" :data-status="status">
    <div class="review-controls">
      <div class="review-mock-banner">
        <span class="mx-status-badge is-mock" data-testid="review-mock-badge">Mock 复核</span>
        <span class="review-mock-hint">仅本地预览，不会真实发布。</span>
      </div>

      <div class="review-section">
        <div class="review-section-heading">
          <span>标题</span>
          <span class="char-counter">{{ metadata.title.length }}/{{ titleLimit }}</span>
        </div>
        <input
          data-testid="review-title"
          :value="metadata.title"
          placeholder="输入视频标题"
          :maxlength="titleLimit"
          :disabled="running"
          @input="updateTitle(($event.target as HTMLInputElement).value)"
        />
      </div>

      <div class="review-section">
        <div class="review-section-heading">
          <span>描述</span>
          <span class="char-counter">{{ metadata.description.length }}/{{ descriptionLimit }}</span>
        </div>
        <textarea
          data-testid="review-description"
          :value="metadata.description"
          placeholder="输入视频描述..."
          :maxlength="descriptionLimit"
          :disabled="running"
          @input="updateDescription(($event.target as HTMLTextAreaElement).value)"
        />
      </div>

      <div class="review-section">
        <div class="review-section-heading">
          <span>话题标签</span>
          <span class="hint-text">用回车或逗号分隔</span>
        </div>
        <div class="tag-input-row">
          <input
            v-model="tagInput"
            data-testid="tag-input"
            placeholder="输入标签"
            :disabled="running"
            @keydown="handleTagKeydown"
          />
          <button
            type="button"
            class="secondary"
            data-testid="add-tag-btn"
            :disabled="running || !tagInput.trim()"
            @click="addTag"
          >
            添加
          </button>
        </div>
        <div class="tag-list">
          <span v-for="tag in metadata.tags" :key="tag" class="tag-pill">
            {{ tag }}
            <button
              type="button"
              data-testid="remove-tag-btn"
              :disabled="running"
              @click="removeTag(tag)"
            >
              <X :size="12" />
            </button>
          </span>
          <span v-if="metadata.tags.length === 0" class="tag-empty">暂无标签</span>
        </div>
      </div>

      <div class="review-section">
        <div class="review-section-heading">
          <span>封面候选</span>
          <span class="hint-text">点击选择最终封面</span>
        </div>
        <div class="cover-candidates">
          <button
            v-for="(url, index) in effectiveCandidates"
            :key="url"
            type="button"
            class="cover-candidate"
            :data-testid="`cover-candidate-${index}`"
            :class="{ selected: metadata.coverPath === url }"
            :disabled="running"
            @click="selectCover(url)"
          >
            <img :src="url" :alt="`封面候选 ${index + 1}`" />
          </button>
          <button
            v-for="index in 3 - effectiveCandidates.length"
            :key="`placeholder-${index}`"
            type="button"
            class="cover-candidate"
            :data-testid="`cover-candidate-${effectiveCandidates.length + index - 1}`"
            disabled
          >
            <span class="cover-candidate-placeholder">
              <Image :size="20" />
              候选封面 {{ effectiveCandidates.length + index }}
            </span>
          </button>
        </div>
      </div>

      <div class="review-section">
        <div class="review-section-heading">
          <span>发布就绪检查</span>
        </div>
        <ul class="readiness-list">
          <li
            v-for="item in readinessItems"
            :key="item.id"
            class="readiness-item"
            :class="{ ok: item.ok }"
            :data-readiness="item.id"
          >
            <span class="readiness-check">
              <Check v-if="item.ok" :size="14" />
            </span>
            <span>{{ item.label }}</span>
          </li>
        </ul>
      </div>

      <div class="review-actions">
        <span class="mx-status-badge is-mock" data-testid="review-mock-action-badge">Mock 复核</span>
        <button
          type="button"
          class="primary"
          data-testid="confirm-content"
          :disabled="confirmDisabled"
          @click="emit('confirm')"
        >
          确认内容
        </button>
        <button
          type="button"
          class="secondary"
          data-testid="open-video"
          :disabled="running || !videoPath"
          @click="emit('open-video')"
        >
          打开视频
        </button>
        <button
          type="button"
          class="ghost-button"
          data-testid="return-to-compose"
          :disabled="running"
          @click="emit('return-to-compose')"
        >
          返回合成
        </button>
      </div>
    </div>

    <div class="review-result">
      <div class="final-preview">
        <div class="preview-frame">
          <img
            v-if="metadata.coverPath"
            class="preview-cover"
            :src="metadata.coverPath"
            alt="封面"
          />
          <div v-else class="preview-cover-empty">
            <Image :size="28" />
            <span>未选择封面</span>
          </div>
          <div class="preview-video">
            <FileVideo :size="28" />
            <span>{{ videoPath ? fileName(videoPath) : "视频尚未生成" }}</span>
          </div>
        </div>

        <div class="review-summary">
          <div
            v-for="item in readinessItems"
            :key="item.id"
            class="review-summary-row"
            :data-summary="item.id"
          >
            <strong>{{ item.name }}</strong>
            <span>{{ item.value }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.review-mock-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--mx-radius-md);
  background: var(--mx-warning-bg);
  color: var(--mx-warning);
  font-size: 12px;
}

.review-mock-hint {
  color: var(--mx-warning);
  opacity: 0.9;
}
</style>
