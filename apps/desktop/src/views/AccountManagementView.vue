<script setup lang="ts">
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  KeyRound,
  Link2,
  Loader2,
  Plus,
  Unlink,
  X,
  XCircle,
} from "lucide-vue-next";
import { computed, ref } from "vue";
import type { PlatformProfile, PublishPlatform } from "@mirax/provider-publish";
import AppDialog from "../components/ui/AppDialog.vue";
import EmptyState from "../components/ui/EmptyState.vue";
import type { AccountUiStatus, AccountViewItem } from "../features/accounts/mockAccounts.js";
import { createAccountViewItem } from "../features/accounts/mockAccounts.js";

const props = defineProps<{
  accounts: AccountViewItem[];
  platformProfiles: PlatformProfile[];
}>();

const platformLabels = computed<Record<PublishPlatform, string>>(() =>
  Object.fromEntries(props.platformProfiles.map((p) => [p.id, p.label])) as Record<PublishPlatform, string>,
);

const accountStatuses = ref<Record<string, AccountUiStatus>>({});
const localAccounts = ref<AccountViewItem[]>([]);

const allAccounts = computed<AccountViewItem[]>(() => {
  const base = props.accounts.length > 0 ? props.accounts : localAccounts.value;
  return base.map((account) => ({
    ...account,
    uiStatus: accountStatuses.value[account.id] ?? account.uiStatus,
  }));
});

const statusMeta: Record<
  AccountUiStatus,
  { label: string; icon: typeof CheckCircle2; className: string; description: string }
> = {
  connected: {
    label: "已连接",
    icon: CheckCircle2,
    className: "is-connected",
    description: "账号授权有效，可正常发布。",
  },
  reauthorize: {
    label: "需重新授权",
    icon: AlertCircle,
    className: "is-reauthorize",
    description: "授权已过期，请重新完成官方授权。",
  },
  checking: {
    label: "检查中",
    icon: Loader2,
    className: "is-checking",
    description: "正在与平台确认授权状态...",
  },
  unavailable: {
    label: "不可用",
    icon: XCircle,
    className: "is-unavailable",
    description: "当前无法连接，请检查网络或账号状态。",
  },
  disconnected: {
    label: "未连接",
    icon: Unlink,
    className: "is-disconnected",
    description: "账号尚未授权，点击连接开始官方授权流程。",
  },
};

const showAddDialog = ref(false);
const selectedPlatform = ref<PublishPlatform | "">("");
const addStep = ref<"select" | "handoff" | "checking" | "result">("select");

function openAddDialog(platform?: PublishPlatform) {
  selectedPlatform.value = platform ?? "";
  addStep.value = platform ? "handoff" : "select";
  showAddDialog.value = true;
}

function closeAddDialog() {
  showAddDialog.value = false;
  selectedPlatform.value = "";
  addStep.value = "select";
}

function choosePlatform(platformId: PublishPlatform) {
  selectedPlatform.value = platformId;
  addStep.value = "handoff";
}

function startHandoff() {
  if (!selectedPlatform.value) return;
  addStep.value = "checking";
  setTimeout(() => {
    addStep.value = "result";
    const id = `account-${selectedPlatform.value}-${Date.now()}`;
    const newAccount = createAccountViewItem({
      id,
      platformId: selectedPlatform.value as PublishPlatform,
      displayName: `待授权 ${platformLabels.value[selectedPlatform.value as PublishPlatform]} 账号`,
      uiStatus: "unavailable",
    });
    localAccounts.value = [newAccount, ...localAccounts.value];
    accountStatuses.value[id] = "unavailable";
  }, 1200);
}

function setAccountStatus(id: string, status: AccountUiStatus) {
  accountStatuses.value[id] = status;
}

function handleAction(account: AccountViewItem) {
  const status = account.uiStatus;
  if (status === "connected") {
    setAccountStatus(account.id, "disconnected");
  } else if (status === "reauthorize") {
    openAddDialog(account.platformId);
  } else if (status === "checking") {
    // no-op: checking is transient
  } else if (status === "unavailable" || status === "disconnected") {
    openAddDialog(account.platformId);
  }
}

function actionLabel(status: AccountUiStatus): string {
  switch (status) {
    case "connected":
      return "断开";
    case "reauthorize":
      return "重新授权";
    case "checking":
      return "检查中";
    case "unavailable":
      return "连接";
    case "disconnected":
      return "连接";
  }
}

