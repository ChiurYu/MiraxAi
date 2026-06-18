<script setup lang="ts">
import {
  CheckCircle2,
  Circle,
  CloudUpload,
  ClipboardCheck,
  FileVideo,
  FileText,
  FolderOpen,
  Image,
  Link2,
  Loader2,
  Mic,
  Moon,
  Music2,
  Play,
  PlayCircle,
  RefreshCw,
  Settings2,
  Sun,
  Upload,
  UserRound,
  Volume2,
  WandSparkles,
} from "lucide-vue-next";
import { computed, ref } from "vue";
import {
  validateProjectDraft,
  type ProjectDraft,
  type PublishPlatform,
  type WorkflowStage,
  type WorkflowStageId,
} from "@mirax/core";
import { createMockMediaRenderer } from "@mirax/media-pipeline";
import { createMockAiProvider } from "@mirax/provider-ai";
import { SUPPORTED_PLATFORM_PROFILES, createMockPublisher, type PublishAccount } from "@mirax/provider-publish";
import PathPickerButton from "./components/PathPickerButton.vue";
import StatusBadge from "./components/StatusBadge.vue";
import WorkbenchShell from "./components/workbench/WorkbenchShell.vue";
import WorkflowStageCard from "./components/workbench/WorkflowStageCard.vue";
import { useTaskCenterPreview } from "./composables/useTaskCenterPreview.js";
import { useWorkbenchDraft } from "./composables/useWorkbenchDraft.js";
import { useWorkflowRuntime } from "./composables/useWorkflowRuntime.js";
import SettingsView from "./views/SettingsView.vue";
import {
  appendPublishHistoryItem,
  createPublishHistoryItem,
} from "./features/task-center/taskHistory.js";

const aiProvider = createMockAiProvider({ artifactRoot: "/Users/Shared/MiraxAI" });
const mediaRenderer = createMockMediaRenderer({ artifactRoot: "/Users/Shared/MiraxAI" });
const publisher = createMockPublisher();

const { draft, saveStatus } = useWorkbenchDraft();
const { latestItems: latestHistoryItems, refresh: refreshTaskHistory } = useTaskCenterPreview({ limit: 5 });

const publishAccounts = ref<PublishAccount[]>([]);
const generatedVideoPath = ref("");
const generatedCoverPath = ref("");
const generatedAudioPath = ref("");
const generatedAvatarPath = ref("");
const publishTitle = ref("");
const publishDescription = ref("");
const publishTags = ref("通勤包, 大容量, 质感");
const publishMode = ref<"direct" | "draft">("draft");
const theme = ref<"light" | "dark">("dark");
const activeView = ref<"workbench" | "settings">("workbench");

const runtime = useWorkflowRuntime({
  projectId: "demo-project",
  executor: executeStage,
});

const project = computed({
  get: () => draft.project,
  set: (value: ProjectDraft) => {
    Object.assign(draft.project, value);
  },
});

const projectErrors = computed(() => validateProjectDraft(project.value));
const canRun = computed(
  () => !runtime.running.value && projectErrors.value.length === 0 && Boolean(runtime.nextStage.value),
);
const platformLabels = computed<Record<PublishPlatform, string>>(() =>
  Object.fromEntries(SUPPORTED_PLATFORM_PROFILES.map((profile) => [profile.id, profile.label])) as Record<
    PublishPlatform,
    string
  >,
);
const selectedAccountText = computed(() => {
  if (publishAccounts.value.length === 0) {
    return "选择账号";
  }

  return project.value.targetPlatforms
    .map((platformId) => publishAccounts.value.find((account) => account.platformId === platformId)?.displayName)
    .filter(Boolean)
    .join("、");
});

function getStage(stageId: WorkflowStageId): WorkflowStage {
  return runtime.workflow.value.stages.find((stage) => stage.id === stageId)!;
}

function getPlatformLabel(platform: PublishPlatform): string {
  return platformLabels.value[platform];
}

function resetWorkbench() {
  runtime.resetWorkflow();
  publishAccounts.value = [];
  generatedVideoPath.value = "";
  generatedCoverPath.value = "";
  generatedAudioPath.value = "";
  generatedAvatarPath.value = "";
  publishTitle.value = "";
  publishDescription.value = "";
}

