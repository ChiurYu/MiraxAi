export interface ProviderConfigRecord {
  id: string;
  provider: string;
  label: string;
  baseUrl?: string;
  model?: string;
  enabled: boolean;
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

export type ProviderConfigRepository = Repository<ProviderConfigRecord>;
export type ContentDraftRepository = Repository<ContentDraftRecord>;
export type VideoProjectRepository = Repository<VideoProjectRecord>;
export type PublishAccountRepository = Repository<PublishAccountRecord>;
export type WorkflowTaskRepository = Repository<WorkflowTaskRecord>;
