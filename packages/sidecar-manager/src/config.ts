export interface SidecarConfig {
  id: string;
  ffmpegPath: string;
  pythonServiceUrl: string;
  cosyVoiceServiceUrl: string;
  heygemServiceUrl: string;
  hasPlaywrightBrowser: boolean;
}

export function createDefaultSidecarConfig(id = "default"): SidecarConfig {
  return {
    id,
    ffmpegPath: "",
    pythonServiceUrl: "",
    cosyVoiceServiceUrl: "",
    heygemServiceUrl: "",
    hasPlaywrightBrowser: false,
  };
}

export function validateSidecarConfig(config: SidecarConfig): string[] {
  const errors: string[] = [];

  if (!config.id.trim()) {
    errors.push("配置 ID 不能为空");
  }

  return errors;
}
