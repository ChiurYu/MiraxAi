import { createDefaultOpenAiTransport } from "./openAiCompatible.js";
import { AiProviderError } from "./types.js";
import type { AiConnectionTestResult, AiProviderErrorCode, OpenAiCompatibleTransport } from "./types.js";

export type AiConnectionTestInput =
  | { mode: "mock" }
  | {
      mode: "openai-compatible";
      baseUrl?: string;
      apiKey: string;
      model: string;
      transport?: OpenAiCompatibleTransport;
    }
  | {
      mode: "cosyvoice";
      baseUrl: string;
      apiKey?: string;
      transport?: OpenAiCompatibleTransport;
    }
  | {
      mode: "whisper";
      baseUrl: string;
      apiKey?: string;
      transport?: OpenAiCompatibleTransport;
    }
  | {
      mode: "heygem";
      baseUrl: string;
      apiKey?: string;
      transport?: OpenAiCompatibleTransport;
    };

export async function testAiProviderConnection(input: AiConnectionTestInput): Promise<AiConnectionTestResult> {
  if (input.mode === "mock") {
    return { ok: true, message: "Mock Provider 可用" };
  }

  if (input.mode === "cosyvoice") {
    return testCosyVoiceConnection(input);
  }

  if (input.mode === "whisper") {
    return testWhisperConnection(input);
  }

  if (input.mode === "heygem") {
    return testHeyGemConnection(input);
  }

  if (!input.apiKey.trim()) {
    return { ok: false, code: "not-configured", message: "API key 不能为空。" };
  }
  if (!input.model.trim()) {
    return { ok: false, code: "not-configured", message: "Model 不能为空。" };
  }

  const baseUrl = (input.baseUrl ?? "https://api.openai.com/v1").replace(/\/+$/, "");

  let transport: OpenAiCompatibleTransport;
  try {
    transport = input.transport ?? createDefaultOpenAiTransport();
  } catch {
    return { ok: false, code: "not-connected", message: "无法初始化 provider 连接。" };
  }

  try {
    const response = await transport.request({
      endpoint: `${baseUrl}/models`,
      method: "GET",
      headers: { Authorization: `Bearer ${input.apiKey}` },
    });

    if (response.status === 401 || response.status === 403) {
      return { ok: false, code: "unauthorized", message: "API key 无效或权限不足，请检查 API key。" };
    }
    if (response.status < 200 || response.status >= 300) {
      return { ok: false, code: "bad-response", message: `Provider 返回 HTTP ${response.status}，连接测试失败。` };
    }

    await response.json();
    return { ok: true, message: "OpenAI-compatible provider 连接正常。" };
  } catch (error) {
    if (error instanceof AiProviderError) {
      return { ok: false, code: error.code, message: error.message };
    }
    if (error instanceof SyntaxError) {
      return { ok: false, code: "bad-response", message: "Provider 响应无法解析为 JSON。" };
    }
    return { ok: false, code: "network", message: "无法连接到 provider，请检查网络与 baseUrl。" };
  }
}

async function testCosyVoiceConnection(input: Extract<AiConnectionTestInput, { mode: "cosyvoice" }>): Promise<AiConnectionTestResult> {
  if (!input.baseUrl.trim()) {
    return { ok: false, code: "not-configured", message: "CosyVoice Base URL 不能为空。" };
  }

  const baseUrl = sanitizeBaseUrl(input.baseUrl);
  if (!baseUrl) {
    return { ok: false, code: "not-configured", message: "CosyVoice Base URL 格式不正确。" };
  }
  let transport: OpenAiCompatibleTransport;
  try {
    transport = input.transport ?? createDefaultOpenAiTransport();
  } catch {
    return { ok: false, code: "not-connected", message: "无法初始化 CosyVoice 连接。" };
  }

  try {
    const response = await transport.request({
      endpoint: `${baseUrl}/health`,
      method: "GET",
      headers: input.apiKey ? { Authorization: `Bearer ${input.apiKey}` } : {},
    });

    if (response.status === 401 || response.status === 403) {
      return { ok: false, code: "unauthorized", message: "CosyVoice 凭证无效或权限不足，请检查 API key。" };
    }
    if (response.status < 200 || response.status >= 300) {
      return { ok: false, code: "bad-response", message: `CosyVoice 返回 HTTP ${response.status}，连接测试失败。` };
    }

    await response.json();
    return { ok: true, message: "CosyVoice provider 连接正常。" };
  } catch (error) {
    if (error instanceof AiProviderError) {
      return { ok: false, code: error.code, message: error.message };
    }
    if (error instanceof SyntaxError) {
      return { ok: false, code: "bad-response", message: "CosyVoice 响应无法解析为 JSON。" };
    }
    return { ok: false, code: "network", message: "无法连接到 CosyVoice provider，请检查网络与 baseUrl。" };
  }
}