function actionIcon(status: AccountUiStatus) {
  switch (status) {
    case "connected":
      return Unlink;
    case "reauthorize":
      return Link2;
    case "checking":
      return Loader2;
    case "unavailable":
    case "disconnected":
      return Link2;
  }
}
</script>

<template>
  <div class="account-management">
    <div class="account-management-header">
      <div class="account-management-header-main">
        <h1>账号管理</h1>
        <p>
          管理各平台发布账号的授权状态。授权凭证通过 <code>credentialRef</code> 引用到系统安全存储，
          本应用不保存密码、Cookie 或 Token 明文。真实 OAuth / 二维码 / Cookie 导入流程暂未接入。
        </p>
      </div>
      <button type="button" class="primary" @click="openAddDialog()">
        <Plus :size="16" /> 添加账号
      </button>
    </div>

    <main class="account-management-main">
      <div v-if="allAccounts.length === 0" class="account-management-empty">
        <EmptyState
          title="暂无账号"
          description="点击右上角添加账号，开始官方授权流程。"
        />
      </div>

      <ul v-else class="account-grid" role="list">
        <li
          v-for="account in allAccounts"
          :key="account.id"
          class="account-card"
          :class="statusMeta[account.uiStatus].className"
          role="listitem"
        >
          <div class="account-card-header">
            <div class="account-platform">
              <KeyRound :size="16" />
              <span>{{ platformLabels[account.platformId] ?? account.platformId }}</span>
            </div>
            <div class="account-status" :class="statusMeta[account.uiStatus].className">
              <component
                :is="statusMeta[account.uiStatus].icon"
                :size="12"
                :class="{ spin: account.uiStatus === 'checking' }"
              />
              <span>{{ statusMeta[account.uiStatus].label }}</span>
            </div>
          </div>

          <div class="account-card-body">
            <strong class="account-name">{{ account.displayName }}</strong>
            <p class="account-description">{{ statusMeta[account.uiStatus].description }}</p>
          </div>

          <div class="account-card-actions">
            <button
              type="button"
              class="ghost-button"
              :disabled="account.uiStatus === 'checking'"
              @click="handleAction(account)"
            >
              <component :is="actionIcon(account.uiStatus)" :size="14" />
              {{ actionLabel(account.uiStatus) }}
            </button>
            <button
              v-if="account.uiStatus !== 'checking'"
              type="button"
              class="ghost-button"
              @click="setAccountStatus(account.id, 'checking')"
            >
              <Loader2 :size="14" /> 检查
            </button>
          </div>
        </li>
      </ul>
    </main>

    <AppDialog
      :open="showAddDialog"
      title="添加平台账号"
      @close="closeAddDialog"
    >
      <div class="add-account-flow">
        <div v-if="addStep === 'select'" class="add-account-platforms">
          <p class="add-account-hint">选择要授权的平台：</p>
          <div class="platform-options">
            <button
              v-for="profile in platformProfiles"
              :key="profile.id"
              type="button"
              class="platform-option"
              @click="choosePlatform(profile.id)"
            >
              <span class="platform-option-name">{{ profile.label }}</span>
              <span v-if="!profile.supportsDraftMode" class="platform-option-note">仅直接发布</span>
            </button>
          </div>
        </div>

        <div v-else-if="addStep === 'handoff'" class="add-account-handoff">
          <p class="add-account-hint">
            即将前往
            <strong>{{ platformLabels[selectedPlatform as PublishPlatform] }}</strong>
            官方授权页面完成登录。<br />
            本应用不会拦截或保存你的密码、Cookie 或 Token；授权成功后，系统安全存储将返回一个
            <code>credentialRef</code> 引用供后续发布使用。
          </p>
          <div class="add-account-notice">
            <AlertCircle :size="16" />
            <span>真实 OAuth / 二维码 / Cookie 导入流程暂未接入。点击按钮不会实际打开浏览器或完成授权。</span>
          </div>
        </div>

        <div v-else-if="addStep === 'checking'" class="add-account-checking">
          <Loader2 :size="32" class="spin" />
          <p>正在等待授权回调…（模拟，真实流程暂未接入）</p>
        </div>

        <div v-else-if="addStep === 'result'" class="add-account-result">
          <XCircle :size="32" />
          <p class="add-account-result-title">授权流程暂未接入</p>
          <p class="add-account-result-desc">
            当前版本不会真实打开官方授权页面，新账号已标记为「不可用」。<br />
            真实环境将由 OAuth / 二维码 / Cookie 导入回调更新状态，并写入系统安全存储的
            <code>credentialRef</code>。
          </p>
        </div>
      </div>

      <template #actions>
        <button type="button" class="secondary" @click="closeAddDialog">
          {{ addStep === 'select' ? '取消' : '关闭' }}
        </button>
        <button
          v-if="addStep === 'handoff'"
          type="button"
          class="primary"
          @click="startHandoff"
        >
          <ExternalLink :size="14" />
          打开授权流程（暂未接入）
        </button>
      </template>
    </AppDialog>
  </div>