async function executeStage(stageId: WorkflowStageId, title: string): Promise<string> {
  switch (stageId) {
    case "transcribe": {
      const result = await aiProvider.transcribe({
        sourceVideoPath: project.value.sourceVideoPath ?? "",
        language: "zh-CN",
      });
      return `已提取 ${result.segments.length} 段文案`;
    }
    case "rewrite": {
      const result = await aiProvider.rewriteScript({
        transcript: "模拟对标视频文案",
        productName: project.value.name,
        sellingPoints: ["通勤", "大容量", "质感"],
      });
      publishTitle.value = result.titleSuggestions[0] ?? project.value.name;
      publishDescription.value = result.script.slice(0, 100);
      return `生成 ${result.titleSuggestions.length} 个标题方向`;
    }
    case "voice-clone": {
      const result = await aiProvider.cloneVoice({
        voiceSamplePath: project.value.voiceSamplePath ?? "",
        projectId: runtime.workflow.value.projectId,
      });
      return `声音配置 ${result.voiceId} 已就绪`;
    }
    case "speech": {
      const result = await aiProvider.synthesizeSpeech({
        voiceId: "mock-voice-demo-project",
        script: project.value.notes ?? project.value.name,
        projectId: runtime.workflow.value.projectId,
      });
      generatedAudioPath.value = result.audioPath;
      return `音频已生成：${result.audioPath}`;
    }
    case "avatar": {
      const result = await aiProvider.generateAvatarVideo({
        audioPath: generatedAudioPath.value || "/Users/Shared/MiraxAI/demo-project/speech.wav",
        avatarId: "presenter-a",
        projectId: runtime.workflow.value.projectId,
      });
      generatedAvatarPath.value = result.videoPath;
      return `数字人片段已生成：${result.videoPath}`;
    }
    case "compose": {
      const result = await mediaRenderer.render({
        projectId: runtime.workflow.value.projectId,
        avatarVideoPath: generatedAvatarPath.value || "/Users/Shared/MiraxAI/demo-project/avatar.mp4",
        audioPath: generatedAudioPath.value || "/Users/Shared/MiraxAI/demo-project/speech.wav",
        subtitleText: project.value.notes ?? project.value.name,
        coverText: project.value.name,
      });
      generatedVideoPath.value = result.videoPath;
      generatedCoverPath.value = result.coverPath;
      return `成片已生成：${result.videoPath}`;
    }
    case "review":
      return "人工复核清单已通过";
    case "publish": {
      publishAccounts.value = await publisher.listAccounts();

      const platformText =
        project.value.targetPlatforms.map((platform) => platformLabels.value[platform]).join("、") || "未选择";
      const accountText = selectedAccountText.value || "选择账号";
      const modeText = publishMode.value === "direct" ? "直接发布" : "草稿";
      const videoPath = generatedVideoPath.value || "未生成";

      const confirmed = window.confirm(
        `确认创建 ${project.value.targetPlatforms.length} 个发布任务？\n\n账号：${accountText}\n平台：${platformText}\n发布模式：${modeText}\n视频路径：${videoPath}`,
      );

      if (!confirmed) {
        throw new Error("PUBLISH_CANCELLED");
      }

      const result = await publisher.publish({
        projectId: runtime.workflow.value.projectId,
        videoPath: generatedVideoPath.value,
        title: publishTitle.value || project.value.name,
        description: publishDescription.value || project.value.notes || "",
        platformIds: project.value.targetPlatforms,
        mode: publishMode.value,
      });

      const historyItem = createPublishHistoryItem({
        projectId: runtime.workflow.value.projectId,
        taskIds: result.taskIds,
        videoPath: generatedVideoPath.value,
        platforms: project.value.targetPlatforms,
      });
      appendPublishHistoryItem(historyItem);
      refreshTaskHistory();

      return `${result.message}：${result.taskIds.join("、")}`;
    }
  }
}

function toggleTheme() {
  theme.value = theme.value === "dark" ? "light" : "dark";
}
</script>

