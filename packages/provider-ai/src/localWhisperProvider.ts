import { AiProviderError } from "./types.js";
import type {
  AiProvider,
  CloneVoiceInput,
  CloneVoiceResult,
  GenerateAvatarVideoInput,
  GenerateAvatarVideoResult,
  LocalWhisperProviderOptions,
  RewriteScriptInput,
  RewriteScriptResult,
  RunLocalWhisperInput,
  SynthesizeSpeechInput,
  SynthesizeSpeechResult,
  TranscriptResult,
  TranscribeInput,
} from "./types.js";

const DEFAULT_PYTHON_PATH = "/Users/yuzhenzhao/.local/share/mirax-ai/asr-venv/bin/python";
const DEFAULT_MODEL = "tiny";
const DEFAULT_DEVICE = "cpu";
const DEFAULT_COMPUTE_TYPE = "int8";
const UNWIRED_ERROR = "Local whisper provider only supports transcription in this stage.";
const TRADITIONAL_TO_SIMPLIFIED: Record<string, string> = {
  這: "这",
  個: "个",
  們: "们",
  會: "会",
  運: "运",
  營: "营",
  統: "统",
  鐘: "钟",
  來: "来",
  萬: "万",
  絲: "丝",
  內: "内",
  亂: "乱",
  兩: "两",
  創: "创",
  條: "条",
  視: "视",
  頻: "频",
  對: "对",
  簡: "简",
  過: "过",
  還: "还",
  點: "点",
  擊: "击",
  聲: "声",
  發: "发",
  後: "后",
  體: "体",
  裡: "里",
  裏: "里",
  國: "国",
  間: "间",
  門: "门",
  開: "开",
  關: "关",
  說: "说",
  話: "话",
  語: "语",
  寫: "写",
  轉: "转",
  檔: "档",
  資: "资",
  訊: "讯",
  擇: "择",
  標: "标",
  題: "题",
  預: "预",
  設: "设",
  結: "结",
  構: "构",
  產: "产",
  賣: "卖",
  買: "买",
  價: "价",
  優: "优",
  級: "级",
  實: "实",
  驗: "验",
  應: "应",
};

export { DEFAULT_PYTHON_PATH };

export class LocalWhisperProvider implements AiProvider {
  readonly pythonPath: string;
  readonly model: string;
  readonly device: string;
  readonly computeType: string;
  private readonly runLocalWhisper: (input: RunLocalWhisperInput) => Promise<string>;

  constructor(options: LocalWhisperProviderOptions) {
    this.pythonPath = options.pythonPath?.trim() || DEFAULT_PYTHON_PATH;
    this.model = options.model?.trim() || DEFAULT_MODEL;
    this.device = options.device?.trim() || DEFAULT_DEVICE;
    this.computeType = options.computeType?.trim() || DEFAULT_COMPUTE_TYPE;
    this.runLocalWhisper = options.runLocalWhisper;
  }

  async transcribe(input: TranscribeInput): Promise<TranscriptResult> {
    const audioPath = input.audioPath?.trim();
    if (!audioPath) {
      // 本地方案只接受已抽取的音频路径；保留 sourceVideoPath 失败分支与真实 OpenAI provider 一致。
      if (input.sourceVideoPath?.trim()) {
        throw new AiProviderError(
          "not-configured",
          "本地转写需要 audioPath；请先通过 FFmpeg 抽取音频。",
        );
      }

      throw new AiProviderError("not-configured", "Transcribe source path is empty.");
    }

    try {
      const raw = await this.runLocalWhisper({
        pythonPath: this.pythonPath,
        model: this.model,
        device: this.device,
        computeType: this.computeType,
        audioPath,
        language: normalizeLanguage(input.language),
      });
      return parseTranscriptResult(JSON.parse(raw));
    } catch (error) {
      if (error instanceof AiProviderError) {
        throw error;
      }
      if (error instanceof SyntaxError) {
        throw new AiProviderError("bad-response", "本地 Whisper 输出不是有效 JSON。");
      }
      throw new AiProviderError("transcribe-failed", "本地 Whisper 转写失败。");
    }
  }

  async rewriteScript(_input: RewriteScriptInput): Promise<RewriteScriptResult> {
    throw new Error(UNWIRED_ERROR);
  }

  async cloneVoice(_input: CloneVoiceInput): Promise<CloneVoiceResult> {
    throw new Error(UNWIRED_ERROR);
  }

  async synthesizeSpeech(_input: SynthesizeSpeechInput): Promise<SynthesizeSpeechResult> {
    throw new Error(UNWIRED_ERROR);
  }

  async generateAvatarVideo(_input: GenerateAvatarVideoInput): Promise<GenerateAvatarVideoResult> {
    throw new Error(UNWIRED_ERROR);
  }
}

export function createLocalWhisperProvider(options: LocalWhisperProviderOptions): AiProvider {
  if (typeof options.runLocalWhisper !== "function") {
    throw new AiProviderError("not-configured", "未注入本地 Whisper 执行器。");
  }
  return new LocalWhisperProvider(options);
}

function parseTranscriptResult(data: unknown): TranscriptResult {
  if (!isObject(data) || typeof data.text !== "string" || data.text.trim() === "") {
    throw new AiProviderError("transcribe-failed", "本地 Whisper 输出缺少转写文本。");
  }

  const segments = Array.isArray(data.segments)
    ? data.segments
        .map((segment: unknown) => {
          if (!isObject(segment)) return null;
          const startSeconds = typeof segment.start === "number" ? segment.start : undefined;
          const endSeconds = typeof segment.end === "number" ? segment.end : undefined;
          const text = typeof segment.text === "string" ? segment.text : undefined;
          if (startSeconds === undefined || endSeconds === undefined || !text?.trim()) {
            return null;
          }
          return { startSeconds, endSeconds, text: toSimplifiedChinese(text.trim()) };
        })
        .filter((s): s is TranscriptResult["segments"][number] => s !== null)
    : [];

  if (segments.length === 0) {
    segments.push({ startSeconds: 0, endSeconds: 0, text: toSimplifiedChinese(data.text.trim()) });
  }

  return {
    text: toSimplifiedChinese(data.text.trim()),
    segments,
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeLanguage(language?: string): string | undefined {
  if (!language) return undefined;
  const normalized = language.trim().split("-")[0].toLowerCase();
  return normalized || undefined;
}

function toSimplifiedChinese(text: string): string {
  // ponytail: common ASR glyph map; replace with OpenCC if broad zh-Hant support becomes a product requirement.
  return text.replace(/[這個們會運營統鐘來萬絲內亂兩創條視頻對簡過還點擊聲發後體裡裏國間門開關說話語寫轉檔資訊擇標題預設結構產品賣買價優級實驗應用]/g, (char) => TRADITIONAL_TO_SIMPLIFIED[char] ?? char);
}
