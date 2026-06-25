<script setup lang="ts">
import { CheckCircle2, ExternalLink, MessageSquare, RefreshCw } from "lucide-vue-next";
import { ref } from "vue";
import AppDialog from "../../components/ui/AppDialog.vue";

const updateChannel = ref<"stable" | "beta" | "dev">("stable");
const autoCheck = ref(true);
const autoDownload = ref(false);
const updateMessage = ref("");

const feedbackDialogOpen = ref(false);
const feedback = ref({
  type: "bug",
  title: "",
  description: "",
  reproduce: "",
  expected: "",
  actual: "",
  contact: "",
  attachLogs: false,
});

const helpLinks = [
  { label: "快速开始", href: "#" },
  { label: "工作台流程", href: "#" },
  { label: "本地服务配置", href: "#" },
  { label: "常见问题", href: "#" },
  { label: "快捷键", href: "#" },
];

function checkUpdate() {
  updateMessage.value = "当前版本已是最新（v0.1.0）。自动更新模块接入后会联网检查。";
}

function openFeedback() {
  feedbackDialogOpen.value = true;
}

function closeFeedback() {
  feedbackDialogOpen.value = false;
}

function submitFeedback() {
  if (!feedback.value.title.trim() || !feedback.value.description.trim()) {
    window.alert("请填写标题和描述。");
    return;
  }
  updateMessage.value = "反馈已记录（未实际提交）。诊断日志导出模块接入后可附加日志。";
  closeFeedback();
}

function exportDiagnostics() {
  updateMessage.value = "诊断摘要已生成（未实际导出文件）：Mirax AI v0.1.0 / macOS / schema v1 / 5 providers / 5 dependencies。";
}
</script>

