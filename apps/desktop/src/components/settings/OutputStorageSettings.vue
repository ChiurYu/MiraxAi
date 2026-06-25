<script setup lang="ts">
import { FolderOpen, HardDrive, Save } from "lucide-vue-next";
import { computed, ref } from "vue";
import { useAppSettings } from "../../composables/useAppSettings.js";

const { appSettings } = useAppSettings();

const organizationMode = ref<"flat" | "by-project" | "by-stage">("by-project");
const folderTemplate = ref("{{project}}/{{stage}}/{{date}}");
const namingTemplate = ref("{{project}}_{{stage}}_{{index}}");
const conflictStrategy = ref<"overwrite" | "rename" | "skip">("rename");

const includeAudio = ref(true);
const includeVideo = ref(true);
const includeCover = ref(true);
const includeSubtitles = ref(false);

const protectionToggles = ref({
  confirmOverwrite: true,
  keepOriginals: true,
  versionExports: true,
  restrictNetworkPaths: false,
});

const previewItems = computed(() => {
  const base = appSettings.outputPaths.baseOutput || "/Users/Shared/MiraxAI";
  const project = "demo-project";
  const stage = "speech";
  const date = "2026-06-25";
  const folder = folderTemplate.value
    .replace("{{project}}", project)
    .replace("{{stage}}", stage)
    .replace("{{date}}", date);
  const name = namingTemplate.value
    .replace("{{project}}", project)
    .replace("{{stage}}", stage)
    .replace("{{index}}", "001");
  return [
    `${base}/${folder}/${name}.mp4`,
    `${base}/${folder}/${name}_cover.jpg`,
    includeAudio.value ? `${base}/${folder}/${name}.wav` : null,
    includeSubtitles.value ? `${base}/${folder}/${name}.srt` : null,
  ].filter(Boolean) as string[];
});

function simulateSaveOrganization() {
  window.alert("目录组织规则仅为会话内预览，全局模板持久化将在本地存储模块接入后启用。");
}
</script>

