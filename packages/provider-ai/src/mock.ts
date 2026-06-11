import path from "node:path";
import type {
  AiProvider,
  CloneVoiceInput,
  CloneVoiceResult,
  GenerateAvatarVideoInput,
  GenerateAvatarVideoResult,
  MockAiProviderOptions,
  RewriteScriptInput,
  RewriteScriptResult,
  SynthesizeSpeechInput,
  SynthesizeSpeechResult,
  TranscribeInput,
  TranscriptResult,
} from "./types.js";

const DEFAULT_ARTIFACT_ROOT = "/tmp/mirax-ai";

export function createMockAiProvider(options: MockAiProviderOptions = {}): AiProvider {
  const artifactRoot = options.artifactRoot ?? DEFAULT_ARTIFACT_ROOT;

  return {
    async transcribe(input: TranscribeInput): Promise<TranscriptResult> {
      const fileName = path.basename(input.sourceVideoPath);

      return {
        text: `这是从 ${fileName} 提取的模拟口播文案，语言为 ${input.language ?? "auto"}。`,
        segments: [
          {
            startSeconds: 0,
            endSeconds: 4,
            text: "开场提出用户痛点。",
          },
          {
            startSeconds: 4,
            endSeconds: 12,
            text: "展示产品卖点和使用场景。",
          },
        ],
      };
    },

    async rewriteScript(input: RewriteScriptInput): Promise<RewriteScriptResult> {
      const points = input.sellingPoints.length > 0 ? input.sellingPoints.join("、") : "核心卖点";

      return {
        script: `今天分享 ${input.productName}，重点是 ${points}。${input.transcript} 结尾引导用户点击了解。`,
        titleSuggestions: [
          `${input.productName}真实体验`,
          `${input.productName}怎么选`,
          `这款${input.productName}适合谁`,
        ],
        coverTextSuggestions: [`${input.productName}测评`, `${points}一条讲清`],
      };
    },

    async cloneVoice(input: CloneVoiceInput): Promise<CloneVoiceResult> {
      return {
        voiceId: `mock-voice-${input.projectId}`,
        samplePath: input.voiceSamplePath,
      };
    },

    async synthesizeSpeech(input: SynthesizeSpeechInput): Promise<SynthesizeSpeechResult> {
      return {
        audioPath: path.join(artifactRoot, input.projectId, "speech.wav"),
        durationSeconds: estimateSpeechDuration(input.script),
      };
    },

    async generateAvatarVideo(input: GenerateAvatarVideoInput): Promise<GenerateAvatarVideoResult> {
      return {
        videoPath: path.join(artifactRoot, input.projectId, "avatar.mp4"),
        durationSeconds: 18,
      };
    },
  };
}

function estimateSpeechDuration(script: string): number {
  return Math.max(3, Math.ceil(script.length / 5));
}
