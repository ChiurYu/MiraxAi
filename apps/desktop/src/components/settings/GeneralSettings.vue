<script setup lang="ts">
import { ref } from "vue";
import { useAppSettings } from "../../composables/useAppSettings.js";

const { appSettings } = useAppSettings();

const uiDensity = ref<"comfortable" | "compact">("comfortable");
const fontScale = ref(100);
const startupPage = ref<"workbench" | "last">("last");
const autoSaveDraft = ref(true);
const executionMode = ref<"manual" | "auto" | "background">("manual");

const startToggles = ref({
  reopenLastProject: true,
  resumeStage: false,
  checkDependencies: true,
  showWhatsNew: false,
});

const notificationToggles = ref({
  stageComplete: true,
  stageFailed: true,
  publishReady: true,
  updateAvailable: false,
});

function resetToDefaults() {
  uiDensity.value = "comfortable";
  fontScale.value = 100;
  startupPage.value = "last";
  autoSaveDraft.value = true;
  executionMode.value = "manual";
  startToggles.value = {
    reopenLastProject: true,
    resumeStage: false,
    checkDependencies: true,
    showWhatsNew: false,
  };
  notificationToggles.value = {
    stageComplete: true,
    stageFailed: true,
    publishReady: true,
    updateAvailable: false,
  };
}
</script>

<template>
  <div class="settings-section general-settings">
    <div class="section-hero">
      <h2>通用</h2>
      <p>外观、启动与通知等全局偏好。已持久化的字段会自动保存到本地；其余选项仅在当前会话生效。</p>
    </div>

    <section class="settings-card">
      <div class="settings-card-header">
        <h3>外观</h3>
      </div>
      <div class="settings-card-body">
        <label class="field">
          <span class="field-label">主题模式</span>
          <select v-model="appSettings.theme">
            <option value="system">跟随系统</option>
            <option value="light">浅色</option>
            <option value="dark">深色</option>
          </select>
        </label>

        <label class="field">
          <span class="field-label">界面密度</span>
          <select v-model="uiDensity">
            <option value="comfortable">舒适</option>
            <option value="compact">紧凑</option>
          </select>
        </label>

        <label class="field">
          <span class="field-label">字体缩放 {{ fontScale }}%</span>
          <input v-model.number="fontScale" type="range" min="85" max="125" step="5" />
        </label>
      </div>
    </section>

    <section class="settings-card">
      <div class="settings-card-header">
        <h3>启动与恢复</h3>
      </div>
      <div class="settings-card-body">
        <label class="field">
          <span class="field-label">启动页面</span>
          <select v-model="startupPage">
            <option value="last">恢复上次退出位置</option>
            <option value="workbench">工作台首页</option>
          </select>
        </label>

        <label class="toggle-row">
          <input v-model="startToggles.reopenLastProject" type="checkbox" />
          <span>自动打开最近项目</span>
        </label>
        <label class="toggle-row">
          <input v-model="startToggles.resumeStage" type="checkbox" />
          <span>回到上次运行阶段</span>
        </label>
        <label class="toggle-row">
          <input v-model="startToggles.checkDependencies" type="checkbox" />
          <span>启动时检查本地依赖</span>
        </label>
        <label class="toggle-row">
          <input v-model="startToggles.showWhatsNew" type="checkbox" />
          <span>更新后显示新功能提示</span>
        </label>
      </div>
    </section>

    <section class="settings-card">
      <div class="settings-card-header">
        <h3>默认工作方式</h3>
      </div>
      <div class="settings-card-body">
        <label class="field">
          <span class="field-label">执行模式</span>
          <select v-model="executionMode">
            <option value="manual">手动确认每一步</option>
            <option value="auto">自动运行连续阶段</option>
            <option value="background">后台队列</option>
          </select>
        </label>

        <label class="toggle-row">
          <input v-model="autoSaveDraft" type="checkbox" />
          <span>自动保存草稿</span>
        </label>
      </div>
    </section>

    <section class="settings-card">
      <div class="settings-card-header">
        <h3>通知</h3>
      </div>
      <div class="settings-card-body">
        <label class="toggle-row">
          <input v-model="notificationToggles.stageComplete" type="checkbox" />
          <span>阶段完成</span>
        </label>
        <label class="toggle-row">
          <input v-model="notificationToggles.stageFailed" type="checkbox" />
          <span>阶段失败</span>
        </label>
        <label class="toggle-row">
          <input v-model="notificationToggles.publishReady" type="checkbox" />
          <span>发布准备就绪</span>
        </label>
        <label class="toggle-row">
          <input v-model="notificationToggles.updateAvailable" type="checkbox" />
          <span>新版本可用</span>
        </label>
      </div>
    </section>

    <div class="settings-section-actions">
      <button type="button" class="ghost-button" @click="resetToDefaults">重置本页会话选项</button>
    </div>
  </div>
</template>

<style scoped>
.general-settings {
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

input[type="range"] {
  width: 100%;
  accent-color: var(--mx-accent);
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
