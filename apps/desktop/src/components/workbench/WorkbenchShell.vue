<script setup lang="ts">
import {
  Circle,
  CloudUpload,
  ClipboardCheck,
  FolderOpen,
  KeyRound,
  Loader2,
  Moon,
  Play,
  PlayCircle,
  RefreshCw,
  Settings2,
  Sun,
  UserRound,
  Volume2,
  WandSparkles,
} from "lucide-vue-next";

defineProps<{
  projectName: string;
  activeStageTitle: string;
  progressPercent: number;
  progressCompleted: number;
  progressTotal: number;
  running: boolean;
  runningMode: "single" | "all" | null;
  canRun: boolean;
  theme: "light" | "dark";
}>();

const emit = defineEmits<{
  runNext: [];
  runAll: [];
  reset: [];
  toggleTheme: [];
}>();
</script>

<template>
  <main class="app-shell" :data-theme="theme">
    <aside class="nav-rail">
      <div class="brand">
        <div class="brand-mark">
          <PlayCircle :size="20" />
        </div>
        <div class="brand-text">
          <strong>Mirax AI</strong>
          <small>短视频工作台</small>
        </div>
      </div>
      <nav>
        <button class="nav-item active"><WandSparkles :size="18" /> 首页</button>
        <button class="nav-item"><Volume2 :size="18" /> 声音管理</button>
        <button class="nav-item"><UserRound :size="18" /> 形象管理</button>
        <button class="nav-item"><FolderOpen :size="18" /> 素材管理</button>
        <button class="nav-item"><ClipboardCheck :size="18" /> 任务中心</button>
        <button class="nav-item"><KeyRound :size="18" /> 账号管理</button>
        <button class="nav-item"><Settings2 :size="18" /> 设置</button>
      </nav>
    </aside>

    <section class="board-shell">
      <header class="window-bar">
        <div class="project-overview">
          <div class="project-title">
            <strong>{{ projectName || "Mirax AI 项目" }}</strong>
            <span>{{ activeStageTitle || "准备开始" }}</span>
          </div>
        </div>
        <div class="mode-switch">
          <button class="selected"><Play :size="15" /> 手动</button>
          <button><CloudUpload :size="15" /> 自动</button>
          <button><Circle :size="15" /> 后台</button>
        </div>
        <div class="toolbar-actions">
          <span class="progress-pill"><b>{{ progressPercent }}%</b> {{ progressCompleted }}/{{ progressTotal }}</span>
          <button
            class="theme-toggle"
            :aria-label="theme === 'dark' ? '切换到白天' : '切换到黑夜'"
            @click="emit('toggleTheme')"
          >
            <Sun v-if="theme === 'dark'" :size="16" />
            <Moon v-else :size="16" />
          </button>
          <button class="ghost-button" @click="emit('reset')">
            <RefreshCw :size="16" />
            清空数据
          </button>
          <button class="secondary" :disabled="!canRun" @click="emit('runAll')">
            <Loader2 v-if="runningMode === 'all'" :size="17" class="spin" />
            <PlayCircle v-else :size="17" />
            {{ runningMode === 'all' ? '运行中' : '运行全部' }}
          </button>
          <button class="primary" :disabled="!canRun" @click="emit('runNext')">
            <Loader2 v-if="runningMode === 'single'" :size="17" class="spin" />
            <Play v-else :size="17" />
            {{ runningMode === 'single' ? '执行中' : '运行下一步' }}
          </button>
        </div>
      </header>

      <div class="workflow-board">
        <slot />
      </div>
    </section>
  </main>
</template>

<style scoped>
.app-shell {
  display: flex;
  min-height: 100vh;
}

.nav-rail {
  width: 200px;
  border-right: 1px solid var(--mx-border-subtle);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.brand-text small {
  color: var(--mx-text-tertiary);
  font-size: 12px;
}

nav {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  background: transparent;
  border: none;
  color: var(--mx-text-secondary);
  cursor: pointer;
  text-align: left;
}

.nav-item.active {
  background: var(--mx-bg-hover);
  color: var(--mx-text-primary);
}

.board-shell {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.window-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-bottom: 1px solid var(--mx-border-subtle);
  gap: 16px;
}

.project-title {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.project-title span {
  font-size: 12px;
  color: var(--mx-text-tertiary);
}

.mode-switch {
  display: flex;
  gap: 8px;
}

.mode-switch button {
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid var(--mx-border-subtle);
  background: transparent;
  color: var(--mx-text-secondary);
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.mode-switch button.selected {
  background: var(--mx-bg-hover);
  color: var(--mx-text-primary);
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-pill {
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--mx-bg-surface);
  font-size: 12px;
}

.workflow-board {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  gap: 20px;
  align-content: start;
}
</style>