async function testWhisperConnection(input: Extract<AiConnectionTestInput, { mode: "whisper" }>): Promise<AiConnectionTestResult> {
  if (!input.baseUrl.trim()) {
    return { ok: false, code: "not-configured", message: "Whisper Base URL 不能为空。" };
  }

  const baseUrl = sanitizeBaseUrl(input.baseUrl);
  if (!baseUrl) {
    return { ok: false, code: "not-configured", message: "Whisper Base URL 格式不正确。" };
  }
  let transport: OpenAiCompatibleTransport;
  try {
    transport = input.transport ?? createDefaultOpenAiTransport();
  } catch {
    return { ok: false, code: "not-connected", message: "无法初始化 Whisper 连接。" };
  }

  try {
    const response = await transport.request({
      endpoint: `${baseUrl}/health`,
      method: "GET",
      headers: input.apiKey ? { Authorization: `Bearer ${input.apiKey}` } : {},
    });

    if (response.status === 401 || response.status === 403) {
      return { ok: false, code: "unauthorized", message: "Whisper 凭证无效或权限不足，请检查 API key。" };
    }
    if (response.status < 200 || response.status >= 300) {
      return { ok: false, code: "bad-response", message: `Whisper 返回 HTTP ${response.status}，连接测试失败。` };
    }

    await response.json();
    return { ok: true, message: "Whisper provider 连接正常。" };
  } catch (error) {
    if (error instanceof AiProviderError) {
      return { ok: false, code: error.code, message: error.message };
    }
    if (error instanceof SyntaxError) {
      return { ok: false, code: "bad-response", message: "Whisper 响应无法解析为 JSON。" };
    }
    return { ok: false, code: "network", message: "无法连接到 Whisper provider，请检查网络与 baseUrl。" };
  }
}

async function testHeyGemConnection(input: Extract<AiConnectionTestInput, { mode: "heygem" }>): Promise<AiConnectionTestResult> {
  if (!input.baseUrl.trim()) {
    return { ok: false, code: "not-configured", message: "HeyGem Base URL 不能为空。" };
  }

  const baseUrl = sanitizeBaseUrl(input.baseUrl);
  if (!baseUrl) {
    return { ok: false, code: "not-configured", message: "HeyGem Base URL 格式不正确。" };
  }
  let transport: OpenAiCompatibleTransport;
  try {
    transport = input.transport ?? createDefaultOpenAiTransport();
  } catch {
    return { ok: false, code: "not-connected", message: "无法初始化 HeyGem 连接。" };
  }

  try {
    const response = await transport.request({
      endpoint: `${baseUrl}/health`,
      method: "GET",
      headers: input.apiKey ? { Authorization: `Bearer ${input.apiKey}` } : {},
    });

    if (response.status === 401 || response.status === 403) {
      return { ok: false, code: "unauthorized", message: "HeyGem 凭证无效或权限不足，请检查 API key。" };
    }
    if (response.status < 200 || response.status >= 300) {
      return { ok: false, code: "bad-response", message: `HeyGem 返回 HTTP ${response.status}，连接测试失败。` };
    }

    await response.json();
    return { ok: true, message: "HeyGem provider 连接正常。" };
  } catch (error) {
    if (error instanceof AiProviderError) {
      return { ok: false, code: error.code, message: error.message };
    }
    if (error instanceof SyntaxError) {
      return { ok: false, code: "bad-response", message: "HeyGem 响应无法解析为 JSON。" };
    }
    return { ok: false, code: "network", message: "无法连接到 HeyGem provider，请检查网络与 baseUrl。" };
  }
}

function sanitizeBaseUrl(value: string): string {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return "";
    }
    const pathname = url.pathname === "/" ? "" : url.pathname;
    return `${url.origin}${pathname}`.replace(/\/+$/, "");
  } catch {
    return "";
  }
}

export type { AiConnectionTestResult, AiProviderErrorCode };
