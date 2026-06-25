<script setup lang="ts">
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Play,
  Trash2,
  X,
  XCircle,
} from "lucide-vue-next";
import { ref, computed } from "vue";
import AppDialog from "../../components/ui/AppDialog.vue";
import AppDrawer from "../../components/ui/AppDrawer.vue";
import type { AssetKind, AssetListItem } from "../../features/assets/assetModels.js";

const props = defineProps<{
  open: boolean;
  item: AssetListItem;
  kind: AssetKind;
}>();

const emit = defineEmits<{
  close: [];
  use: [item: AssetListItem];
  delete: [item: AssetListItem];
}>();

const showDeleteDialog = ref(false);

const isReady = computed(() => props.item.status === "ready");

const statusMeta = computed(() => {
  switch (props.item.status) {
    case "ready":
      return { icon: CheckCircle2, label: "已就绪", class: "is-ready" };
    case "failed":
      return { icon: XCircle, label: "失败", class: "is-failed" };
    case "training":
    case "processing":
      return { icon: Loader2, label: props.item.statusText, class: "is-processing" };
    default:
      return { icon: AlertTriangle, label: "未知", class: "" };
  }
});

function confirmDelete() {
  showDeleteDialog.value = true;
}

function doDelete() {
  showDeleteDialog.value = false;
  emit("delete", props.item);
}

function cancelDelete() {
  showDeleteDialog.value = false;
}

function formatMetaLabel(key: string): string {
  return key;
}

function formatMetaValue(value: string): string {
  return value;
}
</script>

<template>
  <AppDrawer
    :open="open"
    :title="kind === 'material' ? '素材详情' : kind === 'avatar' ? '形象详情' : '声音详情'"
    @close="emit('close')"
  >
    <div class="asset-detail">
      <div class="asset-detail-header">
        <div class="asset-detail-title">
          <h3>{{ item.name }}</h3>
          <div class="asset-detail-status" :class="statusMeta.class">
            <component
              :is="statusMeta.icon"
              :size="14"
              :class="{ spin: item.status === 'training' || item.status === 'processing' }"
            />
            <span>{{ statusMeta.label }}</span>
          </div>
        </div>
        <span v-if="item.version" class="asset-detail-version">{{ item.version }}</span>
      </div>

      <div class="asset-detail-preview">
        <img
          v-if="item.preview"
          :src="item.preview"
          :alt="item.name"
        />
        <div v-else class="asset-detail-preview-placeholder">
          <Play :size="32" />
          <span>音频预览占位</span>
        </div>

        <button
          v-if="kind === 'voice' || kind === 'avatar'"
          type="button"
          class="asset-detail-play"
          :disabled="!isReady"
          @click.stop
        >
          <Play :size="20" />
        </button>
      </div>

      <div v-if="item.description" class="asset-detail-description">
        {{ item.description }}
      </div>

      <div class="asset-detail-meta">
        <div
          v-for="(value, key) in item.metadata"
          :key="key"
          class="asset-detail-meta-item"
        >
          <span class="asset-detail-meta-label">{{ formatMetaLabel(key) }}</span>
          <span class="asset-detail-meta-value">{{ formatMetaValue(value) }}</span>
        </div>
        <div v-if="item.language" class="asset-detail-meta-item">
          <span class="asset-detail-meta-label">语言</span>
          <span class="asset-detail-meta-value">{{ item.language }}</span>
        </div>
        <div v-if="item.style" class="asset-detail-meta-item">
          <span class="asset-detail-meta-label">
            {{ kind === 'material' ? '分类' : '场景 / 风格' }}
          </span>
          <span class="asset-detail-meta-value">{{ item.style }}</span>
        </div>
        <div v-if="item.duration" class="asset-detail-meta-item">
          <span class="asset-detail-meta-label">时长</span>
          <span class="asset-detail-meta-value">{{ item.duration }}</span>
        </div>
        <div v-if="item.resolution" class="asset-detail-meta-item">
          <span class="asset-detail-meta-label">分辨率</span>
          <span class="asset-detail-meta-value">{{ item.resolution }}</span>
        </div>
        <div v-if="item.size" class="asset-detail-meta-item">
          <span class="asset-detail-meta-label">大小</span>
          <span class="asset-detail-meta-value">{{ item.size }}</span>
        </div>
        <div v-if="item.sourceLabel" class="asset-detail-meta-item">
          <span class="asset-detail-meta-label">来源</span>
          <span class="asset-detail-meta-value">{{ item.sourceLabel }}</span>
        </div>
        <div v-if="item.updatedAt" class="asset-detail-meta-item">
          <span class="asset-detail-meta-label">更新于</span>
          <span class="asset-detail-meta-value">{{ item.updatedAt.includes('T') ? new Date(item.updatedAt).toLocaleString('zh-CN') : item.updatedAt }}</span>
        </div>
      </div>
    </div>

    <template #actions>
      <button
        type="button"
        class="primary"
        :disabled="!isReady"
        :title="isReady ? '在工作台中使用此资产' : '资产尚未就绪'"
        @click="emit('use', item)"
      >
        在工作台中使用
      </button>
      <button
        type="button"
        class="ghost-button danger"
        @click="confirmDelete"
      >
        <Trash2 :size="14" />
        删除
      </button>
    </template>
  </AppDrawer>

  <AppDialog
    :open="showDeleteDialog"
    title="确认删除资产"
    @close="cancelDelete"
  >
    <p>
      删除后仅会从当前会话列表中移除，不会真正删除本地文件或服务端资产。
    </p>
    <template #actions>
      <button type="button" class="secondary" @click="cancelDelete">
        取消
      </button>
      <button type="button" class="legal-button" @click="doDelete">
        确认删除
      </button>
    </template>
  </AppDialog>
</template>

<style scoped>
.asset-detail {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.asset-detail-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.asset-detail-title h3 {
  margin: 0 0 6px;
  font-size: 18px;
  font-weight: 700;
  color: var(--mx-text-primary);
}

.asset-detail-status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 600;
}

.asset-detail-status.is-ready {
  color: var(--mx-success);
}

.asset-detail-status.is-failed {
  color: var(--mx-error);
}

.asset-detail-status.is-processing {
  color: var(--mx-accent);
}

.asset-detail-version {
  flex-shrink: 0;
  padding: 2px 6px;
  border-radius: var(--mx-radius-sm);
  font-size: 11px;
  color: var(--mx-text-secondary);
  background: var(--mx-bg-elevated);
}

.asset-detail-preview {
  position: relative;
  border-radius: var(--mx-radius-md);
  overflow: hidden;
  background: var(--mx-bg-elevated);
  aspect-ratio: 9 / 16;
}

.asset-detail-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.asset-detail-preview-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  gap: 8px;
  color: var(--mx-text-tertiary);
  background: var(--mx-bg-input);
}

.asset-detail-play {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  color: #ffffff;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(4px);
}

.asset-detail-play:disabled {
  opacity: 0.4;
}

.asset-detail-description {
  font-size: 12px;
  line-height: 1.6;
  color: var(--mx-text-secondary);
}

.asset-detail-meta {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--mx-border-subtle);
  border-radius: var(--mx-radius-md);
  background: var(--mx-bg-elevated);
}

.asset-detail-meta-item {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.asset-detail-meta-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  color: var(--mx-text-tertiary);
}

.asset-detail-meta-value {
  font-size: 12px;
  color: var(--mx-text-primary);
  word-break: break-word;
}

@media (max-width: 1180px) {
  .asset-detail-meta {
    grid-template-columns: 1fr;
  }
}
</style>
