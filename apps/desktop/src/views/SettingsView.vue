<script setup lang="ts">
import { AlertCircle, CheckCircle2, Plus, Trash2 } from "lucide-vue-next";
import { ref } from "vue";
import {
  createApiKeyProviderConfig,
  validateProviderConfig,
  type ApiKeyProviderConfig,
  type ApiKeyProvider,
} from "@mirax/core";
import { testAiProviderConnection } from "@mirax/provider-ai";
import DependencyChecklist from "../components/DependencyChecklist.vue";
import { useAppSettings } from "../composables/useAppSettings.js";

const PROVIDER_OPTIONS: { value: ApiKeyProvider; label: string }[] = [
  { value: "openai", label: "OpenAI" },
  { value: "whisper", label: "Whisper" },
  { value: "cosyvoice", label: "CosyVoice" },
  { value: "heygem", label: "HeyGem" },
  { value: "custom", label: "自定义" },
];

const { appSettings, sidecarConfig, providerConfigs, saveStatus, addProviderConfig, updateProviderConfig, removeProviderConfig } =
  useAppSettings();

const editingConfig = ref<ApiKeyProviderConfig | null>(null);
const testMessages = ref<Record<string, string>>({});
const diagnosticMessage = ref("");

function startAddProvider() {
  editingConfig.value = createApiKeyProviderConfig({
    id: crypto.randomUUID(),
    label: "",
    provider: "openai",
    apiKey: "",
  });
}

function startEditProvider(config: ApiKeyProviderConfig) {
  editingConfig.value = { ...config };
}

function cancelEditProvider() {
  editingConfig.value = null;
}

function saveProvider() {
  if (!editingConfig.value) return;

  const errors = validateProviderConfig(editingConfig.value);
  if (errors.length > 0) {
    window.alert(errors.join("\n"));
    return;
  }

  const existing = providerConfigs.value.find((config) => config.id === editingConfig.value!.id);
  if (existing) {
    updateProviderConfig(editingConfig.value);
  } else {
    addProviderConfig(editingConfig.value);
  }

  editingConfig.value = null;
}

async function testProvider(config: ApiKeyProviderConfig) {
  testMessages.value[config.id] = "检测中…";

  try {
    const input =
      config.provider === "openai"
        ? ({
            mode: "openai-compatible",
            baseUrl: config.baseUrl ?? "",
            apiKey: config.apiKey,
            model: config.model ?? "",
          } as const)
        : ({ mode: "mock" } as const);

    const result = await testAiProviderConnection(input);
    testMessages.value[config.id] = result.message;
  } catch (error) {
    testMessages.value[config.id] = error instanceof Error ? error.message : "连接测试失败";
  }
}

function toggleProviderEnabled(config: ApiKeyProviderConfig) {
  updateProviderConfig({ ...config, enabled: !config.enabled });
}

function exportLogs() {
  diagnosticMessage.value = "运行日志导出功能将在 sidecar 诊断模块接入后启用。";
}

function clearCache() {
  diagnosticMessage.value = "本地缓存清理功能将在本地存储模块接入后启用。";
}

function showVersion() {
  diagnosticMessage.value = "Mirax AI 桌面端 v0.1.0（P0.5 UI/UX polish）";
}
</script>

