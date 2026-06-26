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
    };

export async function testAiProviderConnection(input: AiConnectionTestInput): Promise<AiConnectionTestResult> {
  if (input.mode === "mock") {
    return { ok: true, message: "Mock Provider 可用" };
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

export type { AiConnectionTestResult, AiProviderErrorCode };
