export type AiConnectionTestInput =
  | { mode: "mock" }
  | {
      mode: "openai-compatible";
      baseUrl: string;
      apiKey: string;
      model: string;
    };

export interface AiConnectionTestResult {
  ok: boolean;
  message: string;
}

export async function testAiProviderConnection(input: AiConnectionTestInput): Promise<AiConnectionTestResult> {
  if (input.mode === "mock") {
    return { ok: true, message: "Mock Provider 可用" };
  }

  // MVP 阶段不执行真实网络探测；返回固定诚实错误即可。
  // 注意：即使 input 包含 apiKey，也不得将其写入日志、错误信息或任何持久化存储。
  return {
    ok: false,
    message: "OpenAI-compatible provider 尚未接入，MVP 请使用 Mock Provider。",
  };
}
