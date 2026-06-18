<script setup lang="ts">
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
</script>

<template>
  <div class="settings-view">
    <header class="settings-header">
      <h1>设置</h1>
      <span class="save-status">{{ saveStatus }}</span>
    </header>

    <section class="settings-group">
      <h2>通用</h2>
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
      <h2>Provider 配置</h2>
      <div v-if="providerConfigs.length === 0" class="empty-state">暂无 Provider 配置</div>
      <ul class="provider-list">
        <li v-for="config in providerConfigs" :key="config.id" class="provider-item">
          <div class="provider-summary">
            <strong>{{ config.label || "未命名" }}</strong>
            <span>{{ config.provider }} · {{ config.enabled ? "启用" : "禁用" }}</span>
          </div>
          <div class="provider-actions">
            <button @click="toggleProviderEnabled(config)">{{ config.enabled ? "禁用" : "启用" }}</button>
            <button @click="startEditProvider(config)">编辑</button>
            <button @click="testProvider(config)">测试连接</button>
            <button @click="removeProviderConfig(config.id)">删除</button>
          </div>
          <div v-if="testMessages[config.id]" class="test-message">{{ testMessages[config.id] }}</div>
        </li>
      </ul>

      <button v-if="!editingConfig" class="primary" @click="startAddProvider">+ 添加 Provider 配置</button>

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
          <input v-model="editingConfig.apiKey" type="password" autocomplete="off" placeholder="用户本地填写" />
        </label>
        <div class="form-actions">
          <button type="submit" class="primary">保存</button>
          <button type="button" @click="cancelEditProvider">取消</button>
        </div>
      </form>
    </section>

    <section class="settings-group">
      <h2>本地依赖 / Sidecar</h2>
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
  </div>
</template>

<style scoped>
.settings-view {
  padding: 24px;
  max-width: 800px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.settings-header h1 {
  margin: 0;
  font-size: 22px;
}

.save-status {
  font-size: 12px;
  color: var(--mx-text-tertiary);
}

.settings-group {
  border: 1px solid var(--mx-border-subtle);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.settings-group h2 {
  margin: 0 0 4px;
  font-size: 16px;
}

label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
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
  background: var(--mx-surface-secondary);
  color: var(--mx-text-primary);
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
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.provider-summary {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
}

.provider-actions {
  display: flex;
  gap: 8px;
}

.test-message {
  font-size: 12px;
  color: var(--mx-text-tertiary);
}

.provider-form {
  border: 1px solid var(--mx-border-subtle);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-actions {
  display: flex;
  gap: 10px;
}

.empty-state {
  font-size: 13px;
  color: var(--mx-text-tertiary);
}
</style>
