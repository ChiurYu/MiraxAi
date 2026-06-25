<script setup lang="ts">
import {
  FileVideo,
  Grid3X3,
  Info,
  List,
  Loader2,
  Split,
  Subtitles,
} from "lucide-vue-next";
import type { WorkflowStageStatus } from "@mirax/core";

const props = defineProps<{
  running?: boolean;
  status?: WorkflowStageStatus;
}>();
</script>

<template>
  <div class="material-parsing-preview">
    <div class="preview-grid-bg" aria-hidden="true" />

    <div class="preview-content">
      <div class="preview-phone" :class="{ 'is-processing': running }">
        <template v-if="!running">
          <FileVideo :size="48" />
          <p>等待输入源素材进行解析</p>
        </template>
        <div v-else class="phone-overlay">
          <Loader2 :size="48" class="spin" />
          <p>Decoding...</p>
        </div>
      </div>

      <div v-if="!running" class="preview-info">
        <h3>工作区就绪</h3>
        <p>解析完成后，此处将分栏显示：</p>
        <div class="preview-features">
          <span><Info :size="16" /> 视频信息</span>
          <span><Subtitles :size="16" /> 原始文案</span>
          <span><List :size="16" /> 关键片段</span>
        </div>
      </div>

      <div v-else class="processing-details">
        <div class="metadata-grid">
          <div class="metadata-card">
            <span class="metadata-label">视频时长</span>
            <span class="mx-skeleton mx-skeleton-pulse metadata-value-skeleton" />
          </div>
          <div class="metadata-card">
            <span class="metadata-label">分辨率</span>
            <span class="mx-skeleton mx-skeleton-pulse metadata-value-skeleton" />
          </div>
        </div>

        <div class="detail-section">
          <div class="detail-header">
            <span class="detail-title">原始文案</span>
            <span class="detail-status">
              <Loader2 :size="12" class="spin" />
              处理中...
            </span>
          </div>
          <div class="detail-body">
            <div class="mx-skeleton mx-skeleton-pulse text-skeleton" />
            <div class="mx-skeleton mx-skeleton-pulse text-skeleton short" />
          </div>
        </div>

        <div class="detail-section">
          <div class="detail-header">
            <span class="detail-title">关键片段</span>
            <span class="detail-status">
              <Loader2 :size="12" class="spin" />
              解析中...
            </span>
          </div>
          <div class="detail-body">
            <div class="mx-skeleton mx-skeleton-pulse thumb-skeleton" />
            <div class="mx-skeleton mx-skeleton-pulse thumb-skeleton" />
            <div class="mx-skeleton mx-skeleton-pulse thumb-skeleton" />
          </div>
        </div>
      </div>
    </div>

    <div class="preview-actions" aria-hidden="true">
      <span class="preview-action" title="视图切换（待接入）">
        <Grid3X3 :size="18" />
      </span>
      <span class="preview-action" title="视图切换（待接入）">
        <Split :size="18" />
      </span>
    </div>
  </div>
</template>

<style scoped>
.material-parsing-preview {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  padding: 24px;
  background: var(--mx-bg-base);
  overflow: hidden;
}

.preview-grid-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.08;
  background-image: radial-gradient(var(--mx-border-active) 1px, transparent 1px);
  background-size: 24px 24px;
}

.preview-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  width: 100%;
  max-width: 480px;
  min-height: 0;
  overflow-y: auto;
}

.preview-phone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 240px;
  max-width: 240px;
  height: 426px;
  max-height: 426px;
  aspect-ratio: 9 / 16;
  border: 2px dashed var(--mx-border-active);
  border-radius: var(--mx-radius-lg);
  background: var(--mx-bg-panel);
  color: var(--mx-text-tertiary);
  flex-shrink: 0;
}

.preview-phone.is-processing {
  border-style: solid;
  border-color: var(--mx-border-default);
  background: var(--mx-bg-elevated);
}

.preview-phone p {
  margin: 0;
  padding: 0 20px;
  font-size: 12px;
  color: var(--mx-text-secondary);
}

.phone-overlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(2px);
  color: var(--mx-accent);
}

.phone-overlay p {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.5px;
  color: var(--mx-accent);
}

.preview-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  text-align: center;
}

.preview-info h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--mx-text-primary);
}

.preview-info > p {
  margin: 0;
  font-size: 13px;
  color: var(--mx-text-secondary);
}

.preview-features {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin-top: 6px;
}

.preview-features span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 10px;
  border: 1px solid var(--mx-border-default);
  border-radius: var(--mx-radius-md);
  background: var(--mx-bg-elevated);
  font-size: 12px;
  color: var(--mx-text-secondary);
}

.processing-details {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}

.metadata-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.metadata-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  border: 1px solid var(--mx-border-subtle);
  border-radius: var(--mx-radius-md);
  background: var(--mx-bg-surface);
  text-align: left;
}

.metadata-label {
  font-size: 11px;
  color: var(--mx-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.metadata-value-skeleton {
  height: 16px;
  width: 70%;
}

.detail-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--mx-border-subtle);
  border-radius: var(--mx-radius-md);
  background: var(--mx-bg-surface);
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--mx-border-subtle);
}

.detail-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--mx-text-primary);
}

.detail-status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: var(--mx-accent);
}

.detail-body {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.text-skeleton {
  height: 12px;
  width: 100%;
}

.text-skeleton.short {
  width: 75%;
}

.thumb-skeleton {
  width: 64px;
  height: 64px;
  border-radius: var(--mx-radius-md);
}

.preview-actions {
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  gap: 8px;
  opacity: 0.5;
  pointer-events: none;
}

.preview-action {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--mx-border-default);
  border-radius: var(--mx-radius-md);
  background: var(--mx-bg-surface);
  color: var(--mx-text-tertiary);
}

@media (max-height: 760px) {
  .preview-content {
    gap: 16px;
  }

  .preview-phone {
    width: 180px;
    max-width: 180px;
    height: 320px;
    max-height: 320px;
  }

  .preview-info h3 {
    font-size: 14px;
  }

  .preview-info > p {
    font-size: 12px;
  }
}
</style>
