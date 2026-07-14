import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import type { FetchBinary, FetchJson } from "@mirax/provider-ai";

export type TauriBaiLianInvoke = (command: string, args: Record<string, unknown>) => Promise<unknown>;

interface NativeBaiLianJsonResponse {
  status: number;
  body: string;
  diagnostic?: {
    code?: string;
    message?: string;
    requestId?: string;
  };
}

export function createTauriBaiLianFetchJson(invoke: TauriBaiLianInvoke = tauriInvoke): FetchJson {
  return async (url, init) => {
    if (init.method !== "POST") throw new Error("BaiLian native transport only supports POST");
    const authorization = init.headers.Authorization;
    if (!authorization?.startsWith("Bearer ")) throw new Error("BaiLian authorization is missing");
    const response = await invoke("bailian_json_post", {
      url,
      apiKey: authorization.slice("Bearer ".length),
      body: init.body ?? "{}",
    }) as NativeBaiLianJsonResponse;
    return {
      status: response.status,
      diagnostic: response.diagnostic,
      json: async () => JSON.parse(response.body) as unknown,
    };
  };
}

export function createTauriBaiLianFetchBinary(invoke: TauriBaiLianInvoke = tauriInvoke): FetchBinary {
  return async (url, init) => {
    if (init.method !== "GET" || init.body) throw new Error("BaiLian native audio transport only supports GET");
    const result = await invoke("bailian_audio_get", { url });
    if (!Array.isArray(result) || result.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) {
      throw new Error("BaiLian native audio transport returned invalid bytes");
    }
    const bytes = Uint8Array.from(result as number[]);
    return { status: 200, arrayBuffer: async () => bytes.buffer };
  };
}