<template>
  <div class="settings-section updates-support-settings">
    <div class="section-hero">
      <h2>更新与支持</h2>
      <p>版本更新、诊断反馈与帮助入口。检查更新、导出诊断和提交反馈目前仅记录交互状态，不会访问网络或生成文件。</p>
    </div>

    <section class="settings-card">
      <div class="settings-card-header">
        <h3>软件更新</h3>
      </div>
      <div class="settings-card-body">
        <div class="update-row">
          <div class="update-info">
            <strong>Mirax AI 桌面端</strong>
            <span>当前版本：v0.1.0（build 20260625）</span>
            <span class="update-status">
              <CheckCircle2 :size="12" />
              已是最新
            </span>
          </div>
          <button type="button" class="secondary" @click="checkUpdate">
            <RefreshCw :size="14" />
            检查更新
          </button>
        </div>
      </div>
    </section>

    <section class="settings-card">
      <div class="settings-card-header">
        <h3>更新偏好</h3>
      </div>
      <div class="settings-card-body">
        <label class="field">
          <span class="field-label">更新通道</span>
          <select v-model="updateChannel">
            <option value="stable">稳定版</option>
            <option value="beta">Beta</option>
            <option value="dev">开发版</option>
          </select>
        </label>
        <label class="toggle-row">
          <input v-model="autoCheck" type="checkbox" />
          <span>启动时自动检查更新</span>
        </label>
        <label class="toggle-row">
          <input v-model="autoDownload" type="checkbox" />
          <span>自动下载更新包（接入后生效）</span>
        </label>
      </div>
    </section>

    <section class="settings-card">
      <div class="settings-card-header">
        <h3>诊断与反馈</h3>
      </div>
      <div class="settings-card-body">
        <div class="diagnostic-summary">
          <span>OS：macOS</span>
          <span>架构：arm64 / x86_64</span>
          <span>Schema：v1</span>
          <span>Provider：5 类</span>
          <span>Dependency：5 项</span>
        </div>
        <div class="diagnostic-actions">
          <button type="button" class="secondary" @click="exportDiagnostics">导出诊断摘要</button>
          <button type="button" class="secondary" @click="openFeedback">
            <MessageSquare :size="14" />
            提交反馈
          </button>
        </div>
      </div>
    </section>

    <section class="settings-card">
      <div class="settings-card-header">
        <h3>使用帮助</h3>
      </div>
      <div class="settings-card-body">
        <ul class="help-links">
          <li v-for="link in helpLinks" :key="link.label">
            <a :href="link.href" class="help-link" @click.prevent="updateMessage = `「${link.label}」页面尚未上线。`">
              {{ link.label }}
              <ExternalLink :size="12" />
            </a>
          </li>
        </ul>
      </div>
    </section>

    <section class="settings-card">
      <div class="settings-card-header">
        <h3>关于 Mirax AI</h3>
      </div>
      <div class="settings-card-body">
        <p class="about-text">
          Mirax AI 桌面端 v0.1.0 · 2026-06-25<br />
          技术栈：Tauri 2 + Vue 3 + TypeScript<br />
          本地优先：草稿、设置与任务数据默认只保存在本机。
        </p>
      </div>
    </section>

    <p v-if="updateMessage" class="action-message">{{ updateMessage }}</p>

    <AppDialog
      :open="feedbackDialogOpen"
      title="提交反馈"
      @close="closeFeedback"
    >
      <form class="feedback-form" @submit.prevent="submitFeedback">
        <label class="field">
          <span class="field-label">问题类型</span>
          <select v-model="feedback.type">
            <option value="bug">Bug 报告</option>
            <option value="feature">功能建议</option>
            <option value="performance">性能问题</option>
            <option value="other">其他</option>
          </select>
        </label>
        <label class="field">
          <span class="field-label">标题</span>
          <input v-model="feedback.title" required />
        </label>
        <label class="field">
          <span class="field-label">描述</span>
          <textarea v-model="feedback.description" rows="3" required />
        </label>
        <label class="field">
          <span class="field-label">重现步骤</span>
          <textarea v-model="feedback.reproduce" rows="2" />
        </label>
        <label class="field">
          <span class="field-label">预期结果</span>
          <input v-model="feedback.expected" />
        </label>
        <label class="field">
          <span class="field-label">实际结果</span>
          <input v-model="feedback.actual" />
        </label>
        <label class="field">
          <span class="field-label">联系方式（可选）</span>
          <input v-model="feedback.contact" />
        </label>
        <label class="toggle-row">
          <input v-model="feedback.attachLogs" type="checkbox" />
          <span>允许附加诊断日志（模块接入后生效）</span>
        </label>
      </form>
      <template #actions>
        <button type="button" class="primary" @click="submitFeedback">提交</button>
        <button type="button" class="ghost-button" @click="closeFeedback">取消</button>
      </template>
    </AppDialog>
  </div>
</template>

<style scoped>
.updates-support-settings {
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

.update-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.update-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.update-info strong {
  font-size: 14px;
  color: var(--mx-text-primary);
}

.update-info span {
  font-size: 12px;
  color: var(--mx-text-secondary);
}

.update-status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  width: fit-content;
  padding: 3px 8px;
  border-radius: var(--mx-radius-pill);
  font-size: 11px;
  font-weight: 600;
  color: var(--mx-success);
  background: var(--mx-success-bg);
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

.toggle-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--mx-text-primary);
  cursor: pointer;
}

.diagnostic-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 12px;
  color: var(--mx-text-secondary);
}

.diagnostic-summary span {
  padding: 4px 8px;
  border-radius: var(--mx-radius-md);
  background: var(--mx-bg-input);
}

.diagnostic-actions {
  display: flex;
  gap: 10px;
}

.help-links {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.help-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-radius: var(--mx-radius-md);
  font-size: 13px;
  color: var(--mx-text-secondary);
  text-decoration: none;
  background: var(--mx-bg-input);
}

.help-link:hover {
  background: var(--mx-bg-hover);
  color: var(--mx-text-primary);
}

.about-text {
  margin: 0;
  font-size: 12px;
  line-height: 1.8;
  color: var(--mx-text-secondary);
}

.action-message {
  margin: 0;
  padding: 12px 14px;
  border-radius: var(--mx-radius-md);
  font-size: 12px;
  line-height: 1.5;
  color: var(--mx-text-secondary);
  background: var(--mx-bg-elevated);
}

.feedback-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 4px;
}
</style>
