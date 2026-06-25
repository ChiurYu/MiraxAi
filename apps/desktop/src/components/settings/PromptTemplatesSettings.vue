<script setup lang="ts">
import { Plus, Search, Trash2 } from "lucide-vue-next";
import { computed, ref } from "vue";
import {
  DEFAULT_PROMPT_TEMPLATES,
  listTemplatesByCategory,
  type PromptTemplate,
  type PromptTemplateCategory,
  PROMPT_TEMPLATE_CATEGORIES,
  createCustomPromptTemplate,
} from "../../features/settings/promptTemplates.js";

const templates = ref<PromptTemplate[]>([...DEFAULT_PROMPT_TEMPLATES]);
const selectedId = ref<string | null>(DEFAULT_PROMPT_TEMPLATES[0]?.id ?? null);
const search = ref("");
const categoryFilter = ref<PromptTemplateCategory | "all">("all");
const sourceFilter = ref<"all" | "system" | "custom">("all");

const selectedTemplate = computed(() => templates.value.find((t) => t.id === selectedId.value) ?? null);

const filteredTemplates = computed(() => {
  let list = listTemplatesByCategory(templates.value, categoryFilter.value === "all" ? undefined : categoryFilter.value);
  if (sourceFilter.value !== "all") {
    list = list.filter((t) => t.source === sourceFilter.value);
  }
  if (search.value.trim()) {
    const q = search.value.toLowerCase();
    list = list.filter((t) => t.name.toLowerCase().includes(q) || t.content.toLowerCase().includes(q));
  }
  return list;
});

function selectTemplate(id: string) {
  selectedId.value = id;
}

function duplicateTemplate(template: PromptTemplate) {
  const copy: PromptTemplate = {
    ...template,
    id: `custom-${crypto.randomUUID()}`,
    name: `${template.name} 副本`,
    source: "custom",
  };
  templates.value.push(copy);
  selectedId.value = copy.id;
}

function deleteTemplate(template: PromptTemplate) {
  if (template.source === "system") {
    window.alert("系统模板不能删除。");
    return;
  }
  if (window.confirm(`确定删除自定义模板「${template.name}」？本次删除仅在当前会话生效。`)) {
    templates.value = templates.value.filter((t) => t.id !== template.id);
    if (selectedId.value === template.id) {
      selectedId.value = templates.value[0]?.id ?? null;
    }
  }
}

function createBlankTemplate() {
  const t = createCustomPromptTemplate({ name: "未命名模板", category: "general", content: "" });
  templates.value.push(t);
  selectedId.value = t.id;
}
</script>

<template>
  <div class="settings-section prompt-templates-settings">
    <div class="section-hero">
      <h2>提示词</h2>
      <p>查看和编辑默认提示词模板。当前模板仅保存在当前会话中，尚未进入全局持久化；刷新页面后会恢复默认集合。</p>
    </div>

    <div class="templates-layout">
      <aside class="templates-sidebar">
        <div class="templates-search">
          <Search :size="14" />
          <input v-model="search" type="text" placeholder="搜索模板" />
        </div>

        <div class="templates-filters">
          <select v-model="categoryFilter">
            <option value="all">全部类别</option>
            <option v-for="cat in PROMPT_TEMPLATE_CATEGORIES" :key="cat.value" :value="cat.value">{{ cat.label }}</option>
          </select>
          <select v-model="sourceFilter">
            <option value="all">全部来源</option>
            <option value="system">系统</option>
            <option value="custom">自定义</option>
          </select>
        </div>

        <button type="button" class="primary create-template" @click="createBlankTemplate">
          <Plus :size="14" />
          新建模板
        </button>

        <ul class="templates-list">
          <li
            v-for="template in filteredTemplates"
            :key="template.id"
            class="template-item"
            :class="{ active: selectedId === template.id, system: template.source === 'system' }"
            @click="selectTemplate(template.id)"
          >
            <div class="template-item-name">{{ template.name }}</div>
            <div class="template-item-meta">
              <span class="template-source" :class="template.source">{{ template.source === "system" ? "系统" : "自定义" }}</span>
              <span>{{ PROMPT_TEMPLATE_CATEGORIES.find((c) => c.value === template.category)?.label ?? template.category }}</span>
            </div>
          </li>
        </ul>
      </aside>

      <div v-if="selectedTemplate" class="templates-editor">
        <div class="editor-header">
          <input v-model="selectedTemplate.name" class="editor-title" :disabled="selectedTemplate.source === 'system'" />
          <div class="editor-actions">
            <button type="button" class="secondary" @click="duplicateTemplate(selectedTemplate)">复制</button>
            <button
              v-if="selectedTemplate.source === 'custom'"
              type="button"
              class="ghost-button danger"
              @click="deleteTemplate(selectedTemplate)"
            >
              <Trash2 :size="14" />
            </button>
          </div>
        </div>

        <label class="field"
        >
          <span class="field-label">类别</span>
          <select v-model="selectedTemplate.category" :disabled="selectedTemplate.source === 'system'">
            <option v-for="cat in PROMPT_TEMPLATE_CATEGORIES" :key="cat.value" :value="cat.value">{{ cat.label }}</option>
          </select>
        </label>

        <label class="field"
        >
          <span class="field-label">模板内容</span>
          <textarea
            v-model="selectedTemplate.content"
            :disabled="selectedTemplate.source === 'system'"
            rows="14"
          />
        </label>

        <div v-if="selectedTemplate.variables.length > 0" class="editor-section"
        >
          <div class="editor-section-title">变量</div>
          <ul class="variable-list">
            <li v-for="v in selectedTemplate.variables" :key="v.name">
              <code>{{ v.name }}</code>
              <span>{{ v.label }}</span>
              <span v-if="v.required" class="required">必填</span>
              <span v-if="v.example" class="example">例如：{{ v.example }}</span>
            </li>
          </ul>
        </div>

        <div v-if="selectedTemplate.rules.length > 0" class="editor-section">
          <div class="editor-section-title">默认规则</div>
          <ul class="rule-list">
            <li v-for="(rule, idx) in selectedTemplate.rules" :key="idx">{{ rule }}</li>
          </ul>
        </div>

        <p class="persistence-note">系统模板不可编辑；自定义模板的修改仅在当前会话生效。</p>
      </div>

      <div v-else class="templates-empty">
        <span>选择一个模板以查看和编辑</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.prompt-templates-settings {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 960px;
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

.templates-layout {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.templates-sidebar {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--mx-border-subtle);
  border-radius: var(--mx-radius-lg);
  background: var(--mx-bg-panel);
}

.templates-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid var(--mx-border-subtle);
  border-radius: var(--mx-radius-md);
  background: var(--mx-bg-input);
}

