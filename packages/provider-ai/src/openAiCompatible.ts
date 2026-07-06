import {
  AiProviderError,
  type AiProvider,
  type CloneVoiceInput,
  type CloneVoiceResult,
  type GenerateAvatarVideoInput,
  type GenerateAvatarVideoResult,
  type OpenAiCompatibleProviderOptions,
  type OpenAiCompatibleTransport,
  type OpenAiCompatibleTransportRequest,
  type OpenAiCompatibleTransportResponse,
  type RewriteScriptInput,
  type RewriteScriptResult,
  type SynthesizeSpeechInput,
  type SynthesizeSpeechResult,
  type TranscribeInput,
  type TranscriptResult,
} from "./types.js";

const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
const UNWIRED_ERROR = "OpenAI-compatible provider is not wired yet. Use MockAiProvider in MVP.";

/**
 * OpenAI-compatible provider 的真实实现。
 *
 * 边界说明：
 * - 构造函数接收 `apiKey` / `model` / `baseUrl`，仅用于真实调用；不会把 key 发送到任何非目标 endpoint。
 * - 默认使用基于全局 `fetch` 的 runtime transport，桌面端 real 模式可直接发起真实调用。
 * - 构造函数支持注入 `transport`，单测注入 fake transport 后不会触发真实网络请求。
 * - 错误信息中不包含 `apiKey`、完整响应体或 base URL 中的 token。
 */
export class OpenAiCompatibleProvider implements AiProvider {
  readonly baseUrl: string;
  readonly apiKey: string;
  readonly model: string;
  private readonly transport: OpenAiCompatibleTransport;

  constructor(options: OpenAiCompatibleProviderOptions, transport: OpenAiCompatibleTransport) {
    this.baseUrl = (options.baseUrl ?? DEFAULT_OPENAI_BASE_URL).replace(/\/+$/, "");
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.transport = transport;
  }

  async transcribe(_input: TranscribeInput): Promise<TranscriptResult> {
    throw new Error(UNWIRED_ERROR);
  }

  async rewriteScript(input: RewriteScriptInput): Promise<RewriteScriptResult> {
    const endpoint = `${this.baseUrl}/chat/completions`;
    const body = {
      model: this.model,
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: buildUserPrompt(input) },
      ],
      temperature: 0.7,
    };

    try {
      const response = await this.transport.request({
        endpoint,
        method: "POST",
        headers: { Authorization: `Bearer ${this.apiKey}` },
        body,
      });

      if (response.status === 401 || response.status === 403) {
        throw new AiProviderError("unauthorized", `LLM provider returned ${response.status}. Check your API key.`);
      }
      if (response.status < 200 || response.status >= 300) {
        throw new AiProviderError("bad-response", `LLM provider returned HTTP ${response.status}.`);
      }

      const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new AiProviderError("bad-response", "LLM response missing content.");
      }

      return parseRewriteResult(content);
    } catch (error) {
      if (error instanceof AiProviderError) {
        throw error;
      }
      if (error instanceof SyntaxError) {
        throw new AiProviderError("bad-response", "LLM response is not valid JSON.");
      }
      throw new AiProviderError("network", "Network error while contacting LLM provider.");
    }
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

export function createOpenAiCompatibleProvider(options: OpenAiCompatibleProviderOptions): AiProvider {
  validateOptions(options);
  const transport = options.transport ?? createDefaultOpenAiTransport();
  return new OpenAiCompatibleProvider(options, transport);
}

function validateOptions(options: OpenAiCompatibleProviderOptions): void {
  if (!options.apiKey || options.apiKey.trim() === "") {
    throw new AiProviderError("not-configured", "OpenAI-compatible provider apiKey is required.");
  }
  if (!options.model || options.model.trim() === "") {
    throw new AiProviderError("not-configured", "OpenAI-compatible provider model is required.");
  }
}

export function createDefaultOpenAiTransport(): OpenAiCompatibleTransport {
  return {
    async request(req: OpenAiCompatibleTransportRequest): Promise<OpenAiCompatibleTransportResponse> {
      const isFormData = typeof FormData !== "undefined" && req.body instanceof FormData;
      const response = await fetch(req.endpoint, {
        method: req.method,
        headers: {
          ...(isFormData ? {} : { "Content-Type": "application/json" }),
          ...req.headers,
        },
        body: isFormData ? (req.body as FormData) : req.body ? JSON.stringify(req.body) : undefined,
      });

      return {
        status: response.status,
        json: () => response.json(),
      };
    },
  };
}

function buildSystemPrompt(): string {
  return `You are a short-video script rewriter for Chinese e-commerce content.
Rewrite the provided transcript into a polished, fluent 口播 script.
Return ONLY a JSON object with exactly these keys:
- "script": string (the rewritten script)
- "titleSuggestions": string[] (3 suggested titles)
- "coverTextSuggestions": string[] (2 suggested cover texts)
No markdown fences, no explanation.`;
}

function buildUserPrompt(input: RewriteScriptInput): string {
  const lines = [
    `Product: ${input.productName}`,
    `Selling points: ${input.sellingPoints.join(", ") || "general"}`,
  ];
  if (input.activeGoal) lines.push(`Goal: ${input.activeGoal}`);
  if (input.activePreset) lines.push(`Template: ${input.activePreset}`);
  if (input.targetLength) lines.push(`Target length: ${input.targetLength} characters`);
  lines.push("", "Transcript:", input.transcript);
  return lines.join("\n");
}

function parseRewriteResult(content: string): RewriteScriptResult {
  const cleaned = content.trim().replace(/^```json\s*/i, "").replace(/```$/i, "");

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new AiProviderError("bad-response", "Failed to parse LLM response as JSON.");
  }

  if (!isObject(parsed) || typeof parsed.script !== "string" || parsed.script.trim() === "") {
    throw new AiProviderError("bad-response", "LLM response JSON missing valid 'script'.");
  }

  return {
    script: parsed.script,
    titleSuggestions: sanitizeStringArray(parsed.titleSuggestions, 3),
    coverTextSuggestions: sanitizeStringArray(parsed.coverTextSuggestions, 2),
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeStringArray(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string").slice(0, max);
}
