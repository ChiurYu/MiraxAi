/**
 * Asset library UI model.
 *
 * This is a local UI model for the desktop asset library views. It is not a
 * second business source of truth: it mirrors the shape expected by the shared
 * library shell and detail drawer, and can be replaced by a future shared
 * contract once one is defined in `@mirax/*`.
 */

export type AssetStatus = "ready" | "processing" | "failed" | "training";

export type AssetKind = "voice" | "avatar" | "material";

export type MaterialCategory =
  | "video"
  | "image"
  | "audio"
  | "cover"
  | "bgm"
  | "reference"
  | "project";

export type AssetSource = "upload" | "record" | "system" | "local";

export interface AssetListItem {
  id: string;
  kind: AssetKind;
  name: string;
  description?: string;
  status: AssetStatus;
  statusText: string;
  statusDetail?: string;
  source: AssetSource;
  sourceLabel: string;
  language?: string;
  style?: string;
  duration?: string;
  durationSeconds?: number;
  resolution?: string;
  size?: string;
  category?: MaterialCategory;
  categoryLabel?: string;
  tags?: string[];
  version?: string;
  thumbnail?: string;
  preview?: string;
  samplePath?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, string>;
}

export type AssetSortKey = "updatedAt" | "name" | "duration";

export interface AssetFilterState {
  query: string;
  status: "all" | AssetStatus;
  category: "all" | MaterialCategory;
  sort: AssetSortKey;
}

export interface AssetCategoryGroup {
  id: MaterialCategory | "all";
  label: string;
  count: number;
}
