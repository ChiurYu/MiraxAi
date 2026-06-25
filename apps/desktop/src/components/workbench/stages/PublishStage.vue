<script setup lang="ts">
import { CheckCircle2, Circle, Clock, CloudUpload, FileVideo } from "lucide-vue-next";
import { computed, ref } from "vue";
import type { PublishMetadata, PublishPlatform, WorkflowStageStatus } from "@mirax/core";
import type { PublishAccount } from "@mirax/provider-publish";

interface PlatformInfo {
  id: PublishPlatform;
  label: string;
  titleMaxLength: number;
  descriptionMaxLength: number;
  supportsDraftMode: boolean;
}

const props = defineProps<{
  metadata: PublishMetadata;
  targetPlatforms: PublishPlatform[];
  accounts: PublishAccount[];
  selectedAccountId: string;
  platformProfiles: PlatformInfo[];
  canPublish: boolean;
  running: boolean;
  status: WorkflowStageStatus;
  videoPath: string;
}>();

const emit = defineEmits<{
  "update:selectedAccountId": [string];
  "update:metadata": [Partial<PublishMetadata>];
  "create-tasks": [];
  cancel: [];
}>();

const autoRetry = ref(false);
const retryCount = ref(3);

const platformLabels = computed(() =>
  Object.fromEntries(
    props.platformProfiles.map((profile) => [profile.id, profile.label]),
  ) as Record<PublishPlatform, string>,
);

const draftDisabled = computed(() =>
  props.targetPlatforms.some((id) => {
    const profile = props.platformProfiles.find((p) => p.id === id);
    return profile?.supportsDraftMode === false;
  }),
);

const draftDisabledReason = computed(() => {
  const unsupported = props.targetPlatforms.filter((id) => {
    const profile = props.platformProfiles.find((p) => p.id === id);
    return profile?.supportsDraftMode === false;
  });
  if (unsupported.length === 0) return "";
  const labels = unsupported.map((id) => platformLabels.value[id]);
  return `${labels.join("、")} 不支持草稿模式`;
});

const capabilityItems = computed(() =>
  props.targetPlatforms.map((id) => {
    const profile = props.platformProfiles.find((p) => p.id === id);
    return {
      platformId: id,
      label: profile?.label ?? id,
      supportsDraft: profile?.supportsDraftMode ?? false,
    };
  }),
);

const selectedAccount = computed(() =>
  props.accounts.find((a) => a.id === props.selectedAccountId),
);

const createDisabled = computed(() =>
  props.running || !props.canPublish || !props.videoPath,
);

function selectAccount(id: string) {
  emit("update:selectedAccountId", id);
}

function setMode(mode: "direct" | "draft") {
  if (mode === "draft" && draftDisabled.value) return;
  emit("update:metadata", { mode });
}

function incrementRetry(delta: number) {
  retryCount.value = Math.min(5, Math.max(1, retryCount.value + delta));
}

function fileName(filePath: string): string {
  const trimmed = filePath.trim();
  if (!trimmed) return "";
  const index = Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("\\"));
  return index >= 0 ? trimmed.slice(index + 1) : trimmed;
}
</script>