<template>
  <div class="settings-view">
    <header class="settings-header">
      <div class="settings-title">
        <h1>设置</h1>
        <span class="save-status" :class="{ error: saveStatus.includes('失败') }">{{ saveStatus }}</span>
      </div>
    </header>

    <section class="settings-group">
      <div class="section-header">
        <h2>通用设置</h2>
        <p class="section-desc">主题、输出目录等全局偏好设置。修改后会自动保存到本地。云端同步不在 P0 范围内。数据不会离开本机。</p>
      </div>
      <label>
        <span>主题</span>
        <select v-model="appSettings.theme">
          <option value="light">浅色</option>
          <option value="dark">深色</option>
          <option value="system">跟随系统</option>
        </select>
      </label>
      <label>
        <span>基础输出目录</span>
        <input v-model="appSettings.outputPaths.baseOutput" placeholder="/Users/Shared/MiraxAI" />
      </label>
    </section>

    <section class="settings-group">
      <div class="section-header">
        <h2>AI Provider 配置</h2>
        <p class="section-desc">管理大模型、语音识别、声音克隆和数字人服务的连接信息。API Key 仅保存在本地，不会被提交到源码或日志。</p>
      </div>

      <div v-if="providerConfigs.length === 0" class="empty-state">
        <AlertCircle :size="20" />
        <span>暂无 Provider 配置，点击右侧按钮添加第一个配置。当前使用 mock provider 运行。</span>
      </div>

      <ul v-else class="provider-list">
        <li v-for="config in providerConfigs" :key="config.id" class="provider-item">
          <div class="provider-summary">
            <div class="provider-name">
              <strong>{{ config.label || "未命名" }}</strong>
              <span class="provider-type">{{ config.provider }}</span>
            </div>
            <span class="provider-badge" :class="{ enabled: config.enabled }">
              <CheckCircle2 v-if="config.enabled" :size="12" />
              <span v-else />
              {{ config.enabled ? "启用" : "禁用" }}
            </span>
          </div>
          <div class="provider-actions">
            <button class="ghost-button" @click="toggleProviderEnabled(config)">{{ config.enabled ? "禁用" : "启用" }}</button>
            <button class="secondary" @click="startEditProvider(config)">编辑</button>
            <button class="secondary" @click="testProvider(config)">测试连接</button>
            <button class="ghost-button danger" @click="removeProviderConfig(config.id)">
              <Trash2 :size="14" /> 删除
            </button>
          </div>
          <div v-if="testMessages[config.id]" class="test-message">{{ testMessages[config.id] }}</div>
        </li>
      </ul>

      <button v-if="!editingConfig" class="primary add-provider" @click="startAddProvider">
        <Plus :size="16" />
        添加 Provider 配置
      </button>

      <form v-if="editingConfig" class="provider-form" @submit.prevent="saveProvider">
        <h3>{{ providerConfigs.find((c) => c.id === editingConfig?.id) ? "编辑" : "新增" }} Provider 配置</h3>
        <label>
          <span>名称</span>
          <input v-model="editingConfig.label" required />
        </label>
        <label>
          <span>类型</span>
          <select v-model="editingConfig.provider">
            <option v-for="option in PROVIDER_OPTIONS" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </label>
        <label>
          <span>Base URL</span>
          <input v-model="editingConfig.baseUrl" placeholder="https://api.openai.com/v1" />
        </label>
        <label>
          <span>模型</span>
          <input v-model="editingConfig.model" placeholder="gpt-4.1" />
        </label>
        <label>
          <span>API Key</span>
          <input
            v-model="editingConfig.apiKey"
            type="password"
            autocomplete="off"
            placeholder="用户本地填写，不会被提交到源码或日志"
          />
        </label>
        <div class="form-actions">
          <button type="submit" class="primary">保存</button>
          <button type="button" class="ghost-button" @click="cancelEditProvider">取消</button>
        </div>
      </form>
    </section>

    <section class="settings-group">
      <div class="section-header">
        <h2>本地依赖 / Sidecar</h2>
        <p class="section-desc">配置 FFmpeg、Python 本地服务、HeyGem、CosyVoice 和 Playwright 浏览器路径。检测状态会随输入实时更新。</p>
      </div>
      <label>
        <span>FFmpeg 路径</span>
        <input v-model="sidecarConfig.ffmpegPath" placeholder="/usr/local/bin/ffmpeg" />
      </label>
      <label>
        <span>Python 服务地址</span>
        <input v-model="sidecarConfig.pythonServiceUrl" placeholder="http://localhost:8000" />
      </label>
      <label>
        <span>CosyVoice 服务地址</span>
        <input v-model="sidecarConfig.cosyVoiceServiceUrl" placeholder="http://localhost:8001" />
      </label>
      <label>
        <span>HeyGem 服务地址</span>
        <input v-model="sidecarConfig.heygemServiceUrl" placeholder="http://localhost:8002" />
      </label>
      <label class="checkbox-label">
        <input v-model="sidecarConfig.hasPlaywrightBrowser" type="checkbox" />
        <span>已安装 Playwright 浏览器</span>
      </label>

      <DependencyChecklist :config="sidecarConfig" />
    </section>

    <section class="settings-group">
      <div class="section-header">
        <h2>数据与诊断</h2>
        <p class="section-desc">导出日志、清理缓存和查看版本信息。这些功能在 P0 阶段仅保留入口，真实实现将在后续接入本地存储和诊断服务。</p>
      </div>
      <div class="diagnostic-actions">
        <button class="secondary" @click="exportLogs">导出运行日志</button>
        <button class="secondary" @click="clearCache">清理本地缓存</button>
        <button class="ghost-button" @click="showVersion">版本信息</button>
      </div>
      <p v-if="diagnosticMessage" class="diagnostic-message">{{ diagnosticMessage }}</p>
    </section>
  </div>
