export interface ProviderConfigRecord {
  id: string;
  provider: string;
  label: string;
  baseUrl?: string;
  model?: string;
  enabled: boolean;
  credentialRef?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContentDraftRecord {
  id: string;
  name: string;
  sourceVideoPath?: string;
  extractedText?: string;
  rewrittenText?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VideoProjectRecord {
  id: string;
  draftId: string;
  audioPath?: string;
  avatarVideoPath?: string;
  finalVideoPath?: string;
  coverPath?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PublishAccountRecord {
  id: string;
  platformId: string;
  displayName: string;
  status: "active" | "expired" | "inactive";
  credentialRef?: string;
  updatedAt: string;
}

export interface WorkflowTaskRecord {
  id: string;
  projectId: string;
  stageId: string;
  status: string;
  payloadJson: string;
  createdAt: string;
  updatedAt: string;
}

export interface Repository<TRecord extends { id: string }> {
  getById(id: string): Promise<TRecord | undefined>;
  save(record: TRecord): Promise<void>;
  list(): Promise<TRecord[]>;
}

export interface ProviderConfigRepository extends Repository<ProviderConfigRecord> {
  deleteById(id: string): Promise<void>;
}
export type ContentDraftRepository = Repository<ContentDraftRecord>;
export type VideoProjectRepository = Repository<VideoProjectRecord>;
export type PublishAccountRepository = Repository<PublishAccountRecord>;
export type WorkflowTaskRepository = Repository<WorkflowTaskRecord>;

export interface AppSettingsRecord {
  id: string;
  theme: string;
  outputPathsJson: string;
  createdAt: string;
  updatedAt: string;
}

export interface SidecarConfigRecord {
  id: string;
  ffmpegPath?: string;
  pythonServiceUrl?: string;
  cosyVoiceServiceUrl?: string;
  heygemServiceUrl?: string;
  hasPlaywrightBrowser: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AppSettingsRepository = Repository<AppSettingsRecord>;
export type SidecarConfigRepository = Repository<SidecarConfigRecord>;

export interface PublishTaskRecord {
  id: string;
  projectId: string;
  platformId: string;
  accountId: string;
  status: string;
  videoPath: string;
  title: string;
  description: string;
  tagsJson: string;
  mode: string;
  errorCode?: string;
  errorMessage?: string;
  failedAt?: string;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
}

export type PublishTaskRepository = Repository<PublishTaskRecord>;

export interface ProviderSecretsRecord {
  credentialRef: string;
  apiKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderSecretsRepository {
  getByCredentialRef(credentialRef: string): Promise<ProviderSecretsRecord | undefined>;
  save(record: ProviderSecretsRecord): Promise<void>;
  deleteByCredentialRef(credentialRef: string): Promise<void>;
}

import type { LocalStoreDb } from "./db.js";

function nowIso(): string {
  return new Date().toISOString();
}

export function createAppSettingsRepository(db: LocalStoreDb): AppSettingsRepository {
  return {
    async getById(id: string): Promise<AppSettingsRecord | undefined> {
      const rows = await db.select<AppSettingsRecord>(
        `SELECT id, theme, output_paths_json as outputPathsJson, created_at as createdAt, updated_at as updatedAt FROM app_settings WHERE id = ?`,
        [id],
      );
      return rows[0];
    },
    async save(record: AppSettingsRecord): Promise<void> {
      const t = nowIso();
      await db.execute(
        `INSERT OR REPLACE INTO app_settings (id, theme, output_paths_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
        [record.id, record.theme, record.outputPathsJson, record.createdAt ?? t, record.updatedAt ?? t],
      );
    },
    async list(): Promise<AppSettingsRecord[]> {
      return db.select<AppSettingsRecord>(
        `SELECT id, theme, output_paths_json as outputPathsJson, created_at as createdAt, updated_at as updatedAt FROM app_settings`,
      );
    },
  };
}

export function createSidecarConfigRepository(db: LocalStoreDb): SidecarConfigRepository {
  return {
    async getById(id: string): Promise<SidecarConfigRecord | undefined> {
      const rows = await db.select<SidecarConfigRecord>(
        `SELECT id, ffmpeg_path as ffmpegPath, python_service_url as pythonServiceUrl, cosy_voice_service_url as cosyVoiceServiceUrl, heygem_service_url as heygemServiceUrl, has_playwright_browser as hasPlaywrightBrowser, created_at as createdAt, updated_at as updatedAt FROM sidecar_configs WHERE id = ?`,
        [id],
      );
      return rows[0];
    },
    async save(record: SidecarConfigRecord): Promise<void> {
      const t = nowIso();
      await db.execute(
        `INSERT OR REPLACE INTO sidecar_configs (id, ffmpeg_path, python_service_url, cosy_voice_service_url, heygem_service_url, has_playwright_browser, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          record.id,
          record.ffmpegPath ?? null,
          record.pythonServiceUrl ?? null,
          record.cosyVoiceServiceUrl ?? null,
          record.heygemServiceUrl ?? null,
          record.hasPlaywrightBrowser ? 1 : 0,
          record.createdAt ?? t,
          record.updatedAt ?? t,
        ],
      );
    },
    async list(): Promise<SidecarConfigRecord[]> {
      return db.select<SidecarConfigRecord>(
        `SELECT id, ffmpeg_path as ffmpegPath, python_service_url as pythonServiceUrl, cosy_voice_service_url as cosyVoiceServiceUrl, heygem_service_url as heygemServiceUrl, has_playwright_browser as hasPlaywrightBrowser, created_at as createdAt, updated_at as updatedAt FROM sidecar_configs`,
      );
    },
  };
}

export function createProviderConfigRepository(db: LocalStoreDb): ProviderConfigRepository {
  return {
    async getById(id: string): Promise<ProviderConfigRecord | undefined> {
      const rows = await db.select<ProviderConfigRecord>(
        `SELECT id, provider, label, base_url as baseUrl, model, enabled, credential_ref as credentialRef, created_at as createdAt, updated_at as updatedAt FROM provider_configs WHERE id = ?`,
        [id],
      );
      return rows[0];
    },
    async save(record: ProviderConfigRecord): Promise<void> {
      const t = nowIso();
      await db.execute(
        `INSERT OR REPLACE INTO provider_configs (id, provider, label, base_url, model, enabled, credential_ref, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          record.id,
          record.provider,
          record.label,
          record.baseUrl ?? null,
          record.model ?? null,
          record.enabled ? 1 : 0,
          record.credentialRef ?? record.id,
          record.createdAt ?? t,
          record.updatedAt ?? t,
        ],
      );
    },
    async list(): Promise<ProviderConfigRecord[]> {
      return db.select<ProviderConfigRecord>(
        `SELECT id, provider, label, base_url as baseUrl, model, enabled, credential_ref as credentialRef, created_at as createdAt, updated_at as updatedAt FROM provider_configs`,
      );
    },
    async deleteById(id: string): Promise<void> {
      await db.execute(`DELETE FROM provider_configs WHERE id = ?`, [id]);
    },
  };
}

export function createProviderSecretsRepository(db: LocalStoreDb): ProviderSecretsRepository {
  return {
    async getByCredentialRef(credentialRef: string): Promise<ProviderSecretsRecord | undefined> {
      const rows = await db.select<ProviderSecretsRecord>(
        `SELECT credential_ref as credentialRef, api_key as apiKey, created_at as createdAt, updated_at as updatedAt FROM provider_secrets WHERE credential_ref = ? LIMIT 1`,
        [credentialRef],
      );
      return rows[0];
    },
    async save(record: ProviderSecretsRecord): Promise<void> {
      const t = nowIso();
      await db.execute(
        `INSERT OR REPLACE INTO provider_secrets (credential_ref, api_key, created_at, updated_at) VALUES (?, ?, ?, ?)`,
        [record.credentialRef, record.apiKey, record.createdAt ?? t, record.updatedAt ?? t],
      );
    },
    async deleteByCredentialRef(credentialRef: string): Promise<void> {
      await db.execute(`DELETE FROM provider_secrets WHERE credential_ref = ?`, [credentialRef]);
    },
  };
}