.templates-search input {
  flex: 1 1 auto;
  border: none;
  background: transparent;
  color: var(--mx-text-primary);
  font-size: 13px;
  outline: none;
}

.templates-filters {
  display: flex;
  gap: 8px;
}

.templates-filters select {
  flex: 1 1 auto;
  min-width: 0;
}

.create-template {
  min-height: 32px;
}

.templates-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 420px;
  overflow-y: auto;
}

.template-item {
  padding: 10px 12px;
  border-radius: var(--mx-radius-md);
  cursor: pointer;
  border: 1px solid transparent;
}

.template-item:hover {
  background: var(--mx-bg-hover);
}

.template-item.active {
  background: var(--mx-accent-soft-bg);
  border-color: var(--mx-accent);
}

.template-item-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--mx-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.template-item-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  font-size: 11px;
  color: var(--mx-text-tertiary);
}

.template-source {
  padding: 1px 5px;
  border-radius: var(--mx-radius-sm);
  font-size: 10px;
  font-weight: 600;
  background: var(--mx-bg-elevated);
}

.template-source.system {
  color: var(--mx-info);
  background: var(--mx-info-bg);
}

.template-source.custom {
  color: var(--mx-success);
  background: var(--mx-success-bg);
}

.templates-editor {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  border: 1px solid var(--mx-border-subtle);
  border-radius: var(--mx-radius-lg);
  background: var(--mx-bg-panel);
  min-width: 0;
}

.editor-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.editor-title {
  flex: 1 1 auto;
  min-width: 0;
  padding: 8px 10px;
  border-radius: var(--mx-radius-md);
  border: 1px solid var(--mx-border-subtle);
  background: var(--mx-bg-input);
  color: var(--mx-text-primary);
  font-size: 14px;
  font-weight: 600;
}

.editor-actions {
  display: flex;
  gap: 8px;
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

textarea {
  resize: vertical;
  min-height: 180px;
  padding: 10px;
  border-radius: var(--mx-radius-md);
  border: 1px solid var(--mx-border-subtle);
  background: var(--mx-bg-input);
  color: var(--mx-text-primary);
  font-size: 13px;
  line-height: 1.6;
  font-family: inherit;
}

.editor-section-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--mx-text-secondary);
  margin-bottom: 6px;
}

.variable-list,
.rule-list {
  margin: 0;
  padding: 0 0 0 16px;
  font-size: 12px;
  line-height: 1.8;
  color: var(--mx-text-secondary);
}

.variable-list li {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.variable-list code {
  padding: 1px 5px;
  border-radius: var(--mx-radius-sm);
  background: var(--mx-bg-elevated);
  color: var(--mx-accent);
}

.required {
  color: var(--mx-error);
  font-weight: 600;
}

.example {
  color: var(--mx-text-tertiary);
}

.persistence-note {
  margin: 0;
  padding: 10px 12px;
  border-radius: var(--mx-radius-md);
  font-size: 11px;
  line-height: 1.5;
  color: var(--mx-text-tertiary);
  background: var(--mx-bg-elevated);
}

.templates-empty {
  display: grid;
  place-items: center;
  min-height: 240px;
  border: 1px dashed var(--mx-border-active);
  border-radius: var(--mx-radius-lg);
  color: var(--mx-text-tertiary);
  font-size: 13px;
}
</style>