<template>
  <WorkbenchShell
    :project-name="project.name"
    :active-stage-title="runtime.activeStage.value?.title || '准备开始'"
    :progress-percent="runtime.progress.value.percent"
    :progress-completed="runtime.progress.value.completed"
    :progress-total="runtime.progress.value.total"
    :running="runtime.running.value"
    :running-mode="runtime.runningMode.value"
    :can-run="canRun"
    :theme="theme"
    :active-view="activeView"
    @run-next="runtime.runNextStage"
    @run-all="runtime.runAllStages"
    @reset="resetWorkbench"
    @toggle-theme="toggleTheme"
    @switch-view="activeView = $event"
  >
    <template v-if="activeView === 'workbench'">
    <WorkflowStageCard
      class="learn-card"
      :stage="getStage('transcribe')"
      :status="runtime.stageStatus.value.transcribe"
      @run="runtime.runStage('transcribe')"
    >
      <template #icon><Link2 :size="19" /></template>
      <template #heading-extra><small>{{ saveStatus }}</small></template>
      <div class="tabs">
        <span class="active">提取文案</span>
        <span>IP大脑</span>
        <span>爆款选题</span>
        <span>营销文案</span>
      </div>
      <label>
        <span>项目名称</span>
        <input v-model="project.name" />
      </label>
      <label>
        <span>视频链接</span>
        <PathPickerButton
          v-model="project.sourceVideoPath"
          label="选择对标视频"
          placeholder="请输入视频链接或本地路径"
          :filters="[{ name: 'Video', extensions: ['mp4', 'mov', 'm4v'] }]"
        />
      </label>
      <label>
        <span>原文案 / 卖点备注</span>
        <textarea v-model="project.notes" placeholder="提取的文案将显示在这里..." />
      </label>
      <template #actions>
        <button
          class="primary compact-button"
          :disabled="runtime.running.value || runtime.stageStatus.value.transcribe === 'completed'"
          @click="runtime.runStage('transcribe')"
        >
          <Link2 :size="16" /> 提取文案
        </button>
      </template>
    </WorkflowStageCard>

    <WorkflowStageCard
      class="rewrite-card"
      :stage="getStage('rewrite')"
      :status="runtime.stageStatus.value.rewrite"
      @run="runtime.runStage('rewrite')"
    >
      <template #icon><WandSparkles :size="19" /></template>
      <div class="two-columns">
        <label>
          <span>写作提示词</span>
          <select>
            <option>默认文案写作提示词</option>
          </select>
        </label>
        <label>
          <span>字数</span>
          <select>
            <option>300字</option>
          </select>
        </label>
      </div>
      <template #actions>
        <button
          class="primary compact-button"
          :disabled="runtime.running.value || runtime.stageStatus.value.rewrite === 'completed'"
          @click="runtime.runStage('rewrite')"
        >
          <WandSparkles :size="16" /> 改写文案
        </button>
        <button class="legal-button"><ShieldCheck :size="16" /> AI法务</button>
      </template>
      <label>
        <span>改写内容</span>
        <textarea v-model="publishDescription" placeholder="改写的文案将显示在这里..." />
      </label>
    </WorkflowStageCard>

    <WorkflowStageCard
      class="voice-clone-card"
      :stage="getStage('voice-clone')"
      :status="runtime.stageStatus.value['voice-clone']"
      @run="runtime.runStage('voice-clone')"
    >
      <template #icon><Mic :size="19" /></template>
      <label>
        <span>声音样本</span>
        <PathPickerButton
          v-model="project.voiceSamplePath"
          label="选择声音样本"
          placeholder="请选择或输入声音样本路径"
          :filters="[{ name: 'Audio', extensions: ['wav', 'mp3', 'm4a'] }]"
        />
      </label>
      <template #actions>
        <button
          class="primary compact-button"
          :disabled="runtime.running.value || runtime.stageStatus.value['voice-clone'] === 'completed'"
          @click="runtime.runStage('voice-clone')"
        >
          <Mic :size="16" /> 克隆声音
        </button>
      </template>
      <div class="artifact-box">
        <Mic :size="32" />
        <strong>{{ runtime.stageStatus.value['voice-clone'] === 'completed' ? '声音配置已就绪' : '克隆的声音配置将在这里显示' }}</strong>
        <span>完成克隆后，下一步语音合成将使用项目专属声音</span>
      </div>
    </WorkflowStageCard>

    <WorkflowStageCard
      class="voice-card"
      :stage="getStage('speech')"
      :status="runtime.stageStatus.value.speech"
      @run="runtime.runStage('speech')"
    >
      <template #icon><Volume2 :size="19" /></template>
      <label>
        <span>选择声音</span>
        <select>
          <option>项目克隆声音</option>
          <option>女-带货</option>
          <option>男-讲解</option>
        </select>
      </label>
      <template #actions>
        <button
          class="primary compact-button"
          :disabled="runtime.running.value || runtime.stageStatus.value.speech === 'completed'"
          @click="runtime.runStage('speech')"
        >
          <Volume2 :size="16" /> 生成音频
        </button>
      </template>
      <div class="artifact-box">
        <Volume2 :size="32" />
        <strong>{{ generatedAudioPath ? "音频已生成" : "合成的音频将在这里显示" }}</strong>
        <span>{{ generatedAudioPath || "完成合成后可在此处播放预览" }}</span>
      </div>
    </WorkflowStageCard>

    <WorkflowStageCard
      class="avatar-card"
      :stage="getStage('avatar')"
      :status="runtime.stageStatus.value.avatar"
      @run="runtime.runStage('avatar')"
    >
      <template #icon><UserRound :size="19" /></template>
      <template #heading-extra><button class="link-button">上传形象</button></template>
      <div class="segmented">
        <button class="selected">单形象</button>
        <button>多镜头</button>
      </div>
      <label>
        <span>选择形象</span>
        <select>
          <option>示例1-绿幕</option>
        </select>
      </label>
      <label>
        <span>模型版本</span>
        <select>
          <option>高清模型V2</option>
        </select>
      </label>
      <template #actions>
        <button
          class="primary compact-button"
          :disabled="runtime.running.value || runtime.stageStatus.value.avatar === 'completed'"
          @click="runtime.runStage('avatar')"
        >
          <UserRound :size="16" /> 生成视频
        </button>
      </template>
      <div class="artifact-box preview-box">
        <UserRound :size="44" />
        <strong>{{ generatedAvatarPath ? "视频生成完成" : "暂无预览视频" }}</strong>
        <span>{{ generatedAvatarPath || "生成视频后将在此处显示预览" }}</span>
      </div>
    </WorkflowStageCard>

    <WorkflowStageCard
      class="compose-card"
      :stage="getStage('compose')"
      :status="runtime.stageStatus.value.compose"
      @run="runtime.runStage('compose')"
    >
      <template #icon><FileVideo :size="19" /></template>
      <div class="compose-grid">
        <div class="compose-controls">
          <label>
            <span>视频源</span>
            <input :value="generatedAvatarPath || '自动使用上一步数字人视频，或手动选择'" readonly />
          </label>
          <div class="toggle-row"><input type="checkbox" checked /> 启用字幕 <button>字幕设置</button></div>
          <label>
            <span>混剪（画中画）素材</span>
            <select><option>不混剪</option></select>
          </label>
          <label>
            <span>背景音乐</span>
            <div class="action-input">
              <input placeholder="选择背景音乐" />
              <button><Music2 :size="16" /></button>
            </div>
          </label>
          <div class="slider-row">
            <span>人声音量</span>
            <input type="range" min="0" max="1" step="0.1" value="1" />
            <b>1</b>
          </div>
          <div class="slider-row">
            <span>BGM音量</span>
            <input type="range" min="0" max="1" step="0.1" value="0.3" />
            <b>0.3</b>
          </div>
        </div>
        <div class="video-preview">
          <FileVideo :size="52" />
          <strong>{{ generatedVideoPath ? "成片已生成" : "暂无预览视频" }}</strong>
          <span>{{ generatedVideoPath || "生成视频后将在此处显示预览" }}</span>
        </div>
      </div>
      <template #actions>
        <button
          class="primary wide-button"
          :disabled="runtime.running.value || runtime.stageStatus.value.compose === 'completed'"
          @click="runtime.runStage('compose')"
        >
          <FileVideo :size="16" /> 剪辑视频
        </button>
      </template>
    </WorkflowStageCard>

    <WorkflowStageCard
      class="publish-meta-card"
      :stage="getStage('review')"
      :status="runtime.stageStatus.value.review"
      @run="runtime.runStage('review')"
    >
      <template #icon><FileText :size="19" /></template>
      <label>
        <span>标题</span>
        <div class="action-input">
          <input v-model="publishTitle" placeholder="输入视频标题" />
          <button @click="publishTitle = project.name">一键生成</button>
        </div>
      </label>
      <label>
        <span>描述</span>
        <textarea v-model="publishDescription" placeholder="输入视频描述..." />
      </label>
      <label>
        <span>话题标签</span>
        <input v-model="publishTags" placeholder="输入标签后回车，发布时自动拼接 #tag" />
      </label>
      <div class="cover-row">
        <div class="cover-preview">
          <Image :size="26" />
          <span>{{ generatedCoverPath ? "封面已生成" : "暂无封面" }}</span>
        </div>
        <div class="cover-actions">
          <button>封面设计</button>
          <button :disabled="!generatedCoverPath">打开封面</button>
          <button :disabled="!generatedCoverPath">导出封面</button>
        </div>
      </div>
      <template #actions>
        <button
          class="primary compact-button"
          :disabled="runtime.running.value || runtime.stageStatus.value.review === 'completed'"
          @click="runtime.runStage('review')"
        >
          <ClipboardCheck :size="16" /> 复核通过
        </button>
      </template>
    </WorkflowStageCard>

    <WorkflowStageCard
      class="publish-card"
      :stage="getStage('publish')"
      :status="runtime.stageStatus.value.publish"
      @run="runtime.runStage('publish')"
    >
      <template #icon><CloudUpload :size="19" /></template>
      <label>
        <span>视频地址</span>
        <div class="action-input">
          <input :value="generatedVideoPath || '自动使用上一步视频，或手动选择'" readonly />
          <button><FolderOpen :size="16" /></button>
        </div>
      </label>
      <label>
        <span>发布账号</span>
        <select>
          <option>{{ selectedAccountText }}</option>
        </select>
      </label>
      <div class="platforms compact-platforms">
        <label><input v-model="project.targetPlatforms" type="checkbox" value="douyin" /> 抖音</label>
        <label><input v-model="project.targetPlatforms" type="checkbox" value="xiaohongshu" /> 小红书</label>
        <label><input v-model="project.targetPlatforms" type="checkbox" value="kuaishou" /> 快手</label>
        <label><input v-model="project.targetPlatforms" type="checkbox" value="shipinhao" /> 视频号</label>
      </div>
      <div class="radio-row">
        <label><input v-model="publishMode" type="radio" value="direct" name="publish-mode" /> 直接发布</label>
        <label><input v-model="publishMode" type="radio" value="draft" name="publish-mode" /> 草稿</label>
      </div>
      <template #actions>
        <button
          class="primary wide-button"
          :disabled="runtime.running.value || runtime.stageStatus.value.publish === 'completed'"
          @click="runtime.runStage('publish')"
        >
          <CloudUpload :size="16" /> 立即发布
        </button>
      </template>
    </WorkflowStageCard>

    <section class="workflow-card log-card">
      <div class="card-heading">
        <span class="card-icon"><ClipboardCheck :size="19" /></span>
        <h2>执行记录</h2>
      </div>
      <div v-if="runtime.logs.value.length === 0" class="empty-log">等待启动第一步流程</div>
      <ul v-else class="log-list">
        <li v-for="log in runtime.logs.value.slice(0, 8)" :key="log.id">
          <strong>{{ log.stage }}</strong>
          <span>{{ log.message }}</span>
        </li>
      </ul>
      <div v-if="latestHistoryItems.length > 0" class="history-section">
        <h3>最近任务历史</h3>
        <ul class="history-list">
          <li v-for="item in latestHistoryItems" :key="item.id">
            <strong>{{ item.title }}</strong>
            <span>{{ item.platforms.map((p) => getPlatformLabel(p)).join("、") }} · {{ item.createdAt }}</span>
            <span class="history-video">视频：{{ item.videoPath }}</span>
            <span class="history-tasks">任务：{{ item.taskIds.join("、") }}</span>
          </li>
        </ul>
      </div>
    </section>
    </template>
    <SettingsView v-else />
  </WorkbenchShell>
</template>

<style scoped>
.voice-clone-card {
  padding-bottom: 12px;
}

.connection-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 4px;
}

.connection-message {
  font-size: 12px;
  color: var(--mx-text-tertiary);
}

.history-section h3 {
  margin: 12px 0 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--mx-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.history-list li {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 0;
  border-bottom: 1px solid var(--mx-border-subtle);
}

.history-list li:last-child {
  border-bottom: none;
}

.history-video,
.history-tasks {
  font-size: 11px;
  color: var(--mx-text-tertiary);
  word-break: break-all;
}

.history-tasks {
  color: var(--mx-cyan);
}
</style>
