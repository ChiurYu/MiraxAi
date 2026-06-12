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

  return {
    ok: false,
    message: "OpenAI-compatible provider 尚未接入，MVP 请使用 Mock Provider。",
  };
}