</template>

<style scoped>
.settings-view {
  padding: 24px;
  max-width: 960px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.settings-title {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.settings-title h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
}

.save-status {
  font-size: 11px;
  font-weight: 500;
  color: var(--mx-text-tertiary);
}

.save-status.error {
  color: var(--mx-error);
}

.settings-group {
  border: 1px solid var(--mx-border-subtle);
  border-radius: 12px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--mx-bg-panel);
}

.section-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 4px;
}

.section-header h2 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--mx-text-primary);
}

.section-desc {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--mx-text-tertiary);
}

label {
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 12px;
  font-weight: 500;
  color: var(--mx-text-secondary);
}

label.checkbox-label {
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

input,
select {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--mx-border-subtle);
  background: var(--mx-bg-input);
  color: var(--mx-text-primary);
  font-size: 13px;
}

input:focus,
select:focus {
  outline: none;
  border-color: var(--mx-accent);
  box-shadow: 0 0 0 3px var(--mx-accent-soft-bg);
}

input[type="password"]::placeholder {
  color: var(--mx-text-muted);
}

.empty-state {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px;
  border: 1px dashed var(--mx-border-active);
  border-radius: 8px;
  color: var(--mx-text-tertiary);
  font-size: 13px;
  background: var(--mx-bg-input);
}

.provider-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.provider-item {
  border: 1px solid var(--mx-border-subtle);
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: var(--mx-bg-input);
}

.provider-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.provider-name {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.provider-name strong {
  font-size: 14px;
  font-weight: 600;
  color: var(--mx-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.provider-type {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--mx-text-secondary);
  background: var(--mx-bg-elevated);
}

.provider-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  color: var(--mx-text-tertiary);
  background: var(--mx-bg-elevated);
}

.provider-badge.enabled {
  color: var(--mx-success);
  background: var(--mx-success-bg);
}

.provider-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.provider-actions button {
  min-height: 28px;
  padding: 0 10px;
  font-size: 12px;
}

.test-message {
  font-size: 12px;
  color: var(--mx-text-tertiary);
  word-break: break-all;
}

.add-provider {
  align-self: flex-start;
  min-height: 34px;
}

.provider-form {
  border: 1px solid var(--mx-border-subtle);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--mx-bg-input);
}

.provider-form h3 {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 600;
}

.form-actions {
  display: flex;
  gap: 10px;
}

.diagnostic-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.diagnostic-actions button {
  min-height: 34px;
}

.diagnostic-message {
  margin: 0;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 12px;
  color: var(--mx-text-secondary);
  background: var(--mx-bg-elevated);
}

.danger {
  color: var(--mx-error);
}

.danger:hover:not(:disabled) {
  background: var(--mx-error-bg);
}
</style>
