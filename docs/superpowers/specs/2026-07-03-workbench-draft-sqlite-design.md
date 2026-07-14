# Workbench 草稿 SQLite 优先迁移设计

## 目标

把 `apps/desktop/src/composables/useWorkbenchDraft.ts` 管理的单份 Workbench 草稿从 localStorage 优先迁移到 SQLite 优先，保持 localStorage fallback。

## 范围

- 只做 Workbench 当前草稿，不做多草稿、不做列表、不做切换、不做项目管理。
- 不改发布任务、账号、provider 配置相关表。
- 允许修改文件：
  - `packages/local-store/src/schema.ts`
  - `packages/local-store/src/repositories.ts`
  - `packages/local-store/tests/*`
  - `apps/desktop/src/runtime/desktopDraft.ts`
  - `apps/desktop/src/composables/useWorkbenchDraft.ts`
  - `apps/desktop/src/localStore/*`
  - `apps/desktop/src/**/*.test.ts`

## 方案

采用 **Repository + db 注入** 方案，与 `useAppSettings` 已有的 SQLite 接入模式保持一致。

### 1. 表结构

在 `packages/local-store/src/schema.ts` 新增 `workbench_drafts` 表：

```sql
CREATE TABLE IF NOT EXISTS workbench_drafts (
  id TEXT PRIMARY KEY,
  payload_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

应用层只读写固定 id `"default"`。

### 2. Repository

在 `packages/local-store/src/repositories.ts` 新增：

```typescript
export interface WorkbenchDraftRecord {
  id: string;
  payloadJson: string;
  updatedAt: string;
}

export interface WorkbenchDraftRepository {
  getById(id: string): Promise<WorkbenchDraftRecord | undefined>;
  save(record: WorkbenchDraftRecord): Promise<void>;
  deleteById(id: string): Promise<void>;
}

export function createWorkbenchDraftRepository(db: LocalStoreDb): WorkbenchDraftRepository;
```

### 3. useWorkbenchDraft 改造

- 新增 `UseWorkbenchDraftOptions.db?: LocalStoreDb`。
- 优先使用 `options.db ?? sharedDb`。
- `restore()` 流程：
  1. 若 db 可用，尝试读取 SQLite；
  2. 若 SQLite 读取失败或无记录，回退 localStorage；
  3. 若 localStorage 无记录，保持默认草稿。
- `persist()` 流程：
  1. 若 db 可用，用 `sanitizeDesktopDraftForStorage` 生成 payload 写入 SQLite；
  2. 若 db 不可用或写入失败，回退 localStorage；
  3. SQLite 失败时 `console.warn` 但不吞掉数据恢复逻辑。
- 复用现有 `sanitizeDesktopDraftForStorage` / `restoreDesktopDraft`，不重复定义 schema。
- payload 中不包含 `apiKey` / `token` / `secret` / `password`。

### 4. db 共享

参考 `useAppSettings`：

- `apps/desktop/src/composables/useWorkbenchDraft.ts` 内部维护一个模块级 `sharedDb`。
- `apps/desktop/src/localStore/init.ts` 在 `initLocalStore()` 成功后调用 `setWorkbenchDraftDb(db)` 把 db 注入。

### 5. 迁移与兼容

- 不主动迁移历史 localStorage 草稿。
- 若实现顺手，可在 SQLite 为空且 localStorage 有草稿时，读取 localStorage 并保存到 SQLite；不为此写复杂迁移逻辑。
- 浏览器 dev:web 环境无 Tauri SQL，自动回退 localStorage。

## 测试覆盖

### packages/local-store

- `createWorkbenchDraftRepository`：
  - `save` 生成正确 SQL 与 bind。
  - `getById` 映射 camelCase 字段。
  - `deleteById` 生成正确 SQL 与 bind。

### apps/desktop

- `useWorkbenchDraft`：
  - SQLite 可用时优先从 SQLite 读取/写入。
  - SQLite 不可用时回退 localStorage。
  - payload 不包含 `apiKey`。
  - 恢复后 `activeStageId` / `workflow` / `transcriptText` 正常。

## 验证命令

- `pnpm test packages/local-store/tests/repositories.test.ts`
- `pnpm test apps/desktop/src/runtime/desktopDraft.test.ts apps/desktop/src/composables/useWorkbenchDraft.test.ts`
- `pnpm --filter @mirax/desktop typecheck`
- `pnpm --filter @mirax/desktop build:web`
- `git diff --check`

## 风险

- `workbench_drafts` 与已有 `content_drafts` 表并存，职责不重叠，无冲突。
- 浏览器环境无 Tauri SQL，已有 fallback 路径保证可用性。
- 单草稿固定 id 设计，未来若扩展多草稿需重新评估主键与查询方式。