</template>

<style scoped>
.account-management {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  background: var(--mx-bg-base);
}

.account-management-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 24px 24px 16px;
  border-bottom: 1px solid var(--mx-border-subtle);
  background: var(--mx-bg-surface);
}

.account-management-header h1 {
  margin: 0 0 6px;
  font-size: 24px;
  font-weight: 700;
  color: var(--mx-text-primary);
  line-height: 1.25;
}

.account-management-header p {
  margin: 0;
  font-size: 13px;
  color: var(--mx-text-secondary);
  max-width: 640px;
}

.account-management-main {
  flex: 1 1 auto;
  min-width: 0;
  padding: 20px 24px;
  overflow-y: auto;
}

.account-management-empty {
  display: grid;
  place-items: center;
  min-height: 240px;
}

.account-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.account-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--mx-border-default);
  border-radius: var(--mx-radius-lg);
  background: var(--mx-bg-elevated);
  transition: border-color 120ms ease, background 120ms ease;
}

.account-card.is-connected {
  border-color: rgba(52, 211, 153, 0.35);
  background: var(--mx-success-bg);
}

.account-card.is-reauthorize {
  border-color: rgba(251, 191, 36, 0.35);
  background: var(--mx-warning-bg);
}

.account-card.is-checking {
  border-color: rgba(91, 141, 239, 0.35);
  background: var(--mx-accent-soft-bg);
}

.account-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.account-platform {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  color: var(--mx-text-primary);
}

.account-status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: var(--mx-radius-pill);
  font-size: 11px;
  font-weight: 700;
}

.account-status.is-connected {
  color: var(--mx-success);
  background: var(--mx-success-bg);
}

.account-status.is-reauthorize {
  color: var(--mx-warning);
  background: var(--mx-warning-bg);
}

.account-status.is-checking {
  color: var(--mx-accent);
  background: var(--mx-accent-soft-bg);
}

.account-status.is-unavailable,
.account-status.is-disconnected {
  color: var(--mx-text-tertiary);
  background: var(--mx-bg-input);
}

.account-card-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.account-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--mx-text-primary);
}

.account-description {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--mx-text-secondary);
}

.account-card-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: auto;
}

.account-card-actions .ghost-button {
  flex: 1 1 auto;
}

.add-account-flow {
  display: grid;
  gap: 16px;
}

.add-account-hint {
  margin: 0;
  font-size: 13px;
  color: var(--mx-text-secondary);
  line-height: 1.5;
}

.add-account-hint strong {
  color: var(--mx-text-primary);
}

.platform-options {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.platform-option {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 12px;
  border: 1px solid var(--mx-border-default);
  border-radius: var(--mx-radius-md);
  color: var(--mx-text-primary);
  background: var(--mx-bg-input);
  text-align: left;
}

.platform-option:hover:not(:disabled) {
  border-color: var(--mx-accent);
  background: var(--mx-bg-hover);
}

.platform-option-name {
  font-size: 14px;
  font-weight: 600;
}

.platform-option-note {
  font-size: 11px;
  color: var(--mx-text-tertiary);
}

.add-account-handoff {
  display: grid;
  gap: 12px;
}

.add-account-notice {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  border-radius: var(--mx-radius-md);
  font-size: 12px;
  line-height: 1.5;
  color: var(--mx-warning);
  background: var(--mx-warning-bg);
}

.add-account-checking,
.add-account-result {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 24px 0;
  text-align: center;
}

.add-account-checking p,
.add-account-result-desc {
  margin: 0;
  font-size: 13px;
  color: var(--mx-text-secondary);
  line-height: 1.5;
}

.add-account-result-title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--mx-error);
}

.add-account-result svg {
  color: var(--mx-error);
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
