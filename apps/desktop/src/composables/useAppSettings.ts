import { reactive, ref, watch } from "vue";
import {
  createApiKeyProviderConfig,
  createDefaultAppSettings,
  type ApiKeyProviderConfig,
  type AppSettings,
} from "@mirax/core";
import { createDefaultSidecarConfig, type SidecarConfig } from "@mirax/sidecar-manager";

export const APP_SETTINGS_STORAGE_KEY = "mirax-ai.app-settings.v1";

export interface AppSettingsSnapshot {
  appSettings?: Partial<AppSettings>;
  sidecarConfig?: Partial<SidecarConfig>;
  providerConfigs?: Array<Omit<ApiKeyProviderConfig, "apiKey"> & { apiKey?: string }>;
}

export interface UseAppSettingsOptions {
  storage?: Storage;
}

export function useAppSettings(options: UseAppSettingsOptions = {}) {
  const storage = options.storage ?? (typeof window !== "undefined" ? window.localStorage : undefined);

  const appSettings = reactive<AppSettings>(createDefaultAppSettings());
  const sidecarConfig = reactive<SidecarConfig>(createDefaultSidecarConfig());
  const providerConfigs = ref<ApiKeyProviderConfig[]>([]);
  const saveStatus = ref("未保存");

  load();

  function createSnapshot(): AppSettingsSnapshot {
    return {
      appSettings: { ...appSettings },
      sidecarConfig: { ...sidecarConfig },
      providerConfigs: providerConfigs.value.map((config) => ({
        id: config.id,
        label: config.label,
        provider: config.provider,
        baseUrl: config.baseUrl,
        model: config.model,
        enabled: config.enabled,
      })),
    };
  }

  function restore(snapshot: Partial<AppSettingsSnapshot>) {
    if (snapshot.appSettings) {
      Object.assign(appSettings, {
        ...createDefaultAppSettings(),
        ...snapshot.appSettings,
        outputPaths: {
          ...createDefaultAppSettings().outputPaths,
          ...(snapshot.appSettings.outputPaths ?? {}),
        },
      });
    }

    if (snapshot.sidecarConfig) {
      Object.assign(sidecarConfig, {
        ...createDefaultSidecarConfig(),
        ...snapshot.sidecarConfig,
      });
    }

    if (Array.isArray(snapshot.providerConfigs)) {
      providerConfigs.value = snapshot.providerConfigs.map((config) =>
        createApiKeyProviderConfig({
          id: config.id ?? crypto.randomUUID(),
          label: config.label ?? "未命名配置",
          provider: config.provider ?? "openai",
          apiKey: config.apiKey ?? "",
          baseUrl: config.baseUrl,
          model: config.model,
          enabled: config.enabled ?? true,
        }),
      );
    }
  }

  function load() {
    if (!storage) {
      saveStatus.value = "无可用存储";
      return;
    }

    try {
      const raw = storage.getItem(APP_SETTINGS_STORAGE_KEY);
      if (raw) {
        restore(JSON.parse(raw) as Partial<AppSettingsSnapshot>);
      }
      saveStatus.value = "已恢复设置";
    } catch {
      saveStatus.value = "设置读取失败";
    }
  }

  function persist() {
    if (!storage) {
      saveStatus.value = "无可用存储";
      return;
    }

    try {
      storage.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify(createSnapshot()));
      saveStatus.value = "设置已保存";
    } catch {
      saveStatus.value = "设置保存失败";
    }
  }

  function addProviderConfig(config: ApiKeyProviderConfig) {
    providerConfigs.value.push(config);
  }

  function updateProviderConfig(config: ApiKeyProviderConfig) {
    const index = providerConfigs.value.findIndex((item) => item.id === config.id);
    if (index >= 0) {
      providerConfigs.value[index] = config;
    }
  }

  function removeProviderConfig(id: string) {
    providerConfigs.value = providerConfigs.value.filter((config) => config.id !== id);
  }

  watch([() => ({ ...appSettings }), () => ({ ...sidecarConfig }), providerConfigs], persist, { deep: true });

  return {
    appSettings,
    sidecarConfig,
    providerConfigs,
    saveStatus,
    load,
    persist,
    restore,
    addProviderConfig,
    updateProviderConfig,
    removeProviderConfig,
  };
}