<template>
  <div class="publish-stage" :data-status="status">
    <div class="publish-controls">
      <div class="publish-section">
        <div class="publish-section-heading">发布账号</div>
        <div class="account-list">
          <button
            v-for="(account, index) in accounts"
            :key="account.id"
            type="button"
            class="account-card"
            data-testid="account-card"
            :data-index="index"
            :class="{ selected: selectedAccountId === account.id }"
            :disabled="running || account.status !== 'active'"
            @click="selectAccount(account.id)"
          >
            <span class="account-radio">
              <CheckCircle2 v-if="selectedAccountId === account.id" :size="18" />
              <Circle v-else :size="18" />
            </span>
            <span class="account-info">
              <span class="account-name">{{ account.displayName }}</span>
              <span class="account-platform">{{ platformLabels[account.platformId] }}</span>
            </span>
            <span
              class="account-status"
              :class="account.status"
            >
              {{ account.status === "active" ? "已登录" : "需重新授权" }}
            </span>
          </button>
          <div v-if="accounts.length === 0" class="publish-empty">暂无可用账号</div>
        </div>
      </div>

      <div class="publish-section">
        <div class="publish-section-heading">发布模式</div>
        <div class="mode-list">
          <button
            type="button"
            class="mode-card"
            data-testid="mode-direct"
            :class="{ selected: metadata.mode === 'direct' }"
            :disabled="running"
            @click="setMode('direct')"
          >
            <span class="mode-radio">
              <CheckCircle2 v-if="metadata.mode === 'direct'" :size="18" />
              <Circle v-else :size="18" />
            </span>
            <span class="mode-label">直接发布</span>
          </button>
          <button
            type="button"
            class="mode-card"
            data-testid="mode-draft"
            :class="{ selected: metadata.mode === 'draft', disabled: draftDisabled }"
            :disabled="running || draftDisabled"
            @click="setMode('draft')"
          >
            <span class="mode-radio">
              <CheckCircle2 v-if="metadata.mode === 'draft'" :size="18" />
              <Circle v-else :size="18" />
            </span>
            <span class="mode-label">存为草稿</span>
          </button>
          <div v-if="draftDisabledReason" class="mode-note">{{ draftDisabledReason }}</div>
        </div>
      </div>

      <div class="publish-section scheduling-disabled">
        <div class="publish-section-heading">定时发布</div>
        <div class="mode-card">
          <span class="mode-radio">
            <Clock :size="18" />
          </span>
          <span class="mode-label">定时发布（暂不支持）</span>
        </div>
      </div>

      <div class="publish-section">
        <div class="publish-section-heading">高级设置</div>
        <label class="mx-switch-row">
          <span>自动重试</span>
          <span class="mx-switch">
            <input
              v-model="autoRetry"
              type="checkbox"
              role="switch"
              aria-label="自动重试"
              :disabled="running"
            />
            <span class="mx-switch-track" aria-hidden="true" />
          </span>
        </label>
        <div v-if="autoRetry" class="retry-stepper">
          <span class="retry-label">重试次数</span>
          <button
            type="button"
            class="secondary"
            :disabled="running || retryCount <= 1"
            @click="incrementRetry(-1)"
          >-</button>
          <span class="retry-value">{{ retryCount }}</span>
          <button
            type="button"
            class="secondary"
            :disabled="running || retryCount >= 5"
            @click="incrementRetry(1)"
          >+</button>
        </div>
      </div>

      <div class="publish-actions">
        <button
          type="button"
          class="primary"
          data-testid="create-tasks"
          :disabled="createDisabled"
          @click="emit('create-tasks')"
        >
          <CloudUpload :size="16" />
          创建发布任务
        </button>
      </div>
    </div>

    <div class="publish-preflight">
      <div class="preflight-card">
        <div class="preflight-heading">发布预检</div>
        <div class="preflight-preview">
          <div class="preflight-thumb">
            <FileVideo :size="28" />
          </div>
          <div class="preflight-meta">
            <div class="preflight-title">{{ metadata.title || "未填写标题" }}</div>
            <div class="preflight-desc">
              {{ metadata.description.slice(0, 80) || "未填写描述" }}{{ metadata.description.length > 80 ? "…" : "" }}
            </div>
            <div class="preflight-file">{{ videoPath ? fileName(videoPath) : "视频尚未生成" }}</div>
          </div>
        </div>

        <div class="preflight-section-heading">平台能力</div>
        <ul class="capability-list">
          <li
            v-for="item in capabilityItems"
            :key="item.platformId"
            class="capability-item"
          >
            <span class="capability-label">{{ item.label }}</span>
            <span class="capability-value">{{ item.supportsDraft ? "支持草稿模式" : "仅直接发布" }}</span>
          </li>
        </ul>

        <div class="preflight-summary">
          将为
          <strong>{{ targetPlatforms.length }}</strong>
          个平台创建
          <strong>{{ metadata.mode === "direct" ? "直接发布" : "草稿" }}</strong>
          任务
          <span v-if="selectedAccount">，账号：{{ selectedAccount.displayName }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