<template>
  <div class="settings-section output-storage-settings">
    <div class="section-hero">
      <h2>输出与存储</h2>
      <p>管理项目产物目录、文件命名规则与默认输出格式。基础输出目录会持久化到本地；其余规则当前为会话预览。</p>
    </div>

    <section class="settings-card">
      <div class="settings-card-header">
        <h3>基础输出目录</h3>
      </div>
      <div class="settings-card-body">
        <label class="field">
          <span class="field-label">根目录</span>
          <input v-model="appSettings.outputPaths.baseOutput" placeholder="/Users/Shared/MiraxAI" />
        </label>
        <div class="output-path-meta">
          <span class="meta-item">
            <HardDrive :size="14" />
            可用空间：本地检测尚未接入
          </span>
          <span class="meta-item">
            上次检查：—
          </span>
        </div>
        <div class="output-path-actions">
          <button type="button" class="secondary" disabled title="文件选择器尚未接入">
            <FolderOpen :size="14" />
            选择目录
          </button>
          <button type="button" class="ghost-button" disabled title="真实检测尚未接入">
            <HardDrive :size="14" />
            检测空间
          </button>
        </div>
      </div>
    </section>

    <section class="settings-card">
      <div class="settings-card-header">
        <h3>目录组织方式</h3>
      </div>
      <div class="settings-card-body">
        <label class="field">
          <span class="field-label">组织模式</span>
          <select v-model="organizationMode">
            <option value="flat">平铺（所有产物放在根目录）</option>
            <option value="by-project">按项目分文件夹</option>
            <option value="by-stage">按项目 + 阶段分文件夹</option>
          </select>
        </label>

        <label class="field">
          <span class="field-label">文件夹模板</span>
          <input v-model="folderTemplate" />
        </label>

        <div class="template-variables">
          <span class="variables-label">可用变量：</span>
          <code v-pre>{{project}}</code>
          <code v-pre>{{stage}}</code>
          <code v-pre>{{date}}</code>
        </div>

        <div class="directory-preview">
          <div class="preview-title">预览</div>
          <div v-for="path in previewItems" :key="path" class="preview-line">{{ path }}</div>
        </div>
      </div>
    </section>

    <section class="settings-card">
      <div class="settings-card-header">
        <h3>文件命名规则</h3>
      </div>
      <div class="settings-card-body">
        <label class="field">
          <span class="field-label">文件名模板</span>
          <input v-model="namingTemplate" />
        </label>

        <div class="template-variables">
          <span class="variables-label">可用变量：</span>
          <code v-pre>{{project}}</code>
          <code v-pre>{{stage}}</code>
          <code v-pre>{{index}}</code>
        </div>

        <label class="field">
          <span class="field-label">重名策略</span>
          <select v-model="conflictStrategy">
            <option value="overwrite">覆盖</option>
            <option value="rename">自动重命名</option>
            <option value="skip">跳过</option>
          </select>
        </label>
      </div>
    </section>

    <section class="settings-card">
      <div class="settings-card-header">
        <h3>默认输出格式</h3>
      </div>
      <div class="settings-card-body">
        <label class="toggle-row">
          <input v-model="includeVideo" type="checkbox" />
          <span>视频（MP4）</span>
        </label>
        <label class="toggle-row">
          <input v-model="includeAudio" type="checkbox" />
          <span>音频（WAV）</span>
        </label>
        <label class="toggle-row">
          <input v-model="includeCover" type="checkbox" />
          <span>封面（JPG）</span>
        </label>
        <label class="toggle-row">
          <input v-model="includeSubtitles" type="checkbox" />
          <span>字幕（SRT）</span>
        </label>
      </div>
    </section>

    <section class="settings-card">
      <div class="settings-card-header">
        <h3>存储保护</h3>
      </div>
      <div class="settings-card-body">
        <label class="toggle-row">
          <input v-model="protectionToggles.confirmOverwrite" type="checkbox" />
          <span>覆盖前确认</span>
        </label>
        <label class="toggle-row">
          <input v-model="protectionToggles.keepOriginals" type="checkbox" />
          <span>保留原始素材副本</span>
        </label>
        <label class="toggle-row">
          <input v-model="protectionToggles.versionExports" type="checkbox" />
          <span>导出时附加版本号</span>
        </label>
        <label class="toggle-row">
          <input v-model="protectionToggles.restrictNetworkPaths" type="checkbox" />
          <span>禁止选择网络/可移动磁盘路径</span>
        </label>
      </div>
    </section>

    <div class="settings-section-actions">
      <button type="button" class="secondary" @click="simulateSaveOrganization">
        <Save :size="16" />
        保存组织规则
      </button>
    </div>
  </div>
</template>

<style scoped>
.output-storage-settings {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 720px;
}

.section-hero h2 {
  margin: 0 0 6px;
  font-size: 18px;
  font-weight: 700;
}

.section-hero p {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--mx-text-tertiary);
}

.settings-card {
  border: 1px solid var(--mx-border-subtle);
  border-radius: var(--mx-radius-lg);
  background: var(--mx-bg-panel);
  overflow: hidden;
}

.settings-card-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--mx-border-subtle);
  background: var(--mx-bg-elevated);
}

.settings-card-header h3 {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--mx-text-primary);
}

.settings-card-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--mx-text-secondary);
}

.output-path-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 12px;
  color: var(--mx-text-tertiary);
}

.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.output-path-actions {
  display: flex;
  gap: 10px;
}

.output-path-actions button {
  min-height: 30px;
}

.template-variables {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 12px;
  color: var(--mx-text-tertiary);
}

.template-variables code {
  padding: 2px 6px;
  border-radius: var(--mx-radius-sm);
  font-size: 11px;
  color: var(--mx-accent);
  background: var(--mx-accent-soft-bg);
}

.directory-preview {
  padding: 12px;
  border-radius: var(--mx-radius-md);
  background: var(--mx-bg-input);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  line-height: 1.7;
  color: var(--mx-text-secondary);
}

.preview-title {
  margin-bottom: 6px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--mx-text-tertiary);
}

.preview-line {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.toggle-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--mx-text-primary);
  cursor: pointer;
}

.settings-section-actions {
  display: flex;
  gap: 10px;
}
</style>
